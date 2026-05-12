# How To Use

This guide explains how to use the centralized ecosystem workflow in this repository with any compatible agent.

The goal is to let you:

- create a new ecosystem from one or more local repositories
- turn repository analysis into centralized tasks
- group related tasks by scope
- execute one task, one scope, or all actionable work through the runner
- handle rework without prematurely treating incomplete work as final
- mark work as `done` only when implementation, validation, and docs are aligned

## Concepts

### Ecosystem

An ecosystem is a group of local repositories that belong to the same product or platform.

Each ecosystem lives under:

```text
ecosystems/<name>/
```

Example:

```text
ecosystems/liguelead/
```

### Centralized SDD

The ecosystem SDD is centralized in this runner project, not inside the target repositories.

Main files:

```text
ecosystems/<name>/ecosystem.config.json
ecosystems/<name>/sdd/README.md
ecosystems/<name>/sdd/tasks/
```

Human-facing product, module, architecture, and business-rule docs stay in the repositories that own them. This runner stores tasks that ask for those docs to be created or updated.

### Task

A task is an executable unit of work stored in:

```text
ecosystems/<name>/sdd/tasks/
```

Each task declares:

- `id`
- `title`
- `scope`
- `status`
- `repositories`
- `validation`
- optional `docs_targets`
- optional `depends_on`

Use `docs_targets` for repository-local docs, in the format `repo-id:path/inside/repo.md`.

### Scope

A scope groups related tasks that belong to the same cross-repo change.

Examples:

- `invoice-crud`
- `broadcast-interaction-unique-key`
- `user-onboarding`

The runner can execute all tasks of a scope in one shared session.

### Task Status

Use these statuses:

- `open`: ready to start
- `implemented`: code exists, but the result should not yet be treated as fully consolidated
- `needs-rework`: a previous attempt did not fully meet expectations and must be revisited
- `done`: implementation, validation, and stable docs are aligned

The runner treats these as actionable:

- `open`
- `needs-rework`

## Skills

This project provides these generic skills:

- `ecosystem-bootstrap`
- `ecosystem-task-factory`
- `ecosystem-task-closer`
- `codex-direct-mode`

Some ecosystems may also provide ecosystem-specific skills under:

```text
ecosystems/<name>/skills/
```

### Making Skills Available To Codex

Codex reads local skills from:

```text
~/.codex/skills/
```

The recommended setup is to symlink the skill folders from this project into `~/.codex/skills`.

Example:

```bash
ln -s "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.codex/skills/ecosystem-bootstrap"

ln -s "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.codex/skills/ecosystem-task-factory"

ln -s "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.codex/skills/ecosystem-task-closer"

ln -s "$PWD/skills/codex-direct-mode" \
  "$HOME/.codex/skills/codex-direct-mode"
```

If an ecosystem has its own skills, link those too.

Example:

```bash
ln -s "$PWD/ecosystems/liguelead/skills/liguelead-direct-sdd" \
  "$HOME/.codex/skills/liguelead-direct-sdd"
```

## Step 1: Create A New Ecosystem

Use the bootstrap skill to inspect repositories and create the initial ecosystem structure only.

Prompt example:

```text
Use the `ecosystem-bootstrap` skill.
Create a new ecosystem called billing-platform using the repositories /path/to/api-billing and /path/to/front-billing.
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

The bootstrap can also score the selected repositories' human docs against a shared quality rubric and record the baseline in `sdd/README.md`.
If the docs are weak, it should suggest creating a docs-focused task as a next step, but it should not create that task automatically. When that task runs, generated docs should be written in the affected repositories.

## Step 2: Brainstorm And Create Tasks

Use the task factory skill to convert repository analysis into centralized tasks after the ecosystem environment already exists.

Prompt example:

```text
Use the `ecosystem-task-factory` skill.
For the billing-platform ecosystem, analyze the invoice flow and create the initial tasks.
Group related backend and frontend work under the scope `invoice-crud`.
Split tasks when backend and frontend have separate responsibilities.
```

This should create files under:

```text
ecosystems/billing-platform/sdd/tasks/
```

### Good Prompt Pattern For Brainstorm

If you want a more explicit planning phase first:

```text
Use the `ecosystem-task-factory` skill.
For the crm-core ecosystem, do a short brainstorm of the opportunity creation flow across the repositories, identify the boundaries, propose scopes, and then create the initial centralized tasks.
```

## Step 3: Review The Task Files

Open the generated files and confirm:

- the `scope` values make sense
- the `repositories` ownership is correct
- the task split is not too broad
- the validation commands are realistic

Example task:

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
  - npm test
docs_targets:
  - backend:docs/human/modules/invoices.md
---
```

## Step 4: Execute Work With The Runner

The runner accepts five main execution modes.

### Run One Task

