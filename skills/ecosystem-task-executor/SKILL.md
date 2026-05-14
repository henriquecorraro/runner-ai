---
name: ecosystem-task-executor
description: "Execute centralized ecosystem tasks from ecosystem-ai-runner. Use when the user wants to run, execute, re-run, or implement tasks for a specific ecosystem, either in the current chat session or by asking the AI to run the ecosystem runner."
---

# Ecosystem Task Executor

## Overview

Use this skill when the user wants to execute centralized tasks under `ecosystems/<name>/sdd/tasks/`.

The target ecosystem is mandatory. Execution in the current chat is the default when the user refers to tasks already created, changed, or discussed in this conversation. Runner execution requires an explicit user choice.

## Trigger Phrases

Use this skill for requests like:

- "execute a task do ecossistema X"
- "rode o scope X"
- "re-run open tasks"
- "implemente essa task"
- "executa pelo runner"
- "executa nessa conversa"

## Required Inputs

Before executing, identify:

- ecosystem name
- task selection mode
- execution mode

Valid task selection modes mirror the runner:

- `--task <task-id-or-path>`
- `--feature <task-name-fragment>`
- `--scope <scope-id>`
- `--open-tasks`
- `--open-scopes`

## Ecosystem Selection

The user must explicitly choose an ecosystem.

If the user does not name one:

1. Discover available ecosystems by finding `ecosystems/*/ecosystem.config.json`.
2. Ask which ecosystem to use and include the discovered names.
3. Stop until the user answers.

If no ecosystems exist, tell the user to create one with `ecosystem-bootstrap`.

Do not infer the ecosystem from the active editor tab or from recently opened files.

## Execution Mode Selection

Use the current chat session by default when:

- the user says "pode fazer as tasks", "faz essas tasks", "implemente essa task", or another contextual reference to tasks from this conversation
- the task set is small enough to execute in the existing context
- the user did not explicitly ask for runner isolation

Ask whether to use the runner only when the request is ambiguous and the work appears large, such as a broad scope, many tasks, or open-tasks/open-scopes execution.

Make the token tradeoff explicit when asking:

- Current chat usually has lower token overhead because it continues in the existing session.
- Runner creates run history and isolates execution, but consumes more tokens because it starts another agent session with a generated prompt, re-reads context, and writes logs.

When the user chooses runner, prefer running the runner from the current AI chat. This is safer than asking the user to run shell commands manually because the AI can validate resolution with `--dry-run`, monitor output, inspect the generated history, and summarize failures.

## Current Chat Workflow

Use this when the user chooses current chat execution.

1. Read:
   - `ecosystems/<name>/ecosystem.config.json`
   - `ecosystems/<name>/sdd/README.md`
   - selected task files under `ecosystems/<name>/sdd/tasks/`
2. Resolve repository ownership from task frontmatter.
3. Inspect only the relevant repository files and docs.
4. Implement the requested task work directly in the current conversation.
5. Run the narrowest useful validation in each touched repository.
6. If implementation was delivered but not user-validated, update task status to `implemented`, not `done`.
7. If work is blocked or incomplete, leave or move the task to `needs-rework` and record the concrete gap.
8. Keep final output short: tasks executed, files changed, validation, and residual gaps.

Do not mark tasks as `done`; use `ecosystem-task-closer` only after the user confirms the result is correct.

## Runner Via Chat Workflow

Use this when the user chooses runner execution.

1. Resolve the ecosystem config path:
   - `ecosystems/<name>/ecosystem.config.json`
2. Build the runner command using the selected mode.
3. Run the same command first with `--dry-run`.
4. If dry-run fails, report the error and do not run the real execution.
5. If dry-run succeeds, run the real command from this chat.
6. After the runner finishes, inspect the generated run history:
   - `output.md`
   - `summary.json`
   - relevant log only if status failed or blocked
7. Summarize status, tasks, validation, docs updates, gaps, token usage when available, and history path.

Example commands:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <task-id> --dry-run
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <task-id>
```

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --scope <scope-id> --dry-run
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --scope <scope-id>
```

## Safety Rules

- Never run the runner without an explicit ecosystem.
- Never run the runner silently when the user only asked to execute a task and did not choose mode.
- Do not execute every open task unless the user explicitly chooses `open-tasks` or `open-scopes`.
- Do not revert unrelated user changes.
- Prefer dry-run before every real runner execution.
- Keep repo-local human docs in the owning repository, not in this runner.
- Use `implemented` for delivered work that still needs user validation.
- Reserve `done` for `ecosystem-task-closer` after explicit user confirmation.

## User Question Templates

When ecosystem is missing:

```text
Qual ecosystem devo usar? Encontrei: `<name-a>`, `<name-b>`.
```

When execution mode is missing:

```text
Como deseja executar: na conversa atual ou via runner a partir deste chat? O runner cria histórico e isola a execução, mas consome mais tokens porque inicia outra sessão com prompt próprio.
```

When task selection is missing:

```text
Qual seleção devo executar: uma task, um feature fragment, um scope, open-tasks ou open-scopes?
```
