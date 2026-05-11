# Ecosystem AI Runner Usage

The runner executes centralized ecosystem tasks stored inside this project.

It no longer depends on `docs/sdd` inside the target repositories.

## Ecosystem Layout

Each ecosystem should look like this:

```text
ecosystems/<name>/
  ecosystem.config.json
  sdd/
    README.md
    tasks/
  skills/
  runs/
```

## Ecosystem Config

Example: [ecosystems/liguelead/ecosystem.config.json](/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead/ecosystem.config.json)

Important fields:

- `name`: ecosystem name
- `historyRoot`: where runs are stored relative to the ecosystem folder
- `sddRoot`: where the centralized SDD lives relative to the ecosystem folder
- `codex.command`: CLI command, usually `codex`
- `codex.args`: base arguments, usually `["exec", "--ephemeral"]`
- `repositories`: local repositories that belong to the ecosystem

Each repository can define:

- `id`
- `label`
- `path`
- `docsHints`
- `validation`

## Task Format

Tasks live under `sdd/tasks/` and must start with YAML frontmatter.

Example:

```md
---
id: broadcast-interaction-unique-key-backend
title: Broadcast Interaction Unique Key Backend Validation
scope: broadcast-interaction-unique-key
status: open
repositories:
  - backend
validation:
  - npm run typecheck
  - npm test
docs_targets:
  - docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - another-task-id
---
```

The body should describe the implementation goal, constraints, docs alignment, and validation expectations.

Supported task statuses:

- `open`: ready to start
- `implemented`: code was delivered, but the result is not yet considered final enough to consolidate as done
- `needs-rework`: a previous attempt did not fully meet expectations and should be executed again
- `done`: code, docs, and validation are aligned

## Commands

Run one task by id, filename, or relative path:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --task broadcast-interaction-unique-key-backend
```

Resolve one task by fragment:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --feature unique-key-frontend
```

Run one scope:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --scope broadcast-interaction-unique-key
```

Run all actionable tasks in one shared execution:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --open-tasks
```

Run all actionable tasks grouped by scope:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --open-scopes
```

Dry run any mode:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --open-scopes --dry-run
```

## Execution Model

The runner builds one shared `codex exec` batch per selection:

- `--task`: one shared batch with the selected tasks
- `--feature`: one shared batch with the matched task
- `--scope`: one shared batch with every task in that scope
- `--open-tasks`: one shared batch with every actionable task (`open` and `needs-rework`)
- `--open-scopes`: one shared batch per scope that still has actionable tasks

The runner grants write access to:

- the batch history folder
- every repository touched by the batch

## History

Runs are stored under:

```text
ecosystems/<name>/runs/<run-id>/<batch>/
```

Each batch folder contains:

- `prompt.md`
- `output.md`
- `codex.log`
- `metadata.json`
- `summary.json`
- `tasks/`

The `tasks/` folder stores snapshots of the central task files used for that batch.

## Lean Documentation Model

To control token usage, the runner expects a short operational output on every execution and treats repo documentation as a later consolidation step.

Recommended flow:

- `open`: task is ready to execute
- `implemented`: code exists, but the result still needs validation or review
- `needs-rework`: the previous attempt did not fully meet expectations
- `done`: docs and implementation are stable enough to be treated as the current module behavior

Use repo doc updates conservatively:

- partial or uncertain result: keep docs small and note the gaps
- stable result: update the real module docs and move the task to `done`

## Bootstrap Skill

Use [skills/ecosystem-bootstrap/SKILL.md](/home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-bootstrap/SKILL.md) when you want to create a new ecosystem from one or more local repositories.

## Task Factory Skill

Use [skills/ecosystem-task-factory/SKILL.md](/home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-task-factory/SKILL.md) when you want to create or split centralized ecosystem tasks.
