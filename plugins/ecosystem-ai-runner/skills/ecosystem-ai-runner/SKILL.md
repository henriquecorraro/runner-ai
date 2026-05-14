---
name: ecosystem-ai-runner
description: "Use when working with centralized ecosystem tasks through the Ecosystem AI Runner plugin. Applies to planning, creating, loading, executing, updating, or closing ecosystem tasks from Codex chat; prefer MCP tools and execute in the current chat by default."
---

# Ecosystem AI Runner Plugin

Use this plugin skill when the user asks to plan, inspect, execute, or close ecosystem tasks.

## Default Behavior

- Use MCP tools from the `ecosystem-ai-runner` server when available.
- Keep execution in the current chat by default to reuse brainstorm context and save tokens.
- Resolve "essas tasks", "as tasks", "pode fazer", and similar references against tasks created, changed, loaded, or discussed in this conversation first.
- Use the isolated runner only when the user explicitly asks for it or confirms it for a large scope/open-task batch.
- Do not mark a task as `done` until the user confirms validation.

## Tool Routing

- Use `get_operating_context` before planning or executing ecosystem work.
- Use `list_ecosystems`, `list_tasks`, and `get_task` to discover and load task context.
- Use `remember_active_tasks` when the chat has established a task set that future references should use.
- Use `create_task` for straightforward structured task creation.
- Use `set_task_status` for `open`, `implemented`, `needs-rework`, or user-validated `done`.
- Use `run_with_runner` only with explicit user confirmation.

## Repository Rules

- Centralized planning lives in `ecosystem-ai-runner`.
- Stable human docs live in the owning repository.
- Do not revert unrelated user changes.
- Run the narrowest useful validation for touched repositories.
