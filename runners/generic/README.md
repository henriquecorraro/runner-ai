# Generic Parallel Runner

Runs centralized workspace tasks in parallel by spawning the agent configured in
`workspace.config.json`. The scheduler and lifecycle remain vendor-neutral; Codex
has an optional native adapter for structured output and measured token usage.

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

# Opt-in shared session for related tasks
python3 -m runners.generic --config workspaces/<name>/workspace.config.json \
  --open-tasks --batch-related --batch-size 3
```

The public Node CLI is a compatibility wrapper for the same implementation:

```bash
npm run tasks -- --config workspaces/<name>/workspace.config.json --open-tasks
```

## Agent Contract

The runner resolves each task's `execution_agent`, the workspace default, or an
explicit `--agent` override, and executes:

```text
<command> <args...> [--model <model>] <prompt-instruction>
```

The command receives environment entries from the selected agent configuration.
The prompt instruction is always the last positional argument.

`execution_agent` is only an allowlisted workspace agent id; task files never
provide executable commands. Mixed-agent runs are supported. Replacing a task
pinned to a different agent requires `--agent ... --allow-agent-override`.

For `type: codex`, the runner instead uses Codex non-interactive mode with prompt
input on stdin, `--json`, `--output-schema`, and `--output-last-message`. It turns
the structured response into the same `output.md` contract used by generic agents.
This removes an extra prompt-file read/write tool loop and preserves generic
lifecycle compatibility.

## Execution Contract

- One subprocess is created per task by default. With related-task batching, ready
  tasks with identical repository sets share a subprocess and keep separate outputs.
  Batches additionally require the same resolved agent and model/reasoning tier.
- Dependencies must be selected in the same run or already have `done` status.
- Dependents wait for selected dependencies and are skipped after dependency failure.
- Tasks that reference the same repository are serialized to prevent concurrent checkout mutation.
- Agent exit code zero is accepted only when `output.md` passes the mandatory contract.
- Agent processes time out after `agents.<name>.timeoutSeconds` (default: 3600 seconds).
- Local task state and GitHub Project cards move together: `In Progress` on start, `Testing` on success, and `needs-rework`/`Todo` on failure.
- Run artifacts are written below the workspace `runs/<run-id>/` directory.
- Prompt, context, output, log, and cache estimates are stored in each summary.
  Codex summaries replace model-call estimates with measured usage and include the
  routing profile, reasoning effort, thread id, and resume decision.
- Every summary records requested/selected agent, routing policy, decision source,
  selected model, and any fallback reason.
- SQLite/FTS5 context cache is stored at workspace `cache/context.sqlite`.

## Package Structure

```text
__main__.py  CLI arguments and task selection
config.py    Workspace config and task frontmatter parsing
runner.py    Dependency-aware async orchestration
routing.py   Per-task agent resolution, allowlists, and override policy
worker.py    Generic agent subprocess execution
codex.py     Codex model routing, JSONL, structured output, and controlled resume
context_cache.py SQLite/FTS5 context selection and usage persistence
token_usage.py  Dependency-free token estimates
board.py     GitHub Project status updates
monitor.py   Live terminal monitor
models.py    Runtime dataclasses
```
