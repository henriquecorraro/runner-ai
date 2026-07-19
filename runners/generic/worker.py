"""Async worker: spawns one agent process per task using workspace agent config."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import AgentConfig, WorkspaceConfig, Repository, Run, TaskDef, TaskRun, TaskStatus
from .board import move_task_card


def _slugify(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _repo_by_id(eco: WorkspaceConfig) -> dict[str, Repository]:
    return {r.id: r for r in eco.repositories}


def _load_context_snapshot(task: TaskDef) -> Optional[str]:
    """Load the .context.md sibling file if it exists."""
    context_path = task.file_path.replace(".md", ".context.md")
    if os.path.exists(context_path):
        content = Path(context_path).read_text().strip()
        if content:
            return content
    return None


def build_prompt(task: TaskDef, eco: WorkspaceConfig, output_file: str) -> str:
    """Build the full prompt, agent-agnostic."""
    repos = _repo_by_id(eco)
    context_content = _load_context_snapshot(task)

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
Repository label: {repo.label}
Repository root: {repo.root}

Repository guidance:
{chr(10).join(guidance)}

### {task.id}
Task id: {task.id}
Task title: {task.title}
Task status: {task.status}
{f"Task scope: {task.scope}" if task.scope else ""}
{f"Task validation: {' ; '.join(task.validation)}" if task.validation else ""}

```md
{task.body}
```"""
        repo_sections.append(section)

    skills_section = f"""Skill operating instructions:
- ENGLISH FIRST for workspace SDD artifacts.
- Before editing code, read and follow the umbrella skill when it exists:
  - {eco.skills_dir}/workspace-operating-mode/SKILL.md (global)
  - {eco.skills_dir}/workspace-task-executor/SKILL.md (execution)
- If workspace-local skills exist in {eco.skills_dir}, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt."""

    context_block = ""
    if context_content:
        context_block = f"""Pre-computed execution context (read this first — saves you from re-reading files):

{context_content}

---
"""

    return f"""You are running one Workspace AI Runner task for a centralized workspace SDD.

Workspace: {eco.name}
Task: {task.id}
Title: {task.title}

{skills_section}

{context_block}Execution goals:
- Execute the task below completely.
- Keep all centralized workspace SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

{chr(10).join(repo_sections)}

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

The output file must stay short and operational. After writing it, read it back before ending your response."""


def create_stage_dir(eco: WorkspaceConfig, run_id: str, task: TaskDef, batch_index: int) -> str:
    """Create and return the stage directory path for this task."""
    stage_name = f"{str(batch_index + 1).zfill(2)}-{_slugify(task.id)}"
    stage_dir = os.path.join(eco.history_root, run_id, stage_name)
    os.makedirs(os.path.join(stage_dir, "tasks"), exist_ok=True)
    shutil.copy2(task.file_path, os.path.join(stage_dir, "tasks", task.file_name))
    # Also copy context snapshot if exists
    context_path = task.file_path.replace(".md", ".context.md")
    if os.path.exists(context_path):
        shutil.copy2(context_path, os.path.join(stage_dir, "tasks", os.path.basename(context_path)))
    return stage_dir


def _write_json(path: str, data: dict):
    tmp = path + ".tmp"
    Path(tmp).write_text(json.dumps(data, indent=2, default=str) + "\n")
    os.rename(tmp, path)


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


def build_agent_command(agent: AgentConfig, prompt_instruction: str) -> tuple[str, list[str]]:
    """Build the command and args to spawn the agent.

    Convention: the prompt is always the last positional argument after the configured args.
    If the agent has a model configured, inject --model before the prompt.
    Agent commands are defined by the workspace; supported built-in examples
    accept this convention.
    """
    args = list(agent.args)
    if agent.model:
        args.extend(["--model", agent.model])
    args.append(prompt_instruction)
    return agent.command, args


def build_agent_env(agent: AgentConfig) -> dict[str, str]:
    """Build environment variables for the agent process."""
    env = {**os.environ}
    if agent.env:
        env.update(agent.env)
    return env


