"""Orchestrator: resolves dependencies, manages concurrency pool."""
from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .config import ACTIONABLE_STATUSES, WorkspaceConfig, TaskDef, load_workspace, load_tasks
from .models import AgentConfig, Run, TaskRun, TaskStatus
from .worker import run_task, run_task_batch
from .routing import resolve_task_agent, routing_batch_key, validate_pinned_model


def generate_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")


def resolve_ready_tasks(run: Run) -> list[str]:
    """Return task IDs whose dependencies are all satisfied (success)."""
    ready = []
    for tid, tr in run.tasks.items():
        if tr.status != TaskStatus.QUEUED:
            continue
        deps = tr.task.depends_on
        if all(
            (d in run.tasks and run.tasks[d].status == TaskStatus.SUCCESS)
            or d in run.satisfied_dependencies
            for d in deps
        ):
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
            if d in run.tasks and run.tasks[d].status in (TaskStatus.FAILED, TaskStatus.BLOCKED, TaskStatus.SKIPPED):
                tr.status = TaskStatus.SKIPPED
                tr.error = f"Dependency '{d}' did not succeed"
                skipped.append(tid)
                break
            if d not in run.tasks and d not in run.satisfied_dependencies:
                tr.status = TaskStatus.SKIPPED
                tr.error = f"Dependency '{d}' was not selected or completed"
                skipped.append(tid)
                break
    return skipped


async def execute(
    eco: WorkspaceConfig,
    tasks: list[TaskDef],
    concurrency: int,
    agent: Optional[AgentConfig] = None,
    allow_agent_override: bool = False,
    run_id: Optional[str] = None,
    satisfied_dependency_ids: Optional[set[str]] = None,
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
    maximum_concurrency = os.cpu_count() or 4
    if not isinstance(concurrency, int) or isinstance(concurrency, bool) or concurrency < 1 or concurrency > maximum_concurrency:
        raise ValueError(f"concurrency must be an integer between 1 and {maximum_concurrency}")
    run_id = run_id or generate_run_id()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", run_id):
        raise ValueError("run_id may contain only letters, numbers, dots, underscores, and hyphens")
    # Resolve every task before creating run artifacts so routing failures are atomic.
    decisions = {
        task.id: resolve_task_agent(eco, task, agent, allow_agent_override)
        for task in tasks
    }
    for task in tasks:
        decision = decisions[task.id]
        if decision.source != "forced-cli":
            validate_pinned_model(task, decision.agent)
    unique_agents = {decision.agent.name for decision in decisions.values()}
    run_agent = next(iter(decisions.values())).agent if len(unique_agents) == 1 and decisions else agent

    run = Run(
        id=run_id,
        workspace=eco.name,
        concurrency=concurrency,
        agent=run_agent,
        satisfied_dependencies=satisfied_dependency_ids or set(),
        started_at=datetime.now(timezone.utc),
    )

    # Build task index with batch positions and resolved execution agents.
    batch_index_map: dict[str, int] = {}
    for i, t in enumerate(tasks):
        decision = decisions[t.id]
        run.tasks[t.id] = TaskRun(task=t, agent=decision.agent, routing=decision.as_dict())
        batch_index_map[t.id] = i

    run_directory = os.path.join(eco.history_root, run_id)
    if os.path.isdir(run_directory) and any(entry.is_dir() for entry in Path(run_directory).iterdir()):
        raise ValueError(f"Run directory already contains task stages: {run_directory}")
    os.makedirs(run_directory, exist_ok=True)

    active: set[asyncio.Task] = set()
    task_to_ids: dict[asyncio.Task, list[str]] = {}

    def _notify():
        if on_update:
            on_update(run)

    while True:
        # Skip tasks blocked by failed deps
        skip_blocked(run)

        # Find ready tasks
        ready = resolve_ready_tasks(run)

        # Launch as many as concurrency allows. Tasks sharing a repository are
        # serialized so independent agents never mutate the same checkout.
        while ready and len(active) < concurrency:
            active_repositories = {
                repository
                for active_task in active
                for task_id in task_to_ids[active_task]
                for repository in run.tasks[task_id].task.repositories
            }
            launch_index = next(
                (index for index, candidate in enumerate(ready)
                 if active_repositories.isdisjoint(run.tasks[candidate].task.repositories)),
                None,
            )
            if launch_index is None:
                break
            tid = ready.pop(launch_index)
            selected_agent = run.tasks[tid].agent
            assert selected_agent
            selected_ids = [tid]
            if eco.token_policy.batch_related_tasks:
                repository_signature = tuple(sorted(run.tasks[tid].task.repositories))
                for candidate in list(ready):
                    if len(selected_ids) >= eco.token_policy.batch_size:
                        break
                    if (
                        tuple(sorted(run.tasks[candidate].task.repositories)) == repository_signature
                        and run.tasks[candidate].agent is not None
                        and routing_batch_key(run.tasks[candidate].task, run.tasks[candidate].agent)
                            == routing_batch_key(run.tasks[tid].task, selected_agent)
                    ):
                        selected_ids.append(candidate)
                        ready.remove(candidate)
            selected_runs = [run.tasks[task_id] for task_id in selected_ids]
            if len(selected_runs) > 1:
                coro = run_task_batch(
                    selected_runs, eco, selected_agent, run_id,
                    [batch_index_map[task_id] for task_id in selected_ids],
                )
            else:
                coro = run_task(selected_runs[0], eco, selected_agent, run_id, batch_index_map[tid])
            atask = asyncio.create_task(coro)
            active.add(atask)
            task_to_ids[atask] = selected_ids
            _notify()

        # If nothing running and nothing ready, we're done
        if not active:
            unresolved = [tr for tr in run.tasks.values() if tr.status == TaskStatus.QUEUED]
            for task_run in unresolved:
                task_run.status = TaskStatus.SKIPPED
                task_run.error = "Unresolvable dependency cycle"
            if unresolved:
                _notify()
            break

        # Wait for at least one to finish
        done, active = await asyncio.wait(active, return_when=asyncio.FIRST_COMPLETED)
        for d in done:
            task_ids = task_to_ids.pop(d)
            if d.exception():
                for task_id in task_ids:
                    run.tasks[task_id].status = TaskStatus.FAILED
                    run.tasks[task_id].error = str(d.exception())
            _notify()

    run.finished_at = datetime.now(timezone.utc)
    _notify()
    return run
