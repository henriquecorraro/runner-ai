"""Real-time TUI monitor using Rich."""
from __future__ import annotations

from datetime import datetime, timezone

from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .models import Run, TaskStatus

STATUS_STYLE = {
    TaskStatus.QUEUED: "dim",
    TaskStatus.RUNNING: "bold cyan",
    TaskStatus.SUCCESS: "bold green",
    TaskStatus.FAILED: "bold red",
    TaskStatus.BLOCKED: "bold yellow",
    TaskStatus.SKIPPED: "yellow",
}

STATUS_ICON = {
    TaskStatus.QUEUED: "⏳",
    TaskStatus.RUNNING: "🔄",
    TaskStatus.SUCCESS: "✅",
    TaskStatus.FAILED: "❌",
    TaskStatus.BLOCKED: "🚧",
    TaskStatus.SKIPPED: "⏭️",
}


def build_table(run: Run) -> Table:
    agent_name = run.agent.name if run.agent else "mixed"
    table = Table(title=f"Workspace Runner ({agent_name}) — {run.workspace} — {run.id}", expand=True)
    table.add_column("Task", style="bold", ratio=3)
    table.add_column("Status", justify="center", ratio=1)
    table.add_column("Agent", ratio=1)
    table.add_column("PID", justify="right", ratio=1)
    table.add_column("Duration", justify="right", ratio=1)
    table.add_column("Last Output", ratio=4, no_wrap=True)

    for tid, tr in run.tasks.items():
        icon = STATUS_ICON.get(tr.status, "")
        style = STATUS_STYLE.get(tr.status, "")

        duration = ""
        if tr.started_at:
            end = tr.finished_at or datetime.now(timezone.utc)
            secs = (end - tr.started_at).total_seconds()
            duration = f"{int(secs // 60)}m{int(secs % 60):02d}s"

        last = tr.last_lines[-1] if tr.last_lines else (tr.error or "")
        if len(last) > 80:
            last = last[:77] + "..."

        table.add_row(
            tid,
            Text(f"{icon} {tr.status.value}", style=style),
            tr.agent.name if tr.agent else "",
            str(tr.pid or ""),
            duration,
            last,
        )

    return table


def build_panel(run: Run) -> Panel:
    elapsed = ""
    if run.started_at:
        end = run.finished_at or datetime.now(timezone.utc)
        secs = (end - run.started_at).total_seconds()
        elapsed = f" | Elapsed: {int(secs // 60)}m{int(secs % 60):02d}s"

    subtitle = f"[{run.completed}/{run.total}] Running: {run.running} | Concurrency: {run.concurrency}{elapsed}"
    table = build_table(run)
    return Panel(table, subtitle=subtitle, border_style="blue")


class Monitor:
    """Wraps Rich Live display, updated via callback."""

    def __init__(self):
        self.console = Console()
        self.live: Live | None = None
        self._run: Run | None = None

    def start(self):
        self.live = Live(console=self.console, refresh_per_second=2)
        self.live.start()

    def stop(self):
        if self.live:
            self.live.stop()

    def update(self, run: Run):
        self._run = run
        if self.live:
            self.live.update(build_panel(run))

    def print_summary(self, run: Run):
        self.console.print()
        self.console.print(build_panel(run))
        self.console.print()
        success = sum(1 for t in run.tasks.values() if t.status == TaskStatus.SUCCESS)
        failed = sum(1 for t in run.tasks.values() if t.status == TaskStatus.FAILED)
        blocked = sum(1 for t in run.tasks.values() if t.status == TaskStatus.BLOCKED)
        skipped = sum(1 for t in run.tasks.values() if t.status == TaskStatus.SKIPPED)
        self.console.print(f"[bold]Done![/bold] ✅ {success} succeeded, ❌ {failed} failed, 🚧 {blocked} blocked, ⏭️  {skipped} skipped")
