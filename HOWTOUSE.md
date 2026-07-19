# How To Use This Runner

Operating guide for AI agents working in this repository. Read this before acting.

> This is NOT a single-app codebase. It is a centralized runner for managing tasks across multiple repositories.

## Quick Reference

| Stage | Skill | What it does |
|-------|-------|--------------|
| 1 | `workspace-bootstrap` | Create/register an workspace |
| 2 | `workspace-task-factory` | Create centralized task files |
| 3 | `workspace-task-executor` | Execute tasks (chat or runner) |
| 4 | Developer validates | AI summarizes, human confirms |
| 5 | `workspace-task-closer` | Mark done + update docs |

## Rules

- **English first** for all SDD artifacts (task files, titles, body, frontmatter, README updates). The user may chat in Portuguese — translate before writing.
- **Current chat is the default** execution context. Use the isolated runner only when the user explicitly asks.
- **Never mark `done`** until the developer confirms validation. Use `implemented` or `needs-rework` until then.
- **Resolve contextual references** ("essas tasks", "pode fazer") against the current conversation first.

## Discovering Workspaces

```bash
find workspaces -maxdepth 2 -name workspace.config.json -print
```

If the user doesn't name an workspace, list available ones and ask.

Each workspace config may include `githubProject.url`. When present, use it as
the canonical GitHub Projects board for future task-card sync.

## Task File Format

Files live in `workspaces/<name>/sdd/tasks/` with YAML frontmatter:

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
Use the `workspace-task-executor` skill.
Execute task `invoice-crud-backend` in workspace billing-platform in this chat.
```

**Via runner** (isolated, creates history):
```bash
npm run tasks -- --config workspaces/<name>/workspace.config.json --task <id> --dry-run
npm run tasks -- --config workspaces/<name>/workspace.config.json --task <id>
```

Selection flags: `--task <id>`, `--scope <id>`, `--feature <fragment>`, `--open-tasks`, `--open-scopes`.

Always `--dry-run` first when using the runner.

## MCP Interface

Start the MCP server:
```bash
npm run mcp
```

Available tools: `get_operating_context`, `list_workspaces`, `create_workspace`, `list_tasks`, `get_task`, `get_active_tasks`, `remember_active_tasks`, `create_task`, `start_task_execution`, `finish_task_execution`, `set_task_board_status`, `set_task_status`, `run_with_runner`.

Use `create_workspace` for deterministic workspace creation. If the user has
not provided a GitHub Project URL, ask for the URL or ask whether the workspace
should be created without a Project. Only pass `skipGithubProject: true` after
that explicit confirmation.

GitHub Project lifecycle:

- `create_task`: uses all-or-fail GitHub sync when `githubProject` is configured; it opens GitHub issues in every linked repository, adds the primary issue to the Project in `Todo`, assigns every issue to the authenticated user, and only then creates the local task.
- Current-chat execution: call `start_task_execution` before implementation and `finish_task_execution` after implementation.
- `run_with_runner` does the same `in-progress` to `testing` transition around isolated runner execution for every selected task.
- `run_parallel` does the same `in-progress` to `testing` transition per task as each worker starts and finishes successfully.
- Closing: ask whether to skip PR handoff, use the current branch, or create a new branch. Then call `set_task_status` with `status: "done"`, `userValidated: true`, `prHandoff`, and `closeoutSummary`; it updates the GitHub issue closeout section, records PR URLs when provided, and moves the Project item to `Done`.

## Installing Skills

Skills are in `skills/`. Link them to your AI tool:

**Codex:**
```bash
mkdir -p "$HOME/.codex/skills"
for skill in workspace-bootstrap workspace-operating-mode workspace-task-factory workspace-task-executor workspace-task-closer codex-direct-mode; do
  ln -sfn "$PWD/skills/$skill" "$HOME/.codex/skills/$skill"
done
```

**Claude Code:**
```bash
mkdir -p "$HOME/.claude/skills"
for skill in workspace-bootstrap workspace-operating-mode workspace-task-factory workspace-task-executor workspace-task-closer codex-direct-mode; do
  ln -sfn "$PWD/skills/$skill" "$HOME/.claude/skills/$skill"
done
```

## Plugin Registration

**Codex:**
```bash
codex plugin marketplace add /home/rick/projetos/ws-runner
# or direct MCP:
codex mcp add ws-runner -- node /home/rick/projetos/ws-runner/bin/workspace-ai-mcp.js
```

**Claude Code:**
```bash
claude mcp add ws-runner -- node /home/rick/projetos/ws-runner/bin/workspace-ai-mcp.js
```

## After Execution

Summarize: tasks executed, repos changed, validation run, docs updated, gaps/risks. Then wait for developer confirmation before closing.
