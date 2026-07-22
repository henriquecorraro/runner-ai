# ws-runner

Generic parallel runner for AI agent execution across multi-repository workspaces.

The runner is agent-agnostic: it reads the agent command from `workspace.config.json` and spawns any CLI (kiro-cli, codex, claude, or custom). Each workspace lives under `workspaces/<name>/` and owns its own config, centralized SDD, local skills, and execution history.

If you are an AI agent reading this repository after clone, read [HOWTOUSE.md](HOWTOUSE.md) first.

## Why ws-runner

Most AI-agent workflows repeatedly pay for context that was already discovered: the agent re-reads repositories, reconstructs decisions, and starts isolated sessions even when the current conversation already contains what it needs. `ws-runner` treats context as a reusable workspace artifact and puts explicit gates around when new agent processes are created.

### Token-efficient by design

- **Current chat first** — tasks are executed in the conversation that planned them by default, reusing the existing brainstorm and repository analysis.
- **Isolated execution is opt-in** — the runner starts another agent session only when the user explicitly chooses isolation or parallel execution.
- **Context snapshots** — `.context.md` files cache relevant code knowledge, contracts, decisions, and pitfalls so executor agents do not rediscover them from scratch.
- **Machine-oriented task bodies** — local task files contain terse, declarative implementation specs instead of narrative context.
- **Human intent stays separate** — the WHY and decision history live on the GitHub card, while agents receive only the execution material they need.
- **Scoped prompts and short outputs** — each run targets declared repositories and produces a compact operational summary plus task snapshots.

### Clear responsibility boundaries

| Building block | Responsibility |
|----------------|----------------|
| **Skill** | Teaches the agent the operating policy and routes it to the correct workflow |
| **MCP server** | Exposes typed tools for workspace, task, lifecycle, GitHub, and runner operations |
| **Centralized SDD** | Stores the persistent, machine-readable task queue outside application repositories |
| **Context snapshot** | Preserves pre-computed execution knowledge for later agents or sessions |
| **Runner** | Provides isolated, dependency-aware, parallel agent execution when requested |
| **Plugin** | Packages the skill and MCP configuration for Codex or Claude Code |
| **Core libraries** | Enforce state transitions, atomic writes, schema validation, synchronization, and rollback |
| **GitHub Project** | Holds human-facing intent, issue links, progress, review state, and closeout information |

### Safe multi-repository orchestration

- Repositories remain focused on code and stable human documentation; workspace planning stays centralized here.
- Tasks declare repository ownership, validation commands, documentation targets, and dependencies.
- Task lifecycle gates prevent work from skipping implementation, review, or developer validation.
- GitHub task creation is all-or-fail, with cleanup of partially created issues or Project items on failure.
- Cross-repository branch creation rolls back earlier repositories if a later repository fails.
- Active task memory and run history survive MCP or agent-session boundaries.

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

## Workflow

```text
create workspace → plan tasks → execute → review → developer validation → close
```

The runner detects the invoking agent and model when a workspace is created. From there, work can remain in the current chat to reuse context or move to the isolated runner when explicit execution history, parallelism, or context separation is valuable.

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
