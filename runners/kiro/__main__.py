"""CLI entrypoint: python -m runners.kiro --config <path> [options]"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

from .config import ACTIONABLE_STATUSES, load_workspace, load_tasks
from .monitor import Monitor
from .runner import execute


def parse_args():
    p = argparse.ArgumentParser(description="Kiro Parallel Runner for Workspace AI")
    p.add_argument("--config", required=True, help="Path to workspace.config.json")
    p.add_argument("--task", action="append", dest="tasks", default=[], help="Task ID(s) to run (repeatable)")
    p.add_argument("--scope", help="Run all actionable tasks in this scope")
    p.add_argument("--open-tasks", action="store_true", help="Run all open/needs-rework tasks")
    p.add_argument("--concurrency", type=int, default=os.cpu_count() or 4, help="Max parallel workers (default: cpu count)")
    p.add_argument("--run-id", help="Custom run ID (default: timestamp)")
    p.add_argument("--dry-run", action="store_true", help="Resolve config and tasks without running")
    p.add_argument("--no-tui", action="store_true", help="Disable live TUI, print plain logs")
    return p.parse_args()


def resolve_tasks(args, eco):
    """Resolve which tasks to execute based on CLI args."""
    all_tasks = load_tasks(eco)

    if args.tasks:
        by_id = {t.id: t for t in all_tasks}
        # Also match by filename stem
        by_stem = {t.file_name.replace(".md", ""): t for t in all_tasks}
        resolved = []
        for ref in args.tasks:
            t = by_id.get(ref) or by_stem.get(ref)
            if not t:
                # Fuzzy: partial match
                matches = [x for x in all_tasks if ref in x.id or ref in x.file_name]
                if len(matches) == 1:
                    t = matches[0]
                elif len(matches) > 1:
                    sys.exit(f"Task reference '{ref}' is ambiguous: {[m.id for m in matches]}")
                else:
                    sys.exit(f"Task '{ref}' not found.")
            resolved.append(t)
        return resolved

    if args.scope:
        tasks = [t for t in all_tasks if t.scope == args.scope and t.status in ACTIONABLE_STATUSES]
        if not tasks:
            sys.exit(f"No actionable tasks found for scope '{args.scope}'.")
        return tasks

    if args.open_tasks:
        tasks = [t for t in all_tasks if t.status in ACTIONABLE_STATUSES]
        if not tasks:
            sys.exit("No actionable tasks found.")
        return tasks

    sys.exit("Specify --task, --scope, or --open-tasks.")


def main():
    args = parse_args()
    eco = load_workspace(args.config)
    tasks = resolve_tasks(args, eco)

    print(f"[kiro-runner] Workspace: {eco.name}")
    print(f"[kiro-runner] Tasks: {len(tasks)} | Concurrency: {args.concurrency}")
    for t in tasks:
        deps = f" (depends: {', '.join(t.depends_on)})" if t.depends_on else ""
        print(f"  • {t.id}{deps}")

    if args.dry_run:
        print("[kiro-runner] Dry run — not executing.")
        return

    monitor = Monitor()
    if not args.no_tui:
        monitor.start()

    try:
        run = asyncio.run(execute(
            eco=eco,
            tasks=tasks,
            concurrency=args.concurrency,
            run_id=args.run_id,
            on_update=monitor.update if not args.no_tui else None,
        ))
    finally:
        if not args.no_tui:
            monitor.stop()

    monitor.print_summary(run)

    # Exit with failure if any task failed
    if any(t.status.value == "failed" for t in run.tasks.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
