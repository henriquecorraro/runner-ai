# ws-runner

Generic parallel runner for AI agent execution across multi-repository workspaces.

The runner is agent-agnostic: it reads the agent command from `workspace.config.json` and spawns any CLI (kiro-cli, codex, claude, or custom). Each workspace lives under `workspaces/<name>/` and owns its own config, centralized SDD, local skills, and execution history.

If you are an AI agent reading this repository after clone, read [HOWTOUSE.md](HOWTOUSE.md) first.

## Structure

```text
ws-runner/
  bin/
    ws-runner.js          # CLI runner
    ws-runner-mcp.js      # MCP server
  lib/                    # Core modules
  runners/generic/        # Generic Python async runner
  skills/                 # Shared agent skills
  workspaces/
    <name>/
      workspace.config.json
      sdd/tasks/
      skills/
      runs/
```

## Core Idea

- Repositories stay focused on code; workspace planning stays centralized here
- Tasks are machine-readable specs for AI agents (zero prose, declarative)
- GitHub cards hold human-readable context (intent, WHY)
- Context snapshots (`.context.md`) cache knowledge for executor agents
- The runner detects which agent is calling and configures itself accordingly
- Work follows: create workspace → create tasks → execute → validate → close

## Workspace Config

```json
{
  "name": "my-workspace",
  "defaultAgent": "kiro",
  "agents": {
    "kiro": {
      "type": "kiro",
      "command": "kiro-cli",
      "args": ["chat", "--no-interactive", "--trust-all-tools"],
      "model": "claude-opus-4"
    },
    "codex": {
      "command": "codex",
      "args": ["exec", "--ephemeral"]
    },
    "claude-code": {
      "command": "claude",
      "args": ["-p"]
    }
  },
  "githubProject": {
    "url": "https://github.com/orgs/<org>/projects/<number>"
  },
  "repositories": [
    { "id": "backend", "path": "../../backend", "validation": ["npm test"] }
  ]
}
```

Key points:
- `defaultAgent` is auto-detected from the invoking LLM at workspace creation
- `model` is persisted from the current session's model
- Any CLI that accepts a prompt as last argument works as an agent

## Task Lifecycle

```
open → implemented → done
  ↕         ↓
needs-rework
```

Invalid transitions are rejected (e.g., `open → done` is blocked).

## Three Layers Per Task

| Layer | File | Content | Audience |
|-------|------|---------|----------|
| **body** | `sdd/tasks/XX-task.md` | Declarative specs (zero prose) | Executor agent |
| **context** | `sdd/tasks/XX-task.context.md` | Pre-computed knowledge snapshot | Executor agent |
| **intent** | GitHub card only | WHY, reasoning, conversation summary | Humans |

## Parallel Execution

```bash
# Via the generic Python runner
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --open-tasks

# With agent override
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --scope billing --agent codex

# Dry run
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --open-tasks --dry-run
```

Features:
- Dependency resolution: tasks wait for `dependsOn` to complete
- Failed deps → dependent tasks are skipped
- Board sync: In Progress on start, Testing on success
- Any agent from workspace config (generic spawner)

## MCP Server

```bash
npm run mcp
# or: node bin/ws-runner-mcp.js
```

Key tools:
- `create_workspace` — auto-detects agent + model, requires GitHub Project decision
- `create_task` — all-or-fail GitHub sync, accepts `intent` (card-only) and `context` (snapshot)
- `get_task` — returns task + execution context if `.context.md` exists
- `start_task_execution` / `finish_task_execution` — lifecycle gates with review loop
- `run_parallel` — spawns Python async runner with workspace agent config
- `set_task_status` — state machine enforced, PR handoff on close
- `reconcile_workspace` — bidirectional drift detection GitHub↔local

## Determinism Guarantees

- Atomic writes (rename pattern) — no corruption on crash
- O_EXCL task creation — race-condition proof
- State machine — invalid transitions rejected
- Cross-repo branch rollback — if branch fails in repo N, repos 1..N-1 reverted
- Lifecycle gates — finish requires start
- Schema validation — unknown/missing frontmatter fields rejected
- Active tasks persisted to disk — survives MCP restart

## Testing

```bash
npm run check   # Syntax validation
npm test        # Node determinism tests + generic runner tests
```

## Registration

```bash
# Kiro
kiro mcp add ws-runner -- node /path/to/ws-runner/bin/ws-runner-mcp.js

# Codex
codex mcp add ws-runner -- node /path/to/ws-runner/bin/ws-runner-mcp.js

# Claude Code
claude mcp add ws-runner -- node /path/to/ws-runner/bin/ws-runner-mcp.js
```
