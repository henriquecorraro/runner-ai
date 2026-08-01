"""CLI entrypoint: python -m runners.generic --config <path> [options]."""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys

from .config import ACTIONABLE_STATUSES, load_workspace, load_tasks
from .models import AgentConfig
from .monitor import Monitor
from .runner import execute
from .routing import resolve_task_agent, validate_pinned_model


def parse_args():
    p = argparse.ArgumentParser(description="Generic Parallel Runner for Workspace AI")
    p.add_argument("--config", required=True, help="Path to workspace.config.json")
    p.add_argument("--task", action="append", dest="tasks", default=[], help="Task ID(s) to run (repeatable)")
    p.add_argument("--feature", help="Run the task uniquely matching this id, filename, or title fragment")
    p.add_argument("--scope", help="Run all actionable tasks in this scope")
    p.add_argument("--open-tasks", action="store_true", help="Run all open/needs-rework tasks")
    p.add_argument("--open-scopes", action="store_true", help="Run all open/needs-rework tasks with dependency-aware parallelism")
    p.add_argument("--agent", help="Agent name override (must exist in workspace agents config)")
    p.add_argument("--allow-agent-override", action="store_true", help="Allow --agent to replace a task pinned to another agent")
    p.add_argument("--concurrency", type=int, default=os.cpu_count() or 4, help="Max parallel workers (default: cpu count)")
    p.add_argument("--run-id", help="Custom run ID (default: timestamp)")
    p.add_argument("--batch-related", action="store_true", help="Batch ready tasks with identical repository sets into one agent session")
    p.add_argument("--batch-size", type=int, help="Maximum tasks per related-task batch (1-12)")
    p.add_argument("--dry-run", action="store_true", help="Resolve config and tasks without running")
    p.add_argument("--no-tui", action="store_true", help="Disable live TUI, print plain logs")
    return p.parse_args()


def resolve_tasks(args, eco, all_tasks=None):
    """Resolve which tasks to execute based on CLI args."""
    all_tasks = all_tasks if all_tasks is not None else load_tasks(eco)

    modes = [bool(args.tasks), bool(args.feature), bool(args.scope), args.open_tasks, args.open_scopes]
    if sum(modes) != 1:
        sys.exit("Specify exactly one of --task, --feature, --scope, --open-tasks, or --open-scopes.")

    if args.tasks:
        by_id = {t.id: t for t in all_tasks}
        by_stem = {t.file_name.replace(".md", ""): t for t in all_tasks}
        resolved = []
        for ref in args.tasks:
            t = by_id.get(ref) or by_stem.get(ref)
            if not t:
                matches = [x for x in all_tasks if ref in x.id or ref in x.file_name]
                if len(matches) == 1:
                    t = matches[0]
                elif len(matches) > 1:
                    sys.exit(f"Task reference '{ref}' is ambiguous: {[m.id for m in matches]}")
                else:
                    sys.exit(f"Task '{ref}' not found.")
            resolved.append(t)
        return resolved

    if args.feature:
        fragment = args.feature.lower()
        matches = [
            task for task in all_tasks
            if any(fragment in value.lower() for value in (task.id, task.file_name, task.title))
        ]
        if not matches:
            sys.exit(f"Feature '{args.feature}' did not match any task.")
        if len(matches) > 1:
            sys.exit(f"Feature '{args.feature}' is ambiguous: {[task.id for task in matches]}")
        return matches

    if args.scope:
        tasks = [t for t in all_tasks if t.scope == args.scope and t.status in ACTIONABLE_STATUSES]
        if not tasks:
            sys.exit(f"No actionable tasks found for scope '{args.scope}'.")
        return tasks

    if args.open_tasks or args.open_scopes:
        tasks = [t for t in all_tasks if t.status in ACTIONABLE_STATUSES]
        if not tasks:
            sys.exit("No actionable tasks found.")
        return tasks

    raise AssertionError("unreachable")


def validate_dependencies(tasks, all_tasks):
    """Require dependencies to be selected or already completed."""
    selected_ids = {task.id for task in tasks}
    all_by_id = {task.id: task for task in all_tasks}
    satisfied = set()
    errors = []

    for task in tasks:
        for dependency_id in task.depends_on:
            if dependency_id in selected_ids:
                continue
            dependency = all_by_id.get(dependency_id)
            if dependency and dependency.status == "done":
                satisfied.add(dependency_id)
                continue
            state = dependency.status if dependency else "missing"
            errors.append(f"{task.id} requires {dependency_id} ({state})")

    if errors:
        sys.exit("Unsatisfied task dependencies:\n- " + "\n- ".join(errors))
    return satisfied


def main():
    args = parse_args()
    max_concurrency = os.cpu_count() or 4
    if args.concurrency < 1 or args.concurrency > max_concurrency:
        sys.exit(f"--concurrency must be between 1 and {max_concurrency}.")
    if args.run_id and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", args.run_id):
        sys.exit("--run-id may contain only letters, numbers, dots, underscores, and hyphens.")
    eco = load_workspace(args.config)
    if args.batch_size is not None and not 1 <= args.batch_size <= 12:
        sys.exit("--batch-size must be between 1 and 12.")
    if args.allow_agent_override and not args.agent:
        sys.exit("--allow-agent-override requires --agent.")
    if args.batch_related:
        eco.token_policy.batch_related_tasks = True
    if args.batch_size is not None:
        eco.token_policy.batch_size = args.batch_size
    all_tasks = load_tasks(eco)
    tasks = resolve_tasks(args, eco, all_tasks)
    satisfied_dependencies = validate_dependencies(tasks, all_tasks)

    # Resolve only an explicit CLI override. Without --agent, each task routes itself.
    try:
        agent = eco.resolve_agent(args.agent) if args.agent else None
        decisions = [resolve_task_agent(eco, task, agent, args.allow_agent_override) for task in tasks]
        for task, decision in zip(tasks, decisions):
            if decision.source != "forced-cli":
                validate_pinned_model(task, decision.agent)
    except ValueError as error:
        sys.exit(str(error))

    print(f"[runner] Workspace: {eco.name}")
    print(f"[runner] Agent routing: {'CLI override ' + agent.name if agent else 'per task'}")
    print(f"[runner] Tasks: {len(tasks)} | Concurrency: {args.concurrency}")
    for t, decision in zip(tasks, decisions):
        deps = f" (depends: {', '.join(t.depends_on)})" if t.depends_on else ""
        print(f"  • {t.id} -> {decision.agent.name} [{decision.policy}/{decision.source}]{deps}")

    if args.dry_run:
        print("[runner] Dry run — not executing.")
        return

    monitor = Monitor()
    if not args.no_tui:
        monitor.start()

    try:
        run = asyncio.run(execute(
            eco=eco,
            tasks=tasks,
            concurrency=args.concurrency,
            agent=agent,
            allow_agent_override=args.allow_agent_override,
            run_id=args.run_id,
            satisfied_dependency_ids=satisfied_dependencies,
            on_update=monitor.update if not args.no_tui else None,
        ))
    finally:
        if not args.no_tui:
            monitor.stop()

    monitor.print_summary(run)

    # Exit with failure if any task failed
    if any(t.status.value in {"failed", "blocked", "skipped", "queued", "running"} for t in run.tasks.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
