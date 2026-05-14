# How To Use This Runner

This file is the operating guide for any AI agent that is asked to work in this repository after it has been cloned.

If you are Codex, Claude Code, or another coding agent: read this file first, then follow the workflow below. Do not treat this repository as a normal single-app codebase. It is a centralized runner for managing tasks across one or more local repositories.

## What This Project Does

This project manages centralized ecosystem work.

An ecosystem is a group of local repositories that belong to the same product or platform. The runner stores:

- ecosystem configuration
- centralized SDD task files
- execution history
- reusable AI skills

The target repositories remain the source of code and human-facing product/module documentation.

Typical structure:

```text
ecosystem-ai-runner/
  bin/
  docs/
  skills/
  ecosystems/
    <ecosystem-name>/
      ecosystem.config.json
      sdd/
        README.md
        tasks/
      skills/
      runs/
```

## Required Workflow

Follow this pipeline in order:

1. Create or identify the ecosystem.
2. Create centralized tasks for that ecosystem.
3. Execute tasks.
4. Developer and AI validate the result together.
5. Close tasks only after validation.

Do not skip directly to closing tasks. A task should be marked `done` only after the developer confirms the delivered behavior is correct and the stable docs match the implementation.

## Preferred Agent Interface

Prefer MCP when the active AI client supports it. The developer should be able
to speak naturally in chat while the agent calls runner tools behind the scenes.

Start the MCP server with:

```bash
npm run mcp
```

MCP does not mean "always run the isolated runner." The default is:

- plan, inspect, and execute selected tasks in the current chat/agent
- resolve "essas tasks", "as tasks", or "pode fazer" against tasks created, changed, loaded, or discussed in the current conversation
- use the isolated runner only when the user explicitly asks for it or confirms it for a large scope/open-task batch
- mark `done` only after developer validation

## Codex Plugin

This repo includes a local Codex plugin wrapper at:

```text
plugins/ecosystem-ai-runner/
```

Register its marketplace from the repo root or with an absolute path:

```bash
codex plugin marketplace add /home/rick/projetos/ecosystem-ai-runner
```

If the plugin UI is not managing MCP activation, register the MCP directly:

```bash
codex mcp add ecosystem-ai-runner -- node /home/rick/projetos/ecosystem-ai-runner/bin/ecosystem-ai-mcp.js
```

## Install Or Link Skills

The skills in `skills/` are part of the workflow. Link them into the active AI tool before using the project repeatedly.

Required generic skills:

- `ecosystem-operating-mode`
- `ecosystem-bootstrap`
- `ecosystem-task-factory`
- `ecosystem-task-executor`
- `ecosystem-task-closer`
- `codex-direct-mode`

### Codex

Codex reads local skills from:

```text
~/.codex/skills/
```

From the repository root:

```bash
mkdir -p "$HOME/.codex/skills"

ln -sfn "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.codex/skills/ecosystem-bootstrap"

ln -sfn "$PWD/skills/ecosystem-operating-mode" \
  "$HOME/.codex/skills/ecosystem-operating-mode"

ln -sfn "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.codex/skills/ecosystem-task-factory"

ln -sfn "$PWD/skills/ecosystem-task-executor" \
  "$HOME/.codex/skills/ecosystem-task-executor"

ln -sfn "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.codex/skills/ecosystem-task-closer"

ln -sfn "$PWD/skills/codex-direct-mode" \
  "$HOME/.codex/skills/codex-direct-mode"
```

### Claude Code

Claude Code can read skills from personal or project skill directories.

Personal skills:

```text
~/.claude/skills/
```

Project skills:

```text
.claude/skills/
```

For personal skills, from the repository root:

```bash
mkdir -p "$HOME/.claude/skills"

ln -sfn "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.claude/skills/ecosystem-bootstrap"

ln -sfn "$PWD/skills/ecosystem-operating-mode" \
  "$HOME/.claude/skills/ecosystem-operating-mode"

ln -sfn "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.claude/skills/ecosystem-task-factory"

ln -sfn "$PWD/skills/ecosystem-task-executor" \
  "$HOME/.claude/skills/ecosystem-task-executor"

ln -sfn "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.claude/skills/ecosystem-task-closer"

ln -sfn "$PWD/skills/codex-direct-mode" \
  "$HOME/.claude/skills/codex-direct-mode"
```

For project skills:

```bash
mkdir -p .claude/skills

ln -sfn "$PWD/skills/ecosystem-bootstrap" \
  ".claude/skills/ecosystem-bootstrap"

ln -sfn "$PWD/skills/ecosystem-operating-mode" \
  ".claude/skills/ecosystem-operating-mode"

ln -sfn "$PWD/skills/ecosystem-task-factory" \
  ".claude/skills/ecosystem-task-factory"

ln -sfn "$PWD/skills/ecosystem-task-executor" \
  ".claude/skills/ecosystem-task-executor"

ln -sfn "$PWD/skills/ecosystem-task-closer" \
  ".claude/skills/ecosystem-task-closer"

ln -sfn "$PWD/skills/codex-direct-mode" \
  ".claude/skills/codex-direct-mode"
```

If the active AI tool does not support skills, read the relevant `SKILL.md` files manually and follow them as operating instructions.

## Step 1: Create Or Identify An Ecosystem

Use `ecosystem-bootstrap` when the user wants to create a new ecosystem from local repositories.

Example prompt:

```text
Use the `ecosystem-bootstrap` skill.
Create a new ecosystem called billing-platform using /path/to/api-billing and /path/to/front-billing.
Read the READMEs, identify validation commands, and generate the centralized ecosystem structure in the runner.
Do not create tasks yet.
```

