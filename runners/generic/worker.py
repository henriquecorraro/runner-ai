"""Async worker: spawns one agent process per task using workspace agent config."""
from __future__ import annotations

import asyncio
import fcntl
import json
import os
import re
import signal
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import AgentConfig, CodexOptions, WorkspaceConfig, Repository, TaskDef, TaskRun, TaskStatus
from .board import move_task_card
from .context_cache import assemble_context, cache_policy, record_run_usage
from .token_usage import estimate_file_tokens, estimate_tokens
from .routing import task_routing_policy
from .codex import (
    CodexTelemetry,
    build_codex_command,
    codex_is_ephemeral,
    consume_event,
    find_resumable_thread,
    render_structured_outputs,
    resolve_codex_selection,
    task_spec_hash,
    write_output_schema,
)

RUNNER_ROOT = Path(__file__).resolve().parents[2]

def _slugify(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _repo_by_id(eco: WorkspaceConfig) -> dict[str, Repository]:
    return {r.id: r for r in eco.repositories}


COMPACT_POLICY = """Policy compact-v1:
- Keep centralized SDD and output artifacts in English.
- Execute only the selected task; preserve unrelated changes.
- Read repository-local instructions before editing.
- Validate the narrowest useful scope.
- Never mark the task done; success means implemented/testing."""


def _load_context_snapshot(task: TaskDef, eco: WorkspaceConfig):
    """Assemble relevant cached context within the workspace token budget."""
    return assemble_context(task, eco, eco.token_policy.context_budget_tokens)


def build_prompt_with_usage(task: TaskDef, eco: WorkspaceConfig, output_file: str) -> tuple[str, dict]:
    """Build one compact prompt and return deterministic input telemetry."""
    repos = _repo_by_id(eco)
    context = _load_context_snapshot(task, eco)

    repo_sections = []
    for repo_id in task.repositories:
        repo = repos[repo_id]
        guidance = []
        if repo.docs_hints:
            guidance.append(f"- Docs hints: {'; '.join(repo.docs_hints)}")
        if repo.validation:
            guidance.append(f"- Default validation: {' ; '.join(repo.validation)}")
        if not guidance:
            guidance.append("- Follow the repository local docs and validation scripts.")

        section = f"""## {repo.id}
Label: {repo.label}
Root: {repo.root}
{chr(10).join(guidance)}"""
        repo_sections.append(section)

    context_block = ""
    if context.content:
        context_block = f"""Budgeted execution context ({context.included_tokens}/{context.source_tokens} estimated tokens; fingerprint {context.fingerprint[:12]}):

{context.content}

---
"""

    prompt = f"""Execute one centralized workspace task.

Workspace: {eco.name}
Task: {task.id}
Title: {task.title}
Status: {task.status}
{f"Scope: {task.scope}" if task.scope else ""}
{f"Validation: {' ; '.join(task.validation)}" if task.validation else ""}

{COMPACT_POLICY}
Read only the applicable repository instructions and, when needed, {RUNNER_ROOT}/skills/workspace-task-executor/SKILL.md.

{context_block}Execution goals:
- Implement the specification completely.
- Write the mandatory output contract.

Repositories:

{chr(10).join(repo_sections)}

Task specification (single authoritative copy):

```md
{task.body}
```

Mandatory output file:
{output_file}

Before finishing, create that output file with this Markdown contract:

# Workspace AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-workspace
- Task: {task.id}
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

Keep it short and operational. Read it back before ending."""
    policy = cache_policy(eco.config_dir, COMPACT_POLICY)
    return prompt, {
        "estimated": True,
        "inputTokens": estimate_tokens(prompt),
        "deduplicatedTaskTokens": estimate_tokens(task.body) * max(0, len(task.repositories) - 1),
        "contextSourceTokens": context.source_tokens,
        "contextTokens": context.included_tokens,
        "cachedTokens": max(0, context.source_tokens - context.included_tokens),
        "cacheHits": context.cache_hits,
        "cacheMisses": context.cache_misses,
        "contextFingerprint": context.fingerprint,
        "contextUnitIds": context.unit_ids,
        "contextTruncated": context.truncated,
        "policyVersion": policy["policyVersion"],
    }


def build_prompt(task: TaskDef, eco: WorkspaceConfig, output_file: str) -> str:
    """Compatibility wrapper returning only the prompt."""
    return build_prompt_with_usage(task, eco, output_file)[0]


def create_stage_dir(eco: WorkspaceConfig, run_id: str, task: TaskDef, batch_index: int) -> str:
    """Create and return the stage directory path for this task."""
    stage_name = f"{str(batch_index + 1).zfill(2)}-{_slugify(task.id)}"
    stage_dir = os.path.join(eco.history_root, run_id, stage_name)
    os.makedirs(os.path.join(stage_dir, "tasks"), exist_ok=True)
    shutil.copy2(task.file_path, os.path.join(stage_dir, "tasks", task.file_name))
    # Also copy context snapshot if exists
    context_path = Path(task.file_path).with_suffix(".context.md")
    if context_path.exists():
        shutil.copy2(context_path, os.path.join(stage_dir, "tasks", context_path.name))
    return stage_dir


def _write_json(path: str, data: dict):
    tmp = path + ".tmp"
    Path(tmp).write_text(json.dumps(data, indent=2, default=str) + "\n")
    os.rename(tmp, path)


def _format_frontmatter_scalar(value) -> str:
    string_value = str(value)
    if re.fullmatch(r"[A-Za-z0-9_.:/ -]+", string_value):
        return string_value
    return json.dumps(string_value)


def _update_task_frontmatter(task: TaskDef, updates: dict[str, Optional[str]]) -> None:
    content = Path(task.file_path).read_text()
    match = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", content)
    if not match:
        raise ValueError(f"Task file must start with YAML frontmatter: {task.file_path}")
    lines = match.group(1).splitlines()
    for key, value in updates.items():
        line_index = next((index for index, line in enumerate(lines) if re.match(rf"^{re.escape(key)}:\s*", line)), None)
        if value is None:
            if line_index is not None:
                lines.pop(line_index)
            continue
        rendered = f"{key}: {_format_frontmatter_scalar(value)}"
        if line_index is None:
            lines.append(rendered)
        else:
            lines[line_index] = rendered
    updated = f"---\n{chr(10).join(lines)}\n---\n\n{match.group(2).strip()}\n"
    tmp_path = f"{task.file_path}.tmp.{os.getpid()}.{task.id}"
    try:
        Path(tmp_path).write_text(updated)
        os.replace(tmp_path, task.file_path)
    finally:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass


def _update_sdd_readme(eco: WorkspaceConfig, task: TaskDef, status: str) -> None:
    readme_path = Path(eco.sdd_root) / "README.md"
    if not readme_path.is_file():
        return
    history_root = Path(eco.history_root)
    history_root.mkdir(parents=True, exist_ok=True)
    lock_path = history_root / ".task-status.lock"
    with lock_path.open("a+") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        content = readme_path.read_text()
        pattern = re.compile(rf"((?:-|\d+\.)\s+`)(?:open|implemented|needs-rework|done)(`\s+`{re.escape(task.id)}`)")
        updated, count = pattern.subn(rf"\g<1>{status}\g<2>", content, count=1)
        if count:
            tmp_path = f"{readme_path}.tmp.{os.getpid()}.{task.id}"
            try:
                Path(tmp_path).write_text(updated)
                os.replace(tmp_path, readme_path)
            finally:
                try:
                    os.unlink(tmp_path)
                except FileNotFoundError:
                    pass


def _record_task_lifecycle(eco: WorkspaceConfig, task: TaskDef, status: str, execution_state: Optional[str], run_id: str,
                           board_status: Optional[str] = None, finished: bool = False) -> None:
    now = datetime.now(timezone.utc).isoformat()
    updates = {"status": status, "execution_state": execution_state, "execution_run_id": run_id}
    if execution_state == "in-progress":
        updates["execution_started_at"] = now
        updates["execution_finished_at"] = None
    if finished:
        updates["execution_finished_at"] = now
    if board_status:
        updates["github_project_status"] = board_status
    _update_task_frontmatter(task, updates)
    if status != task.status:
        _update_sdd_readme(eco, task, status)


def _build_metadata(eco: WorkspaceConfig, agent: AgentConfig, run_id: str, task: TaskDef, stage_dir: str,
                    status: str, started_at=None, finished_at=None, exit_code=None, failure=None):
    return {
        "workspace": eco.name,
        "agent": {"name": agent.name, "type": agent.type or agent.name, "command": agent.command},
        "runId": run_id,
        "status": status,
        "mode": "centralized-workspace",
        "batch": {"id": task.id, "label": task.title},
        "tasks": [{"id": task.id, "title": task.title, "scope": task.scope, "repositories": task.repositories, "file": task.file_path}],
        "startedAt": started_at,
        "finishedAt": finished_at,
        "exitCode": exit_code,
        "failureReason": failure,
        "files": {
            "prompt": os.path.join(stage_dir, "prompt.md"),
            "output": os.path.join(stage_dir, "output.md"),
            "log": os.path.join(stage_dir, "agent.log"),
            "summary": os.path.join(stage_dir, "summary.json"),
            "tasks": os.path.join(stage_dir, "tasks"),
        },
    }


def build_agent_command(
    agent: AgentConfig, prompt_instruction: str, prompt_tokens: Optional[int] = None,
    selected_model: Optional[str] = None,
) -> tuple[str, list[str]]:
    """Build the command and args to spawn the agent.

    Convention: the prompt is always the last positional argument after the configured args.
    If the agent has a model configured, inject --model before the prompt.
    Agent commands are defined by the workspace; supported built-in examples
    accept this convention.
    """
    args = list(agent.args)
    resolved_model = selected_model or (agent.resolve_model(prompt_tokens) if prompt_tokens is not None else agent.model)
    if resolved_model:
        args.extend(["--model", resolved_model])
    args.append(prompt_instruction)
    return agent.command, args


def build_agent_env(agent: AgentConfig) -> dict[str, str]:
    """Build environment variables for the agent process."""
    env = {**os.environ}
    if agent.env:
        env.update(agent.env)
    return env


def _allow_pinned_model_fallback(task_runs: list[TaskRun]) -> bool:
    return any(item.routing.get("agentSource") == "forced-cli" for item in task_runs)


def _resolve_generic_model(
    tasks: list[TaskDef], agent: AgentConfig, prompt_tokens: int,
    allow_pinned_fallback: bool = False,
) -> tuple[Optional[str], str, Optional[str], Optional[str]]:
    requested = {
        task.preferred_model for task in tasks
        if task.preferred_model and task_routing_policy(task) != "portable"
    }
    reasoning = {
        task.reasoning_effort for task in tasks
        if task.reasoning_effort and task_routing_policy(task) != "portable"
    }
    if len(requested) > 1:
        raise ValueError("A generic-agent batch cannot contain conflicting preferred_model values.")
    if len(reasoning) > 1:
        raise ValueError("A generic-agent batch cannot contain conflicting reasoning_effort values.")
    requested_model = next(iter(requested), None)
    requested_reasoning = next(iter(reasoning), None) or agent.reasoning_effort
    if requested_model and agent.supports_model(requested_model):
        return requested_model, "task", None, requested_reasoning
    if requested_model:
        pinned = any(task_routing_policy(task) == "pinned" for task in tasks)
        if pinned and not allow_pinned_fallback:
            configured = ", ".join(sorted(agent.configured_models)) or "none"
            raise ValueError(
                f"Pinned model '{requested_model}' is not configured for agent '{agent.name}'. "
                f"Configured models: {configured}."
            )
        fallback = agent.resolve_model(prompt_tokens)
        return fallback, "task-fallback", f"Requested model '{requested_model}' is not configured for agent '{agent.name}'.", requested_reasoning
    return agent.resolve_model(prompt_tokens), "agent", None, requested_reasoning


def validate_output_contract(output_file: str, task: TaskDef) -> tuple[TaskStatus, Optional[str]]:
    """Validate the mandatory output before a run can be reported as successful."""
    output_path = Path(output_file)
    if not output_path.is_file() or not output_path.read_text().strip():
        return TaskStatus.FAILED, "Mandatory output file was not produced."

    fields: dict[str, str] = {}
    for line in output_path.read_text().splitlines():
        match = re.match(r"^- ([A-Za-z ]+):\s*(.*)$", line.strip())
        if match:
            fields[match.group(1).strip().lower()] = match.group(2).strip()

    required = {"status", "mode", "task", "repositories", "result", "validation", "docs updated", "gaps", "needs rework", "notes"}
    missing = sorted(required - fields.keys())
    if missing:
        return TaskStatus.FAILED, f"Mandatory output is missing fields: {', '.join(missing)}."
    if fields["mode"] != "centralized-workspace":
        return TaskStatus.FAILED, "Mandatory output has an invalid Mode."
    if fields["task"] != task.id:
        return TaskStatus.FAILED, f"Mandatory output Task '{fields['task']}' does not match '{task.id}'."

    status = fields["status"].lower()
    if status == "success":
        if not fields["result"] or not fields["validation"]:
            return TaskStatus.FAILED, "Successful output must include Result and Validation."
        return TaskStatus.SUCCESS, None
    if status == "blocked":
        return TaskStatus.BLOCKED, fields["gaps"] or fields["notes"] or "Agent reported blocked."
    if status == "failed":
        return TaskStatus.FAILED, fields["gaps"] or fields["notes"] or "Agent reported failure."
    return TaskStatus.FAILED, f"Mandatory output Status '{fields['status']}' is invalid."


async def _stream_process(proc, log_file, task_run: TaskRun) -> int:
    assert proc.stdout
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        decoded = line.decode("utf-8", errors="replace")
        log_file.write(decoded)
        log_file.flush()
        task_run.last_lines = (task_run.last_lines + [decoded.rstrip()])[-5:]
    await proc.wait()
    return proc.returncode or 0


async def _terminate_process_group(proc) -> None:
    if proc.returncode is not None:
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        await asyncio.wait_for(proc.wait(), timeout=5)
    except asyncio.TimeoutError:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        await proc.wait()


def _finalize_task(
    task_run: TaskRun,
    eco: WorkspaceConfig,
    agent: AgentConfig,
    run_id: str,
    stage_dir: str,
    output_file: str,
    log_path: str,
    started_at: str,
    exit_code: int,
    usage: dict,
    selected_model: Optional[str],
    codex_info: Optional[dict] = None,
) -> None:
    task = task_run.task
    finished_at = datetime.now(timezone.utc).isoformat()
    task_run.finished_at = datetime.now(timezone.utc)
    task_run.exit_code = exit_code

    output_status, output_error = validate_output_contract(output_file, task)
    if exit_code != 0:
        task_run.status = TaskStatus.FAILED
        failure = task_run.error or f"Agent failed for task \"{task.id}\" with exit code {exit_code}."
    else:
        task_run.status = output_status
        failure = output_error

    if task_run.status == TaskStatus.SUCCESS:
        try:
            board_testing = move_task_card(eco, task, "testing")
            _record_task_lifecycle(
                eco, task, "implemented", "testing", run_id,
                board_status="Testing" if board_testing else None,
                finished=True,
            )
        except Exception as error:
            task_run.status = TaskStatus.FAILED
            failure = f"Agent succeeded, but board synchronization failed: {error}"

    if task_run.status != TaskStatus.SUCCESS:
        cleanup_errors = []
        board_todo = False
        try:
            board_todo = move_task_card(eco, task, "todo")
        except Exception as error:
            cleanup_errors.append(f"board recovery failed: {error}")
        try:
            _record_task_lifecycle(
                eco, task, "needs-rework", None, run_id,
                board_status="Todo" if board_todo else None,
                finished=True,
            )
        except Exception as error:
            cleanup_errors.append(f"local lifecycle recovery failed: {error}")
        if cleanup_errors:
            failure = f"{failure or 'Task failed'}. {'; '.join(cleanup_errors)}"

    status_str = task_run.status.value
    if task_run.status == TaskStatus.FAILED and os.path.exists(output_file) and Path(output_file).read_text().strip():
        output_content = Path(output_file).read_text()
        output_content, replacements = re.subn(r"^- Status:\s*.+$", "- Status: failed", output_content, count=1, flags=re.MULTILINE)
        if replacements:
            output_content = output_content.rstrip() + f"\n- Runner Failure: {failure or 'deterministic runner validation failed'}\n"
            Path(output_file).write_text(output_content)

    if not os.path.exists(output_file) or not Path(output_file).read_text().strip():
        Path(output_file).write_text(f"""# Workspace AI Runner Output

- Status: failed
- Mode: centralized-workspace
- Task: {task.id}
- Repositories: {', '.join(task.repositories)}
- Result: Runner generated this fallback because the task did not produce a valid mandatory output file.
- Validation: not determined
- Docs Updated: none
- Gaps: output file was not produced correctly
- Needs Rework: yes
- Notes: {failure or 'unknown error'}; inspect stage log: {log_path}
""")

    artifact_output_tokens = estimate_file_tokens(output_file)
    usage["artifactOutputTokens"] = artifact_output_tokens
    if usage.get("estimated", True):
        usage["outputTokens"] = artifact_output_tokens
    raw_log_tokens = estimate_file_tokens(log_path)
    usage["batchLogTokens"] = raw_log_tokens if usage.get("batchShared") else 0
    usage["logTokens"] = (
        (raw_log_tokens + usage["batchSize"] - 1) // usage["batchSize"]
        if usage.get("batchShared") else raw_log_tokens
    )
    if usage.get("estimated", True):
        usage["totalEstimatedTokens"] = usage["inputTokens"] + usage["outputTokens"] + usage["logTokens"]
    else:
        usage["totalTokens"] = usage["inputTokens"] + usage["outputTokens"]
    record_run_usage(eco.config_dir, run_id, task.id, usage)
    final_metadata = _build_metadata(
        eco, agent, run_id, task, stage_dir, status_str,
        started_at=started_at, finished_at=finished_at, exit_code=exit_code, failure=failure,
    )
    final_metadata["usage"] = usage
    final_metadata["agent"]["model"] = selected_model
    final_metadata["routing"] = task_run.routing
    if codex_info:
        final_metadata["codex"] = codex_info
    _write_json(os.path.join(stage_dir, "metadata.json"), final_metadata)

    duration_ms = int((task_run.finished_at - task_run.started_at).total_seconds() * 1000)
    summary = {
        "workspaceRunId": run_id,
        "mode": "centralized-workspace",
        "agent": {"name": agent.name, "type": agent.type or agent.name, "command": agent.command, "model": selected_model},
        "batch": {"id": task.id, "label": task.title},
        "tasks": [{"id": task.id, "scope": task.scope, "repositories": task.repositories, "file": task.file_name}],
        "status": status_str,
        "exitCode": exit_code,
        "durationMs": duration_ms,
        "failureReason": failure,
        "routing": task_run.routing,
        "usage": usage,
        "files": {"output": output_file, "log": log_path, "metadata": os.path.join(stage_dir, "metadata.json")},
    }
    if codex_info:
        summary["codex"] = codex_info
    _write_json(os.path.join(stage_dir, "summary.json"), summary)


def _structured_codex_prompt(prompt: str, batched: bool = False) -> str:
    """Remove file-writing instructions; the adapter materializes Markdown from JSON."""
    if batched:
        prompt = re.sub(r"^Output: .+$", "", prompt, flags=re.MULTILINE)
        prompt = re.sub(r"\nFor every Output path,[\s\S]*$", "", prompt)
    else:
        prompt = re.sub(r"\nMandatory output file:[\s\S]*$", "", prompt)
        prompt = prompt.replace("- Write the mandatory output contract.\n", "")
    return prompt.rstrip() + "\n\nReturn a concise final response matching the provided JSON schema. Do not create runner output artifacts; the adapter creates them from your response.\n"


async def _stream_codex_process(proc, raw_file, log_file, task_run: TaskRun, telemetry: CodexTelemetry) -> int:
    assert proc.stdout
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        decoded = line.decode("utf-8", errors="replace")
        raw_file.write(decoded)
        raw_file.flush()
        event = consume_event(decoded, telemetry)
        if event is None:
            rendered = decoded.rstrip()
        else:
            event_type = event.get("type", "event")
            if event_type == "item.completed":
                item = event.get("item") or {}
                rendered = f"[{event_type}] {item.get('type', 'item')}"
            elif event_type in {"thread.started", "turn.completed", "turn.failed"}:
                rendered = f"[{event_type}]"
            else:
                rendered = ""
        if rendered:
            log_file.write(rendered + "\n")
            log_file.flush()
            task_run.last_lines = (task_run.last_lines + [rendered])[-5:]
    await proc.wait()
    return proc.returncode or 0


async def _run_codex(
    task_runs: list[TaskRun], eco: WorkspaceConfig, agent: AgentConfig, run_id: str,
    stages: list[str], prompt: str, usages: list[dict], cwd: str,
) -> tuple[int, str, dict, list[dict]]:
    task_ids = [task_run.task.id for task_run in task_runs]
    schema_path = os.path.join(stages[0], "codex-output-schema.json")
    response_path = os.path.join(stages[0], "codex-response.json")
    raw_events_path = os.path.join(stages[0], "codex-events.jsonl")
    log_path = os.path.join(stages[0], "agent.log")
    write_output_schema(schema_path, task_ids)
    selection = resolve_codex_selection(
        [item.task for item in task_runs], agent, estimate_tokens(prompt),
        _allow_pinned_model_fallback(task_runs),
    )
    options = agent.codex or CodexOptions()
    resume_thread = None
    if len(task_runs) == 1 and options and options.resume_on_needs_rework and not codex_is_ephemeral(agent):
        resume_thread = find_resumable_thread(eco.history_root, task_runs[0].task, selection, run_id)
    effective_prompt = _structured_codex_prompt(prompt, batched=len(task_runs) > 1)
    if resume_thread:
        effective_prompt = (
            f"Retry unchanged workspace task {task_ids[0]}. Inspect the current working tree and the previous turn's gaps, "
            "finish the implementation and validation, then return the required structured result.\n"
        )
    Path(os.path.join(stages[0], "codex-prompt.md")).write_text(effective_prompt)
    repositories = _repo_by_id(eco)
    additional_dirs = sorted({
        repositories[repo_id].root
        for task_run in task_runs
        for repo_id in task_run.task.repositories
        if repo_id in repositories and repositories[repo_id].root != cwd
    })
    command, args = build_codex_command(
        agent, selection, cwd, schema_path, response_path, resume_thread, additional_dirs,
    )
    telemetry = CodexTelemetry(thread_id=resume_thread)
    env = build_agent_env(agent)
    log_file = open(log_path, "w")
    raw_file = open(raw_events_path, "w")
    try:
        proc = await asyncio.create_subprocess_exec(
            command, *args, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT, cwd=cwd, env=env, start_new_session=True,
        )
        for task_run in task_runs:
            task_run.pid = proc.pid
        assert proc.stdin
        proc.stdin.write(effective_prompt.encode())
        await proc.stdin.drain()
        proc.stdin.close()
        try:
            exit_code = await asyncio.wait_for(
                _stream_codex_process(proc, raw_file, log_file, task_runs[0], telemetry),
                timeout=agent.timeout_seconds,
            )
        except asyncio.TimeoutError:
            await _terminate_process_group(proc)
            exit_code = -1
            for task_run in task_runs:
                task_run.error = f"Agent timed out after {agent.timeout_seconds} seconds."
        if exit_code == 0:
            render_structured_outputs(response_path, {
                task_run.task.id: os.path.join(stage, "output.md")
                for task_run, stage in zip(task_runs, stages)
            })
    except Exception as error:
        exit_code = -1
        for task_run in task_runs:
            task_run.error = str(error)
        log_file.write(f"[runner error] {error}\n")
    finally:
        raw_file.close()
        log_file.close()

    count = len(task_runs)
    actual = telemetry.as_usage()
    for usage in usages:
        usage.update({
            "estimated": False,
            "inputTokens": (actual["inputTokens"] + count - 1) // count,
            "cachedInputTokens": (actual["cachedInputTokens"] + count - 1) // count,
            "outputTokens": (actual["outputTokens"] + count - 1) // count,
            "reasoningOutputTokens": (actual["reasoningOutputTokens"] + count - 1) // count,
        })
        if count > 1:
            usage.update({
                "batchActualInputTokens": actual["inputTokens"],
                "batchActualCachedInputTokens": actual["cachedInputTokens"],
                "batchActualOutputTokens": actual["outputTokens"],
                "batchActualReasoningOutputTokens": actual["reasoningOutputTokens"],
            })
    codex_info = {
        "profile": selection.profile,
        "routingSource": selection.source,
        "reasoningEffort": selection.reasoning_effort,
        "threadId": telemetry.thread_id,
        "resumed": bool(resume_thread),
        "modelFallbackReason": selection.fallback_reason,
    }
    for task_run in task_runs:
        task_run.routing.update({
            "selectedModel": selection.model,
            "modelSource": selection.source,
            "modelFallbackReason": selection.fallback_reason,
            "reasoningEffort": selection.reasoning_effort,
            "executionProfile": selection.profile,
        })
    return exit_code, selection.model, codex_info, usages


async def run_task(task_run: TaskRun, eco: WorkspaceConfig, agent: AgentConfig, run_id: str, batch_index: int) -> None:
    """Execute a single task by spawning the configured agent."""
    task = task_run.task
    stage_dir = create_stage_dir(eco, run_id, task, batch_index)
    task_run.stage_dir = stage_dir

    output_file = os.path.join(stage_dir, "output.md")
    prompt, usage = build_prompt_with_usage(task, eco, output_file)

    # Write prompt
    Path(os.path.join(stage_dir, "prompt.md")).write_text(prompt + "\n")

    # Determine cwd (first repo root)
    repos = _repo_by_id(eco)
    cwd = repos[task.repositories[0]].root if task.repositories else eco.config_dir

    # Build agent command from workspace config
    prompt_instruction = f"Read and execute the complete Workspace AI Runner prompt from {os.path.join(stage_dir, 'prompt.md')}. Follow it exactly, including writing the mandatory output file."
    allow_model_fallback = _allow_pinned_model_fallback([task_run])
    if agent.is_codex:
        selection = resolve_codex_selection([task], agent, usage["inputTokens"], allow_model_fallback)
        selected_model = selection.model
        task_run.routing.update({
            "selectedModel": selection.model,
            "modelSource": selection.source,
            "modelFallbackReason": selection.fallback_reason,
            "reasoningEffort": selection.reasoning_effort,
            "executionProfile": selection.profile,
        })
    else:
        selected_model, model_source, model_fallback, reasoning = _resolve_generic_model(
            [task], agent, usage["inputTokens"], allow_model_fallback,
        )
        task_run.routing.update({
            "selectedModel": selected_model,
            "modelSource": model_source,
            "modelFallbackReason": model_fallback,
            "reasoningEffort": reasoning,
        })
    command, args = build_agent_command(
        agent, prompt_instruction, usage["inputTokens"], selected_model,
    )
    env = build_agent_env(agent)

    # Write initial metadata
    started_at = datetime.now(timezone.utc).isoformat()
    task_run.started_at = datetime.now(timezone.utc)
    task_run.status = TaskStatus.RUNNING
    initial_metadata = _build_metadata(eco, agent, run_id, task, stage_dir, "running", started_at=started_at)
    initial_metadata["usage"] = usage
    initial_metadata["agent"]["model"] = selected_model
    initial_metadata["routing"] = task_run.routing
    _write_json(os.path.join(stage_dir, "metadata.json"), initial_metadata)

    if agent.is_codex:
        try:
            board_started = move_task_card(eco, task, "in-progress")
            _record_task_lifecycle(
                eco, task, task.status, "in-progress", run_id,
                board_status="In Progress" if board_started else None,
            )
            exit_code, selected_model, codex_info, usages = await _run_codex(
                [task_run], eco, agent, run_id, [stage_dir], prompt, [usage], cwd,
            )
            usage = usages[0]
        except Exception as error:
            exit_code = -1
            task_run.error = str(error)
            codex_info = None
            Path(os.path.join(stage_dir, "agent.log")).write_text(f"[runner error] {error}\n")
        if codex_info:
            selection = resolve_codex_selection([task], agent, estimate_tokens(prompt), allow_model_fallback)
            codex_info = {**codex_info, "taskSpecHash": task_spec_hash(task, selection)}
        _finalize_task(
            task_run, eco, agent, run_id, stage_dir, output_file, os.path.join(stage_dir, "agent.log"),
            started_at, exit_code, usage, selected_model, codex_info,
        )
        return

    # Spawn process
    log_path = os.path.join(stage_dir, "agent.log")
    log_file = open(log_path, "w")

    try:
        board_started = move_task_card(eco, task, "in-progress")
        _record_task_lifecycle(
            eco, task, task.status, "in-progress", run_id,
            board_status="In Progress" if board_started else None,
        )
        proc = await asyncio.create_subprocess_exec(
            command, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=cwd,
            env=env,
            start_new_session=True,
        )
        task_run.pid = proc.pid
        try:
            exit_code = await asyncio.wait_for(
                _stream_process(proc, log_file, task_run),
                timeout=agent.timeout_seconds,
            )
        except asyncio.TimeoutError:
            await _terminate_process_group(proc)
            exit_code = -1
            task_run.error = f"Agent timed out after {agent.timeout_seconds} seconds."
            log_file.write(f"\n[runner error] {task_run.error}\n")
    except Exception as e:
        exit_code = -1
        task_run.error = str(e)
        log_file.write(f"\n[runner error] {e}\n")
    finally:
        log_file.close()

    _finalize_task(
        task_run, eco, agent, run_id, stage_dir, output_file, log_path,
        started_at, exit_code, usage, selected_model,
    )


def build_batch_prompt(task_runs: list[TaskRun], eco: WorkspaceConfig, output_files: list[str]) -> tuple[str, list[dict]]:
    """Build one agent prompt for related tasks without repeating repository policy."""
    repos = _repo_by_id(eco)
    first = task_runs[0].task
    repository_sections = []
    for repo_id in first.repositories:
        repo = repos[repo_id]
        guidance = []
        if repo.docs_hints:
            guidance.append(f"Docs: {'; '.join(repo.docs_hints)}")
        if repo.validation:
            guidance.append(f"Validation: {'; '.join(repo.validation)}")
        repository_sections.append(f"- {repo.id}: {repo.root}" + (f" ({' | '.join(guidance)})" if guidance else ""))

    packets = []
    usages = []
    for task_run, output_file in zip(task_runs, output_files):
        task = task_run.task
        context = _load_context_snapshot(task, eco)
        context_block = f"\nBudgeted context:\n{context.content}\n" if context.content else ""
        packets.append(f"""## Task {task.id}
Title: {task.title}
{f"Scope: {task.scope}" if task.scope else ""}
{f"Validation: {'; '.join(task.validation)}" if task.validation else ""}
{context_block}
Specification:
```md
{task.body}
```
Output: {output_file}""")
        usages.append({
            "estimated": True,
            "contextSourceTokens": context.source_tokens,
            "contextTokens": context.included_tokens,
            "cachedTokens": max(0, context.source_tokens - context.included_tokens),
            "cacheHits": context.cache_hits,
            "cacheMisses": context.cache_misses,
            "contextFingerprint": context.fingerprint,
            "contextUnitIds": context.unit_ids,
            "contextTruncated": context.truncated,
            "policyVersion": "compact-v1",
            "batchShared": True,
            "batchSize": len(task_runs),
        })

    prompt = f"""Execute {len(task_runs)} related centralized workspace tasks in one session.

Workspace: {eco.name}
{COMPACT_POLICY}
Complete tasks in the listed order. Keep each task's changes and output independently auditable.

Repositories (shared):
{chr(10).join(repository_sections)}

{chr(10).join(packets)}

For every Output path, write this contract with the matching task id:
# Workspace AI Runner Output
- Status: success | blocked | failed
- Mode: centralized-workspace
- Task:
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

Keep outputs short. Read every output back before ending."""
    total_input = estimate_tokens(prompt)
    allocated_input = (total_input + len(usages) - 1) // len(usages)
    for usage in usages:
        usage["inputTokens"] = allocated_input
        usage["batchInputTokens"] = total_input
    cache_policy(eco.config_dir, COMPACT_POLICY)
    return prompt, usages


async def run_task_batch(
    task_runs: list[TaskRun],
    eco: WorkspaceConfig,
    agent: AgentConfig,
    run_id: str,
    batch_indexes: list[int],
) -> None:
    """Execute related tasks in one agent session and preserve per-task contracts."""
    if len(task_runs) < 2:
        await run_task(task_runs[0], eco, agent, run_id, batch_indexes[0])
        return
    stages = [create_stage_dir(eco, run_id, task_run.task, index) for task_run, index in zip(task_runs, batch_indexes)]
    for task_run, stage_dir in zip(task_runs, stages):
        task_run.stage_dir = stage_dir
    output_files = [os.path.join(stage, "output.md") for stage in stages]
    log_paths = [os.path.join(stage, "agent.log") for stage in stages]
    prompt, usages = build_batch_prompt(task_runs, eco, output_files)
    prompt_path = os.path.join(stages[0], "batch-prompt.md")
    Path(prompt_path).write_text(prompt + "\n")
    for stage in stages[1:]:
        Path(os.path.join(stage, "batch-prompt.link")).write_text(prompt_path + "\n")

    total_input_tokens = estimate_tokens(prompt)
    allow_model_fallback = _allow_pinned_model_fallback(task_runs)
    if agent.is_codex:
        selection = resolve_codex_selection(
            [item.task for item in task_runs], agent, total_input_tokens, allow_model_fallback,
        )
        selected_model = selection.model
        for task_run in task_runs:
            task_run.routing.update({
                "selectedModel": selection.model,
                "modelSource": selection.source,
                "modelFallbackReason": selection.fallback_reason,
                "reasoningEffort": selection.reasoning_effort,
                "executionProfile": selection.profile,
            })
    else:
        selected_model, model_source, model_fallback, reasoning = _resolve_generic_model(
            [item.task for item in task_runs], agent, total_input_tokens, allow_model_fallback,
        )
        for task_run in task_runs:
            task_run.routing.update({
                "selectedModel": selected_model,
                "modelSource": model_source,
                "modelFallbackReason": model_fallback,
                "reasoningEffort": reasoning,
            })
    instruction = f"Read and execute the complete batched Workspace AI Runner prompt from {prompt_path}. Write every mandatory output file."
    command, args = build_agent_command(agent, instruction, total_input_tokens, selected_model)
    env = build_agent_env(agent)
    repositories = _repo_by_id(eco)
    first_task = task_runs[0].task
    cwd = repositories[first_task.repositories[0]].root if first_task.repositories else eco.config_dir
    started_at = datetime.now(timezone.utc).isoformat()

    for task_run, stage, usage in zip(task_runs, stages, usages):
        task_run.started_at = datetime.now(timezone.utc)
        task_run.status = TaskStatus.RUNNING
        metadata = _build_metadata(eco, agent, run_id, task_run.task, stage, "running", started_at=started_at)
        metadata["usage"] = usage
        metadata["agent"]["model"] = selected_model
        metadata["routing"] = task_run.routing
        metadata["batchSessionTasks"] = [item.task.id for item in task_runs]
        _write_json(os.path.join(stage, "metadata.json"), metadata)

    if agent.is_codex:
        try:
            for task_run in task_runs:
                started = move_task_card(eco, task_run.task, "in-progress")
                _record_task_lifecycle(
                    eco, task_run.task, task_run.task.status, "in-progress", run_id,
                    board_status="In Progress" if started else None,
                )
            exit_code, selected_model, codex_info, usages = await _run_codex(
                task_runs, eco, agent, run_id, stages, prompt, usages, cwd,
            )
        except Exception as error:
            exit_code = -1
            codex_info = None
            for task_run in task_runs:
                task_run.error = str(error)
            Path(log_paths[0]).write_text(f"[runner error] {error}\n")
        for task_run in task_runs[1:]:
            task_run.last_lines = list(task_runs[0].last_lines)
        for log_path in log_paths[1:]:
            shutil.copy2(log_paths[0], log_path)
        batch_selection = resolve_codex_selection(
            [item.task for item in task_runs], agent, total_input_tokens, allow_model_fallback,
        )
        for task_run, stage, output_file, log_path, usage in zip(task_runs, stages, output_files, log_paths, usages):
            task_codex_info = None
            if codex_info:
                task_codex_info = {**codex_info, "taskSpecHash": task_spec_hash(task_run.task, batch_selection)}
            _finalize_task(
                task_run, eco, agent, run_id, stage, output_file, log_path,
                started_at, exit_code, usage, selected_model, task_codex_info,
            )
        return

    log_file = open(log_paths[0], "w")
    try:
        for task_run in task_runs:
            started = move_task_card(eco, task_run.task, "in-progress")
            _record_task_lifecycle(
                eco, task_run.task, task_run.task.status, "in-progress", run_id,
                board_status="In Progress" if started else None,
            )
        proc = await asyncio.create_subprocess_exec(
            command, *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            cwd=cwd, env=env, start_new_session=True,
        )
        for task_run in task_runs:
            task_run.pid = proc.pid
        try:
            exit_code = await asyncio.wait_for(_stream_process(proc, log_file, task_runs[0]), timeout=agent.timeout_seconds)
        except asyncio.TimeoutError:
            await _terminate_process_group(proc)
            exit_code = -1
            for task_run in task_runs:
                task_run.error = f"Agent timed out after {agent.timeout_seconds} seconds."
            log_file.write(f"\n[runner error] {task_runs[0].error}\n")
    except Exception as error:
        exit_code = -1
        for task_run in task_runs:
            task_run.error = str(error)
        log_file.write(f"\n[runner error] {error}\n")
    finally:
        log_file.close()

    for task_run in task_runs[1:]:
        task_run.last_lines = list(task_runs[0].last_lines)
    for log_path in log_paths[1:]:
        shutil.copy2(log_paths[0], log_path)
    for task_run, stage, output_file, log_path, usage in zip(task_runs, stages, output_files, log_paths, usages):
        _finalize_task(
            task_run, eco, agent, run_id, stage, output_file, log_path,
            started_at, exit_code, usage, selected_model,
        )
