# Ecosystem AI Runner Usage

The runner executes centralized ecosystem tasks stored inside this project.

It no longer depends on `docs/sdd` inside the target repositories.

Human-facing repository docs stay in the repositories that own them. This runner stores only the ecosystem config, central tasks, run history, and docs-quality baselines.

## Language Contract

ENGLISH FIRST for ecosystem SDD.

Write centralized ecosystem SDD artifacts in English, including task files,
task titles, task body sections, textual frontmatter values, `Task Status`
entries, ecosystem SDD README notes, and generated run prompts. The chat with
the user may be in Portuguese or another language, but planning content must be
translated to English before it is written to SDD. Preserve another language
only for exact user-facing copy that a product task explicitly requires.

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

Example: [ecosystems/liguelead/ecosystem.config.json](../ecosystems/liguelead/ecosystem.config.json)

Important fields:

- `name`: ecosystem name
- `historyRoot`: where runs are stored relative to the ecosystem folder
- `sddRoot`: where the centralized SDD lives relative to the ecosystem folder
- `defaultAgent`: default agent key. If omitted, the runner uses `codex`
- `agents`: named agent configurations
- `repositories`: local repositories that belong to the ecosystem

Supported agent adapter types:

- `codex`: runs Codex CLI with `--add-dir`, `-C`, and prompt via stdin
- `claude-code`: runs Claude Code CLI with `-p`, `--add-dir`, and a pointer to the generated prompt file

Example:

```json
{
  "defaultAgent": "codex",
  "agents": {
    "codex": {
      "type": "codex",
      "command": "codex",
      "args": ["exec", "--ephemeral"]
    },
    "claude-code": {
      "type": "claude-code",
      "command": "claude",
      "args": ["-p"]
    }
  }
}
```

Legacy `codex.command` and `codex.args` configs are still supported for Codex.

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
  - backend:docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - another-task-id
---
```

The body should describe the implementation goal, constraints, docs alignment, and validation expectations.

Use `docs_targets` for repository-local docs, in the format `repo-id:path/inside/repo.md`.

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

Run with a non-default agent:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --task broadcast-interaction-unique-key-backend --agent claude-code
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

## MCP For Agents

The preferred chat-based workflow is MCP. The developer speaks naturally, and
the current agent calls tools to inspect ecosystems, load tasks, remember active
tasks, create task files, update status, or explicitly run the isolated runner.

Start the MCP server:

```bash
npm run mcp
```

Available tool categories:

- operating context: tells the agent to execute in the current chat by default
- ecosystem and task reads: list ecosystems, list tasks, load one task
- active task memory: remember tasks created or discussed in this MCP session
- task writes: create a task or update status
- runner execution: run the isolated runner only with explicit user confirmation

The default behavior is important: if the user says "pode fazer as tasks" after
planning work in the same chat, the agent should execute those active tasks in
the current conversation. It should not call open-tasks or open-scopes through
the runner unless the user chooses runner execution.

## Codex Plugin

The local plugin wrapper lives at `plugins/ecosystem-ai-runner/`.

Register the marketplace:

```bash
codex plugin marketplace add /home/rick/projetos/ecosystem-ai-runner
```

The plugin includes:

- `.codex-plugin/plugin.json`: plugin metadata
- `.mcp.json`: MCP server configuration
- `skills/ecosystem-ai-runner/SKILL.md`: plugin operating instructions

Direct MCP registration remains available:

```bash
codex mcp add ecosystem-ai-runner -- node /home/rick/projetos/ecosystem-ai-runner/bin/ecosystem-ai-mcp.js
```

## Execution Model

The runner builds one shared agent batch per selection:

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
- `<agent>.log`
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

## Operating Mode Skill

Use [skills/ecosystem-operating-mode/SKILL.md](../skills/ecosystem-operating-mode/SKILL.md) when an agent is working in this runner and needs to choose the right workflow or ecosystem-local skills before acting.

The runner also includes this operating instruction in generated agent prompts so isolated executions load the umbrella guidance before the task-specific workflow.

## Bootstrap Skill

Use [skills/ecosystem-bootstrap/SKILL.md](../skills/ecosystem-bootstrap/SKILL.md) when you want to create a new ecosystem environment from one or more local repositories without generating tasks yet.

During bootstrap, the skill may also assess the repositories' human-facing documentation against [docs/human-doc-quality-rubric.md](human-doc-quality-rubric.md) and register a baseline in the ecosystem `sdd/README.md`.

If the docs are below baseline, the skill should suggest a follow-up option to create an initial docs task instead of creating it automatically.

When that follow-up task runs, generated human docs should be written in the affected repository, not in this runner.

## Task Factory Skill

Use [skills/ecosystem-task-factory/SKILL.md](../skills/ecosystem-task-factory/SKILL.md) when you want to create or split centralized ecosystem tasks.

## Task Executor Skill

Use [skills/ecosystem-task-executor/SKILL.md](../skills/ecosystem-task-executor/SKILL.md) when you want to execute centralized ecosystem tasks.

The executor requires an explicit ecosystem and execution mode. It can run work in the current chat session, or it can ask the AI in the current chat to run the runner. Runner execution creates history, but costs more tokens because it starts another agent session with a generated prompt and logs.

## Task Closer Skill

Use [skills/ecosystem-task-closer/SKILL.md](../skills/ecosystem-task-closer/SKILL.md) after the user confirms a task is correct and ready to close.

The closer updates final human docs in the owning repository, changes the task frontmatter to `status: done`, and updates the ecosystem `sdd/README.md` Task Status.
