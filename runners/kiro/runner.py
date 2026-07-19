"""Orchestrator: resolves dependencies, manages concurrency pool."""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Optional

from .config import ACTIONABLE_STATUSES, WorkspaceConfig, TaskDef, load_workspace, load_tasks
from .models import AgentConfig, Run, TaskRun, TaskStatus
from .worker import run_task


def generate_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def resolve_ready_tasks(run: Run) -> list[str]:
    """Return task IDs whose dependencies are all satisfied (success)."""
    ready = []
    for tid, tr in run.tasks.items():
        if tr.status != TaskStatus.QUEUED:
            continue
        deps = tr.task.depends_on
        if all(run.tasks.get(d) and run.tasks[d].status == TaskStatus.SUCCESS for d in deps if d in run.tasks):
            ready.append(tid)
    return ready


def skip_blocked(run: Run) -> list[str]:
    """Skip tasks whose dependencies failed."""
    skipped = []
    for tid, tr in run.tasks.items():
        if tr.status != TaskStatus.QUEUED:
            continue
        deps = tr.task.depends_on
        for d in deps:
            if d in run.tasks and run.tasks[d].status == TaskStatus.FAILED:
                tr.status = TaskStatus.SKIPPED
                tr.error = f"Dependency '{d}' failed"
                skipped.append(tid)
                break
    return skipped


async def execute(
    eco: WorkspaceConfig,
    tasks: list[TaskDef],
    concurrency: int,
    agent: Optional[AgentConfig] = None,
    run_id: Optional[str] = None,
    on_update=None,
) -> Run:
    """Run tasks in parallel with dependency resolution.

    Args:
        eco: Loaded workspace config
        tasks: List of tasks to execute
        concurrency: Max parallel workers
        agent: Agent config to use (default: workspace defaultAgent)
        run_id: Optional custom run ID
        on_update: Optional callback(run) called on state changes
    """
    run_id = run_id or generate_run_id()
    resolved_agent = agent or eco.resolve_agent()

    run = Run(
        id=run_id,
        workspace=eco.name,
        concurrency=concurrency,
        agent=resolved_agent,
        started_at=datetime.now(timezone.utc),
    )

    # Build task index with batch positions
    batch_index_map: dict[str, int] = {}
    for i, t in enumerate(tasks):
        run.tasks[t.id] = TaskRun(task=t)
        batch_index_map[t.id] = i

    os.makedirs(os.path.join(eco.history_root, run_id), exist_ok=True)

    active: set[asyncio.Task] = set()
    task_to_id: dict[asyncio.Task, str] = {}

    def _notify():
        if on_update:
            on_update(run)

    while True:
        # Skip tasks blocked by failed deps
        skip_blocked(run)

        # Find ready tasks
        ready = resolve_ready_tasks(run)

        # Launch as many as concurrency allows
        while ready and len(active) < concurrency:
            tid = ready.pop(0)
            tr = run.tasks[tid]
            coro = run_task(tr, eco, resolved_agent, run_id, batch_index_map[tid])
            atask = asyncio.create_task(coro)
            active.add(atask)
            task_to_id[atask] = tid
            _notify()

        # If nothing running and nothing ready, we're done
        if not active:
            break

        # Wait for at least one to finish
        done, active = await asyncio.wait(active, return_when=asyncio.FIRST_COMPLETED)
        for d in done:
            tid = task_to_id.pop(d)
            if d.exception():
                run.tasks[tid].status = TaskStatus.FAILED
                run.tasks[tid].error = str(d.exception())
            _notify()

    run.finished_at = datetime.now(timezone.utc)
    _notify()
    return run
