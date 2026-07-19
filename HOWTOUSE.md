# How To Use ws-runner

Operating guide for AI agents. Read this before acting.

> This is NOT a single-app codebase. It is a centralized runner for managing tasks across multiple repositories.

## Quick Reference

| Stage | Tool / Skill | What it does |
|-------|-------------|--------------|
| 1 | `create_workspace` | Create workspace (auto-detects agent + model) |
| 2 | `create_task` | Create task with body + context + intent |
| 3 | `start_task_execution` | Create branch, move card to In Progress |
| 4 | Implement | Agent executes the task spec |
| 5 | `finish_task_execution` | Review loop → move to Testing |
| 6 | Developer validates | Human confirms result |
| 7 | `set_task_status(done)` | Close with PR handoff |

## Rules

- **English first** for all SDD artifacts (task files, titles, body, frontmatter)
- **Current chat is the default** execution context
- **Never mark `done`** until the developer confirms
- **State machine enforced**: open → implemented → done (no skipping)
- **Tasks are for agents**: declarative, structured, zero prose
- **Intent is for humans**: goes only to GitHub card
- **Context snapshots** cache knowledge for executors

## Task File Format

```yaml
---
id: billing-retry
title: Billing Retry with Idempotency
scope: billing
status: open
repositories:
  - platform-api
validation:
  - npm test
depends_on:
  - billing-schema-migration
base_branch: main
---

## Requirements
- Add retry with exponential backoff to processPayment()
- Check idempotency_key before each retry attempt
- Max 3 retries, initial delay 1000ms

## Constraints
- Do not modify existing payment success flow
- Return 409 if idempotency_key already processed
```

## Context Snapshot (.context.md)

Created alongside the task to pre-load knowledge for the executor:

```markdown
# Execution Context: billing-retry

> Pre-computed context — read before implementing.

## Cached Knowledge

### billing.js (line 45-60)
- `processPayment({amount, idempotencyKey})` calls gateway.charge()
- Gateway returns 502 in ~3% of calls
- No retry logic exists today

### payments table
- Has `retry_count` column (unused)
- Has `idempotency_key` column (unique index)

### Pitfalls
- Gateway 502 does NOT mean payment failed — must verify before retry
```

## Three Layers

| Layer | Where | Who reads | What |
|-------|-------|-----------|------|
| body | `.md` frontmatter | Executor agent | WHAT to do (specs) |
| context | `.context.md` | Executor agent | Knowledge cache (saves tokens) |
| intent | GitHub card | Humans | WHY (reasoning, conversation summary) |

## MCP Tools

```
get_operating_context    — rules and workspace state
create_workspace         — deterministic, auto-detects agent/model
create_task              — all-or-fail GitHub sync, body + intent + context
get_task                 — returns task + execution context
start_task_execution     — branch + In Progress
finish_task_execution    — review loop → Testing
set_task_status          — state machine enforced
run_parallel             — Python async runner, any agent
reconcile_workspace      — detect/fix drift GitHub↔local
```

## Parallel Runner

The Python runner at `runners/kiro/` is agent-agnostic:

```bash
python3 -m runners.kiro --config workspaces/<name>/workspace.config.json --open-tasks
```

It reads `agents[defaultAgent]` from workspace config and spawns:
```
<command> <args...> [--model <model>] <prompt>
```

Features:
- Dependency resolution (waits for `dependsOn`)
- Failed deps → skip dependent tasks
- Board sync: In Progress → Testing
- Live TUI monitor (Rich)
- Logs per task in `runs/<run-id>/`

## Agent Auto-Detection

On `create_workspace`, the runner detects:
1. Which agent is invoking (via env vars or /proc/ppid)
2. Which model is active (via KIRO_MODEL, ANTHROPIC_MODEL, etc)

Both are persisted in `workspace.config.json`. Override with explicit `defaultAgent` param.

## Determinism

- Atomic writes (rename pattern)
- O_EXCL idempotent creation
- State machine transitions
- Cross-repo branch rollback
- Lifecycle gates (start → finish)
- Schema validation
- Active tasks persisted to disk
