"""Codex-specific non-interactive adapter for the generic workspace runner."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .models import AgentConfig, CodexOptions, ModelRoute, TaskDef
from .routing import task_routing_policy

PROFILE_RANK = {"mechanical": 0, "standard": 1, "deep": 2}


@dataclass(frozen=True)
class CodexSelection:
    profile: str
    model: str
    reasoning_effort: str
    source: str
    fallback_reason: Optional[str] = None


@dataclass
class CodexTelemetry:
    thread_id: Optional[str] = None
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    reasoning_output_tokens: int = 0

    def as_usage(self) -> dict:
        return {
            "estimated": False,
            "inputTokens": self.input_tokens,
            "cachedInputTokens": self.cached_input_tokens,
            "outputTokens": self.output_tokens,
            "reasoningOutputTokens": self.reasoning_output_tokens,
        }


def _task_profile(task: TaskDef) -> tuple[str, bool]:
    if task.execution_profile:
        return task.execution_profile, True
    if task.risk == "critical" or task.complexity == "high":
        return "deep", True
    if task.complexity == "low" and task.risk in {None, "low"}:
        return "mechanical", True
    if task.complexity or task.risk:
        return "standard", True
    return "standard", False


def codex_batch_key(task: TaskDef) -> tuple:
    """Keep a shared Codex turn on one cost/risk tier."""
    return (_task_profile(task)[0], task.preferred_model, task.reasoning_effort)


def _matching_route(agent: AgentConfig, prompt_tokens: int) -> Optional[ModelRoute]:
    for route in sorted(agent.model_routes, key=lambda item: item.max_prompt_tokens):
        if prompt_tokens <= route.max_prompt_tokens:
            return route
    return None


def resolve_codex_selection(
    tasks: list[TaskDef], agent: AgentConfig, prompt_tokens: int,
    allow_pinned_fallback: bool = False,
) -> CodexSelection:
    """Resolve model and reasoning from explicit task intent before prompt size."""
    options = agent.codex or CodexOptions()
    profiled = [_task_profile(task) for task in tasks]
    profile = max((item[0] for item in profiled), key=lambda value: PROFILE_RANK[value])
    has_task_routing = any(item[1] for item in profiled)

    preferred_models = {
        task.preferred_model for task in tasks
        if task.preferred_model and task_routing_policy(task) != "portable"
    }
    reasoning_efforts = {
        task.reasoning_effort for task in tasks
        if task.reasoning_effort and task_routing_policy(task) != "portable"
    }
    if len(preferred_models) > 1:
        raise ValueError("A Codex batch cannot contain conflicting preferred_model values.")
    if len(reasoning_efforts) > 1:
        raise ValueError("A Codex batch cannot contain conflicting reasoning_effort values.")

    profile_models = {
        "mechanical": options.mechanical_model,
        "standard": options.standard_model,
        "deep": options.deep_model,
    }
    profile_reasoning = {
        "mechanical": options.mechanical_reasoning,
        "standard": options.standard_reasoning,
        "deep": options.deep_reasoning,
    }
    requested_model = next(iter(preferred_models), None)
    fallback_reason = None
    if requested_model and not agent.supports_model(requested_model):
        pinned = any(task_routing_policy(task) == "pinned" for task in tasks)
        if pinned and not allow_pinned_fallback:
            configured = ", ".join(sorted(agent.configured_models)) or "none"
            raise ValueError(
                f"Pinned model '{requested_model}' is not configured for agent '{agent.name}'. "
                f"Configured models: {configured}."
            )
        fallback_reason = f"Requested model '{requested_model}' is not configured for agent '{agent.name}'."
        requested_model = None
    model = requested_model
    reasoning = next(iter(reasoning_efforts), None)
    source = "task-fallback" if fallback_reason else "task"

    if not model and not has_task_routing:
        route = _matching_route(agent, prompt_tokens)
        if route:
            model = route.model
            reasoning = reasoning or route.reasoning_effort
            source = "prompt-route"
        elif agent.model:
            model = agent.model
            source = "agent"
    if not model:
        model = profile_models[profile]
    if not reasoning:
        reasoning = agent.reasoning_effort or profile_reasoning[profile]
    return CodexSelection(
        profile=profile, model=model, reasoning_effort=reasoning,
        source=source, fallback_reason=fallback_reason,
    )


def task_spec_hash(task: TaskDef, selection: CodexSelection) -> str:
    payload = {
        "id": task.id,
        "title": task.title,
        "scope": task.scope,
        "repositories": task.repositories,
        "validation": task.validation,
        "body": task.body,
        "executionAgent": task.execution_agent,
        "routingPolicy": task.routing_policy,
        "executionProfile": task.execution_profile,
        "complexity": task.complexity,
        "risk": task.risk,
        "model": selection.model,
        "reasoningEffort": selection.reasoning_effort,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def find_resumable_thread(history_root: str, task: TaskDef, selection: CodexSelection, current_run_id: str) -> Optional[str]:
    options_hash = task_spec_hash(task, selection)
    if task.status != "needs-rework":
        return None
    candidates = []
    for summary_path in Path(history_root).glob("*/*/summary.json"):
        if summary_path.parts[-3] == current_run_id:
            continue
        try:
            summary = json.loads(summary_path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        codex = summary.get("codex") or {}
        tasks = summary.get("tasks") or []
        if (
            summary.get("status") in {"failed", "blocked"}
            and any(item.get("id") == task.id for item in tasks)
            and codex.get("taskSpecHash") == options_hash
            and codex.get("threadId")
        ):
            candidates.append((summary_path.stat().st_mtime, str(codex["threadId"])))
    return max(candidates)[1] if candidates else None


def write_output_schema(path: str, task_ids: list[str]) -> None:
    text_fields = {
        key: {"type": "string"}
        for key in ("repositories", "result", "validation", "docs_updated", "gaps", "needs_rework", "notes")
    }
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": False,
        "required": ["tasks"],
        "properties": {
            "tasks": {
                "type": "array",
                "minItems": len(task_ids),
                "maxItems": len(task_ids),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["task", "status", *text_fields.keys()],
                    "properties": {
                        "task": {"type": "string", "enum": task_ids},
                        "status": {"type": "string", "enum": ["success", "blocked", "failed"]},
                        **text_fields,
                    },
                },
            }
        },
    }
    Path(path).write_text(json.dumps(schema, indent=2) + "\n")


def _legacy_exec_args(agent: AgentConfig) -> tuple[list[str], bool]:
    args = list(agent.args)
    if args and args[0] == "exec":
        args.pop(0)
    ephemeral = "--ephemeral" in args
    result: list[str] = []
    skip_next = False
    for arg in args:
        if skip_next:
            skip_next = False
            continue
        if arg in {"--output-schema", "--output-last-message", "-o"}:
            skip_next = True
            continue
        if any(arg.startswith(prefix) for prefix in ("--output-schema=", "--output-last-message=", "-o=")):
            continue
        if arg in {"--json", "--ephemeral"}:
            continue
        if arg in {"--model", "-m", "--sandbox", "-s", "--ask-for-approval", "-a", "--cd", "-C", "--profile", "-p"}:
            raise ValueError(f"Codex argument '{arg}' is managed by the dedicated adapter; use agent/codex configuration instead.")
        if any(arg.startswith(prefix) for prefix in ("--model=", "--sandbox=", "--ask-for-approval=", "--cd=", "--profile=")):
            raise ValueError(f"Codex argument '{arg}' is managed by the dedicated adapter; use agent/codex configuration instead.")
        result.append(arg)
    return result, ephemeral


def codex_is_ephemeral(agent: AgentConfig) -> bool:
    options = agent.codex or CodexOptions()
    _, legacy_ephemeral = _legacy_exec_args(agent)
    return options.session_policy == "ephemeral" or legacy_ephemeral


def build_codex_command(
    agent: AgentConfig,
    selection: CodexSelection,
    cwd: str,
    schema_path: str,
    response_path: str,
    resume_thread_id: Optional[str] = None,
    additional_dirs: Optional[list[str]] = None,
) -> tuple[str, list[str]]:
    options = agent.codex or CodexOptions()
    extra_args, _ = _legacy_exec_args(agent)
    global_args = [
        "--ask-for-approval", options.approval_policy,
        "--sandbox", options.sandbox,
        "--cd", cwd,
    ]
    if options.profile:
        global_args.extend(["--profile", options.profile])
    for directory in additional_dirs or []:
        if directory != cwd:
            global_args.extend(["--add-dir", directory])
    global_args.extend(["exec"])
    if resume_thread_id:
        global_args.extend(["resume", resume_thread_id])
    exec_args = [
        "--model", selection.model,
        "--config", f'model_reasoning_effort="{selection.reasoning_effort}"',
        "--json",
        "--output-schema", schema_path,
        "--output-last-message", response_path,
    ]
    if options.ignore_user_config:
        exec_args.append("--ignore-user-config")
    if options.ignore_rules:
        exec_args.append("--ignore-rules")
    if codex_is_ephemeral(agent):
        exec_args.append("--ephemeral")
    exec_args.extend(extra_args)
    exec_args.append("-")
    return agent.command, [*global_args, *exec_args]


def consume_event(line: str, telemetry: CodexTelemetry) -> Optional[dict]:
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        return None
    if event.get("type") == "thread.started":
        telemetry.thread_id = event.get("thread_id") or event.get("threadId")
    if event.get("type") == "turn.completed":
        usage = event.get("usage") or {}
        telemetry.input_tokens += int(usage.get("input_tokens", 0) or 0)
        telemetry.cached_input_tokens += int(usage.get("cached_input_tokens", 0) or 0)
        telemetry.output_tokens += int(usage.get("output_tokens", 0) or 0)
        telemetry.reasoning_output_tokens += int(usage.get("reasoning_output_tokens", 0) or 0)
    return event


def render_structured_outputs(response_path: str, output_paths: dict[str, str]) -> None:
    response = json.loads(Path(response_path).read_text())
    items = response.get("tasks")
    if not isinstance(items, list):
        raise ValueError("Codex structured response is missing tasks.")
    by_id = {str(item.get("task")): item for item in items if isinstance(item, dict)}
    if set(by_id) != set(output_paths):
        raise ValueError("Codex structured response task ids do not match the requested tasks.")
    def compact(value) -> str:
        return " ".join(str(value).split()) or "none"
    for task_id, output_path in output_paths.items():
        item = by_id[task_id]
        Path(output_path).write_text(f"""# Workspace AI Runner Output

- Status: {compact(item['status'])}
- Mode: centralized-workspace
- Task: {task_id}
- Repositories: {compact(item['repositories'])}
- Result: {compact(item['result'])}
- Validation: {compact(item['validation'])}
- Docs Updated: {compact(item['docs_updated'])}
- Gaps: {compact(item['gaps'])}
- Needs Rework: {compact(item['needs_rework'])}
- Notes: {compact(item['notes'])}
""")