Expected result:

```text
ecosystems/billing-platform/
  ecosystem.config.json
  sdd/
    README.md
    tasks/
  skills/
  runs/
```

If the user asks to execute or create tasks but does not name an ecosystem, discover available ecosystems with:

```bash
find ecosystems -maxdepth 2 -name ecosystem.config.json -print
```

Then ask the user to choose using the discovered names. Do not infer the ecosystem from open editor tabs.

## Step 2: Create Centralized Tasks

Use `ecosystem-task-factory` after the ecosystem exists.

This skill creates or updates files under:

```text
ecosystems/<name>/sdd/tasks/
```

Prompt example:

```text
Use the `ecosystem-task-factory` skill.
For the billing-platform ecosystem, analyze the invoice flow and create the initial tasks.
Group related backend and frontend work under the scope `invoice-crud`.
Split tasks when backend and frontend have separate responsibilities.
```

Task files must start with YAML frontmatter:

```md
---
id: invoice-crud-backend
title: Invoice CRUD Backend
scope: invoice-crud
status: open
repositories:
  - backend
validation:
  - npm run typecheck
docs_targets:
  - backend:docs/human/modules/invoices.md
depends_on:
  - another-task-id
---
```

Supported statuses:

- `open`: ready to execute
- `implemented`: code exists but still needs developer validation or final docs consolidation
- `needs-rework`: previous attempt missed expectations or needs another pass
- `done`: implementation, validation, and stable docs are aligned

## Step 3: Execute Tasks

Use `ecosystem-task-executor`.

The executor requires:

- explicit ecosystem
- explicit task selection
- explicit execution mode

Valid task selections:

- one task: `--task <task-id-or-path>`
- one task by fragment: `--feature <fragment>`
- one scope: `--scope <scope-id>`
- all actionable tasks in one batch: `--open-tasks`
- actionable tasks grouped by scope: `--open-scopes`

Execution modes:

- current chat session
- runner from the current chat

The current chat usually uses fewer tokens because it continues in the existing session. The runner creates history and isolates execution, but costs more tokens because it starts another agent session with a generated prompt and logs.

If the user chooses runner execution, the safest pattern is for the AI in the current chat to run the runner. The AI should dry-run first, monitor output, inspect generated history, and summarize failures.

Prompt examples:

```text
Use the `ecosystem-task-executor` skill.
Execute the task `invoice-crud-backend` in ecosystem billing-platform in this chat.
```

```text
Use the `ecosystem-task-executor` skill.
Execute scope `invoice-crud` in ecosystem billing-platform via runner from this chat.
```

Runner commands:

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --task invoice-crud-backend --dry-run
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --task invoice-crud-backend
```

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --scope invoice-crud --dry-run
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --scope invoice-crud
```

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-tasks --dry-run
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-tasks
```

The runner writes history to:

```text
ecosystems/<name>/runs/<run-id>/<batch>/
```

Each batch contains:

- `prompt.md`
- `output.md`
- `<agent>.log`
- `metadata.json`
- `summary.json`
- `tasks/`

## Step 4: Validate With The Developer

After execution, the AI should summarize:

- tasks executed
- repositories changed
- validation commands run
- docs changed
- gaps or risks
- run history path when runner was used

The developer and AI then validate the result together.

If the implementation is close but not confirmed, keep or move the task to `implemented`.

If the implementation missed expectations, move the task to `needs-rework` and record the concrete gap in the task or execution output.

Do not mark a task `done` during this step.

## Step 5: Close Tasks

Use `ecosystem-task-closer` only after the developer confirms the result is correct.

Prompt example:

```text
Use the `ecosystem-task-closer` skill.
The task `invoice-crud-backend` in ecosystem billing-platform has been validated.
Mark it as done, update the stable repository documentation, and update the ecosystem Task Status.
```

The closer should:

- update final human docs in the owning repository
- set the task status to `done`
- update `ecosystems/<name>/sdd/README.md`
- run the narrowest useful validation
- summarize docs updated, validation, and residual risk

## Runner Command Reference

Run one task:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <task-id>
```

Run one task by fragment:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --feature <fragment>
```

Run one scope:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --scope <scope-id>
```

Run all actionable tasks in one batch:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-tasks
```

Run actionable tasks grouped by scope:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-scopes
```

Dry-run any mode:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-scopes --dry-run
```

Choose a non-default agent:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <task-id> --agent claude-code
```

## AI Safety Rules

- Read this file before acting.
- Use the matching skill for the current workflow stage.
- Require an explicit ecosystem before creating, executing, or closing tasks.
- Prefer listing discovered ecosystems when the user forgot to name one.
- Do not execute all open tasks unless the user explicitly asks for `open-tasks` or `open-scopes`.
- Run `--dry-run` before real runner execution.
- Do not mark tasks `done` until developer validation is explicit.
- Keep human-facing docs in the owning repository, not in this runner.
- Do not revert unrelated user changes in any repository.
- Keep execution summaries short and operational.

## Normal End-To-End Conversation

1. User asks the AI to read this project.
2. AI reads `HOWTOUSE.md`.
3. AI links or reads the skills for the active tool.
4. User asks to create an ecosystem.
5. AI uses `ecosystem-bootstrap`.
6. User asks to create tasks.
7. AI uses `ecosystem-task-factory`.
8. User asks to execute tasks.
9. AI uses `ecosystem-task-executor`.
10. Developer and AI validate the result.
11. User confirms the work is correct.
12. AI uses `ecosystem-task-closer`.

That sequence is the intended operating model for this repository.