```bash
cd /path/to/ecosystem-ai-runner
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --task invoice-crud-backend
```

### Run One Task By Fragment

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --feature invoice-crud-frontend
```

### Run One Scope

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --scope invoice-crud
```

### Run All Actionable Tasks

This runs every task with status:

- `open`
- `needs-rework`

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-tasks
```

### Run All Actionable Tasks Grouped By Scope

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-scopes
```

### Dry Run

Use this to validate resolution without invoking the model:

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-scopes --dry-run
```

## Step 5: Handle Rework Safely

Sometimes the implementation is incomplete or does not meet expectations.

Do not rush to `done`.

### Recommended Pattern

If code was produced but is not yet good enough to be treated as final:

- use `implemented` if it is close and mainly needs verification
- use `needs-rework` if the result missed expectations or needs another pass

### Example Prompt For Rework

```text
The task `invoice-crud-frontend` in ecosystem billing-platform did not fully meet expectations.
The form still does not validate dueDate and the list shows the wrong status label.
Update the task to `needs-rework`, adjust the task body if necessary, and re-run the task.
Do not consolidate final module documentation yet. Keep the output short and record the gaps.
```

Then re-run:

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --task invoice-crud-frontend
```

Or, if multiple tasks remain actionable:

```bash
npm run tasks -- --config ecosystems/billing-platform/ecosystem.config.json --open-tasks
```

## Step 6: Confirm The Result And Mark As Done

Only move a task to `done` when:

- the implementation matches expectations
- validation is aligned
- the stable repository docs reflect the real module behavior

### Example Prompt For Final Consolidation

```text
Use the `ecosystem-task-closer` skill.
The task `invoice-crud-frontend` in ecosystem billing-platform now meets expectations.
Mark it as `done`, update the stable module documentation in the affected repository, and record in the runner output which docs were updated.
Keep the execution summary short.
```

The closer skill is responsible for writing final human docs in the owning repository, updating the task frontmatter to `status: done`, and marking the task as complete in the ecosystem `sdd/README.md`.

## Lean Documentation Model

To keep token usage under control:

- every execution produces a short operational output
- incomplete work should not generate large final docs
- stable module docs should be updated only when the work is ready for `done`

### During Early Or Incomplete Attempts

Prefer:

- short summaries
- `Docs Updated: none` or a very small list
- explicit `Gaps`
- explicit `Needs Rework`

### During Final Consolidation

Update the actual repository docs only when the behavior is stable enough to be treated as the current truth.

## Expected Output Shape

The runner asks the model to generate a short operational file like:

```md
# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Batch: invoice-crud
- Repositories:
- Tasks:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:
```

This output is for execution history, not for long-form documentation.

## History

Each run is stored under:

```text
ecosystems/<name>/runs/<run-id>/<batch>/
```

Each batch folder contains:

- `prompt.md`
- `output.md`
- `<agent>.log`
- `metadata.json`
- `summary.json`
- `tasks/`

The `tasks/` folder stores snapshots of the task files used for that batch.

## Full Example

### 1. Create Ecosystem

```text
Use the `ecosystem-bootstrap` skill.
Create a new ecosystem called crm-core using /path/to/crm-api and /path/to/crm-front.
```

### 2. Brainstorm And Create Tasks

```text
Use the `ecosystem-task-factory` skill.
For crm-core, analyze the opportunity creation flow, propose scopes, and create the centralized tasks.
Group related work under `opportunity-create`.
```

### 3. Execute Scope

```bash
npm run tasks -- --config ecosystems/crm-core/ecosystem.config.json --scope opportunity-create
```

### 4. Request Rework

```text
The scope `opportunity-create` is not correct yet.
The backend is missing sourceId validation and the frontend does not display the API error state.
Update the affected tasks to `needs-rework` and re-run them.
Do not consolidate final docs yet.
```

### 5. Re-run

```bash
npm run tasks -- --config ecosystems/crm-core/ecosystem.config.json --open-tasks
```

### 6. Confirm As Done

```text
Now the result is correct.
Mark the affected tasks as `done`, update the repository docs that describe the final module behavior, and record the updated docs in the runner output.
```

## Works With Any Model

This setup is model-agnostic.

You can use it with:

- Codex
- Claude Code
- ChatGPT agents
- any compatible local or remote model that can follow the task files and write the required output

What matters is:

- the model can read the centralized ecosystem tasks
- the model can edit the target repositories
- the model can write the required output file for the runner

## Summary

The normal workflow is:

1. create ecosystem
2. brainstorm and create centralized tasks
3. group related work by scope
4. execute one task, one scope, or all actionable tasks
5. if needed, mark work as `implemented` or `needs-rework`
6. re-run only the actionable work
7. mark as `done` only when implementation, validation, and stable docs are aligned