async def run_task(task_run: TaskRun, eco: WorkspaceConfig, agent: AgentConfig, run_id: str, batch_index: int) -> None:
    """Execute a single task by spawning the configured agent."""
    task = task_run.task
    stage_dir = create_stage_dir(eco, run_id, task, batch_index)
    task_run.stage_dir = stage_dir

    output_file = os.path.join(stage_dir, "output.md")
    prompt = build_prompt(task, eco, output_file)

    # Write prompt
    Path(os.path.join(stage_dir, "prompt.md")).write_text(prompt + "\n")

    # Determine cwd (first repo root)
    repos = _repo_by_id(eco)
    cwd = repos[task.repositories[0]].root if task.repositories else eco.config_dir

    # Build agent command from workspace config
    prompt_instruction = f"Read and execute the complete Workspace AI Runner prompt from {os.path.join(stage_dir, 'prompt.md')}. Follow it exactly, including writing the mandatory output file."
    command, args = build_agent_command(agent, prompt_instruction)
    env = build_agent_env(agent)

    # Write initial metadata
    started_at = datetime.now(timezone.utc).isoformat()
    task_run.started_at = datetime.now(timezone.utc)
    task_run.status = TaskStatus.RUNNING
    _write_json(os.path.join(stage_dir, "metadata.json"),
                _build_metadata(eco, agent, run_id, task, stage_dir, "running", started_at=started_at))

    # Move card to In Progress
    move_task_card(eco, task, "in-progress")

    # Spawn process
    log_path = os.path.join(stage_dir, "agent.log")
    log_file = open(log_path, "w")

    try:
        proc = await asyncio.create_subprocess_exec(
            command, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=cwd,
            env=env,
        )
        task_run.pid = proc.pid

        # Stream output
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
        exit_code = proc.returncode or 0
    except Exception as e:
        exit_code = -1
        task_run.error = str(e)
        log_file.write(f"\n[runner error] {e}\n")
    finally:
        log_file.close()

    # Finalize
    finished_at = datetime.now(timezone.utc).isoformat()
    task_run.finished_at = datetime.now(timezone.utc)
    task_run.exit_code = exit_code
    task_run.status = TaskStatus.SUCCESS if exit_code == 0 else TaskStatus.FAILED

    # Move card to Testing on success
    if exit_code == 0:
        move_task_card(eco, task, "testing")

    failure = None if exit_code == 0 else f"Agent failed for task \"{task.id}\" with exit code {exit_code}."
    status_str = "success" if exit_code == 0 else "failed"

    _write_json(os.path.join(stage_dir, "metadata.json"),
                _build_metadata(eco, agent, run_id, task, stage_dir, status_str,
                                started_at=started_at, finished_at=finished_at,
                                exit_code=exit_code, failure=failure))

    duration_ms = int((task_run.finished_at - task_run.started_at).total_seconds() * 1000)
    _write_json(os.path.join(stage_dir, "summary.json"), {
        "workspaceRunId": run_id,
        "mode": "centralized-workspace",
        "agent": {"name": agent.name, "type": agent.type or agent.name, "command": agent.command},
        "batch": {"id": task.id, "label": task.title},
        "tasks": [{"id": task.id, "scope": task.scope, "repositories": task.repositories, "file": task.file_name}],
        "status": status_str,
        "exitCode": exit_code,
        "durationMs": duration_ms,
        "failureReason": failure,
        "files": {"output": output_file, "log": log_path, "metadata": os.path.join(stage_dir, "metadata.json")},
    })

    # If no output.md was generated, create fallback
    if not os.path.exists(output_file) or not Path(output_file).read_text().strip():
        Path(output_file).write_text(f"""# Workspace AI Runner Output

- Status: failed
- Mode: centralized-workspace
- Task: {task.id}
- Repositories: {', '.join(task.repositories)}
- Result: Runner generated this fallback because the task did not produce a valid mandatory output file.
- Validation: not determined
- Gaps: output file was not produced correctly
- Needs Rework: yes
- Notes: {failure or 'unknown error'}; inspect stage log: {log_path}
""")
