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
| **Runner** | Provides dependency-aware, repository-conflict-safe parallel agent execution when requested |
| **Plugin** | Packages the skill and MCP configuration for Codex or Claude Code |
| **Core libraries** | Enforce state transitions, atomic writes, schema validation, synchronization, and rollback |
| **GitHub Project** | Holds human-facing intent, issue links, progress, review state, and closeout information |

### Safe multi-repository orchestration

- Repositories remain focused on code and stable human documentation; workspace planning stays centralized here.
- Tasks declare repository ownership, validation commands, documentation targets, and dependencies.
- Task lifecycle gates prevent work from skipping implementation, review, or developer validation.
- GitHub task creation is all-or-fail, with cleanup of partially created issues or Project items on failure.
- Cross-repository branch creation rolls back earlier repositories if a later repository fails.
- Parallel tasks that share a repository are serialized; disjoint repositories can still run concurrently.
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
      "model": "claude-opus-4",
      "modelRoutes": [
        { "maxPromptTokens": 8000, "model": "claude-sonnet-4" }
      ],
      "timeoutSeconds": 3600
    },
    "codex": {
      "type": "codex",
      "command": "codex",
      "codex": {
        "sessionPolicy": "task",
        "resumeOnNeedsRework": true,
        "models": {
          "mechanical": "gpt-5.6-luna",
          "standard": "gpt-5.6-terra",
          "deep": "gpt-5.6-sol"
        },
        "reasoning": {
          "mechanical": "low",
          "standard": "medium",
          "deep": "high"
        }
      }
    },
    "claude-code": {
      "command": "claude",
      "args": ["-p"],
      "model": "configured-claude-model",
      "allowedModels": ["configured-claude-model", "lower-cost-claude-model"]
    }
  },
  "tokenPolicy": {
    "contextBudgetTokens": 4000,
    "reviewDiffBudgetTokens": 2000,
    "batchRelatedTasks": false,
    "batchSize": 3
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
- Generic agents can persist the current session model; the dedicated Codex adapter uses its task profile map instead
- Codex tasks route by `execution_profile`, `risk`, and `complexity` before using prompt-size `modelRoutes`
- Codex defaults to Luna/low for mechanical work, Terra/medium for standard work, and Sol/high for deep or critical work
- `preferred_model` and `reasoning_effort` in task frontmatter are explicit per-task overrides
- The Codex adapter uses JSONL, structured output, measured usage, and resumes only an unchanged `needs-rework` task thread
- `modelRoutes` remains the compatibility fallback when a task has no routing metadata
- `tokenPolicy` caps context/review payloads and optionally batches related tasks
- Other CLIs continue to use the generic prompt-as-last-argument contract

### Per-task agent routing

Tasks select an allowlisted workspace agent without embedding executable commands:

```yaml
execution_agent: codex
routing_policy: pinned
execution_profile: deep
preferred_model: gpt-5.6-sol
reasoning_effort: high
```

- `pinned` requires the declared agent and rejects unsupported models
- `preferred` uses the declared agent/model with configured fallback
- `portable` forbids agent/model pins and routes from profile, complexity, and risk
- `allowedModels`, `model`, `modelRoutes`, and Codex profile models form each agent's model allowlist
- `--agent` overrides preferred/portable routing; replacing a different pinned agent also requires `--allow-agent-override`
- related-task batches require the same resolved agent and routing tier

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

# Reuse one agent session for related tasks with identical repository sets
python3 -m runners.generic --config workspaces/<name>/workspace.config.json --open-tasks --batch-related --batch-size 3
```

Features:
- Dependency resolution: tasks wait for `dependsOn` to complete
- Failed deps → dependent tasks are skipped
- Repository conflicts → tasks sharing a checkout are serialized
- Output contract validation: exit code zero alone is not success
- Local lifecycle sync: `in-progress` on start, `implemented/testing` on success, `needs-rework` on failure
- Board sync: In Progress on start, Testing on success, Todo on failure
- Any agent from workspace config (generic spawner)
- Optional related-task batching and prompt-size model routing
- Estimated token telemetry in `summary.json` and SQLite

## MCP Server

```bash
npm run mcp
# or: node bin/ws-runner-mcp.js
```

Key tools:
- `create_workspace` — auto-detects agent + model, requires GitHub Project decision
- `create_task` — all-or-fail GitHub sync, accepts `intent` (card-only) and `context` (snapshot)
- `get_task` — returns task + budgeted cached context and a thin manifest
- `get_task_diff` — paginates review diffs instead of returning an unbounded patch
- `get_token_usage` — aggregates estimated prompt/output/cache usage
- `compact_task_context` — moves a snapshot to the content store and leaves a thin manifest
- `start_task_execution` / `finish_task_execution` — lifecycle gates with review loop
- `run_parallel` — spawns Python async runner with workspace agent config
- `set_task_status` — state machine enforced, PR handoff on close
- `reconcile_workspace` — bidirectional drift detection GitHub↔local

## Determinism Guarantees

- Atomic writes (rename pattern) — no corruption on crash
- Workspace lock + task-id uniqueness + O_EXCL task creation
- State machine — invalid transitions rejected
- Cross-repo branch rollback — only branches created by the current operation can be deleted
- Lifecycle gates — local execution state makes finish independent from GitHub availability
- Shared schema validation — Node and Python reject the same malformed frontmatter
- Runner contract — timeout, structured output, and board sync must all succeed
- Active tasks persisted to disk — survives MCP restart

## Token Economy

The runner uses a local SQLite/FTS5 cache at `workspaces/<name>/cache/context.sqlite`.
Context units are keyed by content, analyzer version, and repository HEADs; changed
snapshots or commits are re-indexed without TTL. The database also stores compact
policy capsules and estimated per-run usage. Values are estimates because generic
agent CLIs do not expose one portable billing-token contract.

The main savings are deterministic:

- task specifications appear once per prompt, even for multiple repositories
- context is selected with FTS5 and capped by `contextBudgetTokens`
- review responses contain manifests/previews; full patches use `get_task_diff` pages
- related ready tasks can share one agent process and one fixed policy prompt
- configured `modelRoutes` can select a cheaper model for smaller prompts

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
