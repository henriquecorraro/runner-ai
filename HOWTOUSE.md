# How To Use This Runner

Operating guide for AI agents working in this repository. Read this before acting.

> This is NOT a single-app codebase. It is a centralized runner for managing tasks across multiple repositories.

## Quick Reference

| Stage | Skill | What it does |
|-------|-------|--------------|
| 1 | `ecosystem-bootstrap` | Create/register an ecosystem |
| 2 | `ecosystem-task-factory` | Create centralized task files |
| 3 | `ecosystem-task-executor` | Execute tasks (chat or runner) |
| 4 | Developer validates | AI summarizes, human confirms |
| 5 | `ecosystem-task-closer` | Mark done + update docs |

## Rules

- **English first** for all SDD artifacts (task files, titles, body, frontmatter, README updates). The user may chat in Portuguese — translate before writing.
- **Current chat is the default** execution context. Use the isolated runner only when the user explicitly asks.
- **Never mark `done`** until the developer confirms validation. Use `implemented` or `needs-rework` until then.
- **Resolve contextual references** ("essas tasks", "pode fazer") against the current conversation first.

## Discovering Ecosystems

```bash
find ecosystems -maxdepth 2 -name ecosystem.config.json -print
```

If the user doesn't name an ecosystem, list available ones and ask.

## Task File Format

Files live in `ecosystems/<name>/sdd/tasks/` with YAML frontmatter:

```yaml
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
depends_on: []
---
```

Statuses: `open` → `implemented` → `done` (or `needs-rework` for another pass).

## Execution Modes

**In current chat** (default, saves tokens):
```text
Use the `ecosystem-task-executor` skill.
Execute task `invoice-crud-backend` in ecosystem billing-platform in this chat.
```

**Via runner** (isolated, creates history):
```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <id> --dry-run
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <id>
```

Selection flags: `--task <id>`, `--scope <id>`, `--feature <fragment>`, `--open-tasks`, `--open-scopes`.

Always `--dry-run` first when using the runner.

## MCP Interface

Start the MCP server:
```bash
npm run mcp
```

Available tools: `get_operating_context`, `list_ecosystems`, `list_tasks`, `get_task`, `get_active_tasks`, `remember_active_tasks`, `create_task`, `set_task_status`, `run_with_runner`.

## Installing Skills

Skills are in `skills/`. Link them to your AI tool:

**Codex:**
```bash
mkdir -p "$HOME/.codex/skills"
for skill in ecosystem-bootstrap ecosystem-operating-mode ecosystem-task-factory ecosystem-task-executor ecosystem-task-closer codex-direct-mode; do
  ln -sfn "$PWD/skills/$skill" "$HOME/.codex/skills/$skill"
done
```

**Claude Code:**
```bash
mkdir -p "$HOME/.claude/skills"
for skill in ecosystem-bootstrap ecosystem-operating-mode ecosystem-task-factory ecosystem-task-executor ecosystem-task-closer codex-direct-mode; do
  ln -sfn "$PWD/skills/$skill" "$HOME/.claude/skills/$skill"
done
```

## Plugin Registration

**Codex:**
```bash
codex plugin marketplace add /home/rick/projetos/ecosystem-ai-runner
# or direct MCP:
codex mcp add ecosystem-ai-runner -- node /home/rick/projetos/ecosystem-ai-runner/bin/ecosystem-ai-mcp.js
```

**Claude Code:**
```bash
claude mcp add ecosystem-ai-runner -- node /home/rick/projetos/ecosystem-ai-runner/bin/ecosystem-ai-mcp.js
```

## After Execution

Summarize: tasks executed, repos changed, validation run, docs updated, gaps/risks. Then wait for developer confirmation before closing.
