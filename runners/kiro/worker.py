"""Async worker: spawns one kiro-cli chat process per task."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import EcosystemConfig, Repository, Run, TaskDef, TaskRun, TaskStatus

KIRO_CLI = os.environ.get("KIRO_CLI", "kiro-cli")
KIRO_MODEL = os.environ.get("KIRO_MODEL", "")
KIRO_EFFORT = os.environ.get("KIRO_EFFORT", "high")

# Fallback chain: try best model first, degrade if unavailable
MODEL_FALLBACK_CHAIN = [
    "claude-opus-4.6",
    "claude-sonnet-4.6",
    "claude-opus-4.5",
    "claude-sonnet-4.5",
    "claude-sonnet-4",
]


def _slugify(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


_resolved_model: Optional[str] = None


def resolve_model() -> str:
    """Resolve the best available model, caching the result."""
    global _resolved_model
    if _resolved_model is not None:
        return _resolved_model

    # If user set explicit model, use it
    if KIRO_MODEL:
        _resolved_model = KIRO_MODEL
        return _resolved_model

    # Query available models
    import subprocess, json as _json
    try:
        result = subprocess.run(
            [KIRO_CLI, "chat", "--list-models", "--format", "json"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            data = _json.loads(result.stdout)
            available = {m["model_id"] for m in data.get("models", [])}
            for candidate in MODEL_FALLBACK_CHAIN:
                if candidate in available:
                    _resolved_model = candidate
                    return _resolved_model
    except Exception:
        pass

    # Fallback to first in chain (let kiro-cli error if truly unavailable)
    _resolved_model = MODEL_FALLBACK_CHAIN[0]
    return _resolved_model


def _repo_by_id(eco: EcosystemConfig) -> dict[str, Repository]:
    return {r.id: r for r in eco.repositories}


def build_prompt(task: TaskDef, eco: EcosystemConfig, output_file: str) -> str:
    """Build the full prompt for kiro, matching JS runner format."""
    repos = _repo_by_id(eco)
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
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - {eco.skills_dir}/ecosystem-operating-mode/SKILL.md (global)
  - {eco.skills_dir}/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in {eco.skills_dir}, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt."""

    return f"""You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: {eco.name}
Task: {task.id}
Title: {task.title}

{skills_section}

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

{chr(10).join(repo_sections)}

Mandatory output file:
{output_file}

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: {task.id}
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response."""


def create_stage_dir(eco: EcosystemConfig, run_id: str, task: TaskDef, batch_index: int) -> str:
    """Create and return the stage directory path for this task."""
    stage_name = f"{str(batch_index + 1).zfill(2)}-{_slugify(task.id)}"
    stage_dir = os.path.join(eco.history_root, run_id, stage_name)
    os.makedirs(os.path.join(stage_dir, "tasks"), exist_ok=True)
    # Snapshot the task file
    shutil.copy2(task.file_path, os.path.join(stage_dir, "tasks", task.file_name))
    return stage_dir


def _write_json(path: str, data: dict):
    tmp = path + ".tmp"
    Path(tmp).write_text(json.dumps(data, indent=2, default=str) + "\n")
    os.rename(tmp, path)


def _build_metadata(eco: EcosystemConfig, run_id: str, task: TaskDef, stage_dir: str,
                    status: str, started_at=None, finished_at=None, exit_code=None, failure=None):
    return {
        "ecosystem": eco.name,
        "agent": {"name": "kiro", "type": "kiro", "command": KIRO_CLI},
        "runId": run_id,
        "status": status,
        "mode": "centralized-ecosystem",
        "batch": {"id": task.id, "label": task.title},
        "tasks": [{"id": task.id, "title": task.title, "scope": task.scope, "repositories": task.repositories, "file": task.file_path}],
        "startedAt": started_at,
        "finishedAt": finished_at,
        "exitCode": exit_code,
        "failureReason": failure,
        "files": {
            "prompt": os.path.join(stage_dir, "prompt.md"),
            "output": os.path.join(stage_dir, "output.md"),
            "log": os.path.join(stage_dir, "kiro.log"),
            "summary": os.path.join(stage_dir, "summary.json"),
            "tasks": os.path.join(stage_dir, "tasks"),
        },
    }


async def run_task(task_run: TaskRun, eco: EcosystemConfig, run_id: str, batch_index: int) -> None:
    """Execute a single task via kiro-cli chat."""
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

    # Build kiro-cli args
    model = resolve_model()
    args = ["chat", "--no-interactive", "--trust-all-tools"]
    args.extend(["--model", model])
    if KIRO_EFFORT:
        args.extend(["--effort", KIRO_EFFORT])
    args.append(f"Read and execute the complete Ecosystem AI Runner prompt from {os.path.join(stage_dir, 'prompt.md')}. Follow it exactly, including writing the mandatory output file.")

    # Write initial metadata
    started_at = datetime.now(timezone.utc).isoformat()
    task_run.started_at = datetime.now(timezone.utc)
    task_run.status = TaskStatus.RUNNING
    _write_json(os.path.join(stage_dir, "metadata.json"),
                _build_metadata(eco, run_id, task, stage_dir, "running", started_at=started_at))

    # Spawn process
    log_path = os.path.join(stage_dir, "kiro.log")
    log_file = open(log_path, "w")

    try:
        proc = await asyncio.create_subprocess_exec(
            KIRO_CLI, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=cwd,
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

    failure = None if exit_code == 0 else f"kiro failed for task \"{task.id}\" with exit code {exit_code}."
    status_str = "success" if exit_code == 0 else "failed"

    _write_json(os.path.join(stage_dir, "metadata.json"),
                _build_metadata(eco, run_id, task, stage_dir, status_str,
                                started_at=started_at, finished_at=finished_at,
                                exit_code=exit_code, failure=failure))

    duration_ms = int((task_run.finished_at - task_run.started_at).total_seconds() * 1000)
    _write_json(os.path.join(stage_dir, "summary.json"), {
        "ecosystemRunId": run_id,
        "mode": "centralized-ecosystem",
        "agent": {"name": "kiro", "type": "kiro", "command": KIRO_CLI},
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
        Path(output_file).write_text(f"""# Ecosystem AI Runner Output

- Status: failed
- Mode: centralized-ecosystem
- Task: {task.id}
- Repositories: {', '.join(task.repositories)}
- Result: Runner generated this fallback because the task did not produce a valid mandatory output file.
- Validation: not determined
- Gaps: output file was not produced correctly
- Needs Rework: yes
- Notes: {failure or 'unknown error'}; inspect stage log: {log_path}
""")
