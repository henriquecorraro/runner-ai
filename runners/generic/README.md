# Generic Parallel Runner

Runs centralized workspace tasks in parallel by spawning the agent configured in
`workspace.config.json`. The runner has no built-in dependency on Codex, Claude,
Kiro, or another vendor-specific CLI.

## Requirements

- Python 3.11+
- The workspace agent command installed and available in `PATH`
- `pip install -r runners/generic/requirements.txt`

## Usage

Run from the `ws-runner` repository root:

```bash
# Specific tasks
python3 -m runners.generic --config workspaces/<name>/workspace.config.json \
  --task task-one --task task-two

# Unique id, filename, or title fragment
python3 -m runners.generic --config workspaces/<name>/workspace.config.json \
  --feature payment-reconciliation

# Scope or every actionable task
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --scope billing
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --open-tasks

# Agent override, concurrency, and dry run
python3 -m runners.generic --config workspaces/<name>/workspace.config.json \
  --open-tasks --agent codex --concurrency 4 --dry-run
```

The public Node CLI is a compatibility wrapper for the same implementation:

```bash
npm run tasks -- --config workspaces/<name>/workspace.config.json --open-tasks
```

## Agent Contract

The runner resolves `agents[defaultAgent]`, or the agent selected with
`--agent`, and executes:

```text
<command> <args...> [--model <model>] <prompt-instruction>
```

The command receives environment entries from the selected agent configuration.
The prompt instruction is always the last positional argument.

## Execution Contract

- One subprocess is created per selected task.
- Dependencies must be selected in the same run or already have `done` status.
- Dependents wait for selected dependencies and are skipped after dependency failure.
- GitHub Project cards move to `In Progress` on start and `Testing` on success.
- Run artifacts are written below the workspace `runs/<run-id>/` directory.

## Package Structure

```text
__main__.py  CLI arguments and task selection
config.py    Workspace config and task frontmatter parsing
runner.py    Dependency-aware async orchestration
worker.py    Generic agent subprocess execution
board.py     GitHub Project status updates
monitor.py   Live terminal monitor
models.py    Runtime dataclasses
```
