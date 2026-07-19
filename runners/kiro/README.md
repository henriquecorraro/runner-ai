# Kiro Parallel Runner

Runs ecosystem tasks in parallel using `kiro-cli chat` with one process per task.

## Requirements

- Python 3.11+
- `kiro-cli` installed and in PATH
- `pip install -r requirements.txt`

## Usage

```bash
# Run specific tasks
python -m runners.kiro --config ecosystems/liguelead-platform/ecosystem.config.json --task 66-credit-purchase-payment-ui --task 67-credit-payment-reconciliation

# Run all open tasks
python -m runners.kiro --config ecosystems/liguelead-platform/ecosystem.config.json --open-tasks

# Run a scope
python -m runners.kiro --config ecosystems/liguelead-platform/ecosystem.config.json --scope credit-card-payments

# Dry run (resolve only, don't execute)
python -m runners.kiro --config ecosystems/liguelead-platform/ecosystem.config.json --open-tasks --dry-run

# Limit concurrency
python -m runners.kiro --config ecosystems/liguelead-platform/ecosystem.config.json --open-tasks --concurrency 4
```

Run from the ws-runner root directory.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KIRO_CLI` | `kiro-cli` | Path to kiro CLI binary |
| `KIRO_MODEL` | (empty = default) | Model to use (e.g. `claude-opus-4`) |
| `KIRO_EFFORT` | `max` | Effort level: low, medium, high, xhigh, max |

## Output

Each task generates artifacts in `runs/{runId}/{NN}-{task-slug}/`:
- `prompt.md` — Full prompt sent to kiro
- `kiro.log` — Streaming output from kiro-cli
- `output.md` — Mandatory output file (written by kiro)
- `metadata.json` — Run metadata (compatible with codex runner)
- `summary.json` — Compact run summary
- `tasks/` — Snapshot of task .md file at execution time

## Architecture

```
__main__.py   → CLI arg parsing, task resolution
runner.py     → Async orchestrator (dependency DAG + concurrency pool)
worker.py     → Spawns kiro-cli subprocess per task
monitor.py    → Rich live TUI (table with status/PID/duration/output)
config.py     → Ecosystem config + frontmatter parser
models.py     → Dataclasses (Run, TaskRun, TaskDef, etc.)
```

## Features

- Parallel execution (1 process per CPU core by default)
- Dependency resolution (`depends_on` in task frontmatter)
- Tasks with failed dependencies are auto-skipped
- Live TUI with per-task status, PID, duration, last output line
- Full run history compatible with existing ecosystem runner format
- Fallback output.md generated when kiro fails to produce one
