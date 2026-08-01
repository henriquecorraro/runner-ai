---
name: ws-runner
description: "Use when working with centralized workspace tasks through the Workspace Runner plugin. Applies to planning, creating, loading, executing, updating, or closing workspace tasks from the AI chat (Codex or Claude Code); prefer MCP tools and execute in the current chat by default."
---

# Workspace Runner Plugin

Use this plugin skill when the user asks to plan, inspect, execute, or close workspace tasks.

## Default Behavior

- Use MCP tools from the `ws-runner` server when available.
- ENGLISH FIRST for ecosystem SDD: write task files, task titles, task body
  sections, textual frontmatter values, `Task Status` entries, SDD README
  updates, and run prompts in English. Do not mirror the user's chat language
  into centralized SDD artifacts unless preserving an exact user-facing string.
- Keep execution in the current chat by default to reuse brainstorm context and save tokens.
- Resolve "essas tasks", "as tasks", "pode fazer", and similar references against tasks created, changed, loaded, or discussed in this conversation first.
- Use the isolated runner only when the user explicitly asks for it or confirms it for a large scope/open-task batch.
- Do not mark a task as `done` until the user confirms validation.

## Tool Routing

- Use `get_operating_context` before planning or executing ecosystem work.
- Use `list_workspaces`, `list_tasks`, and `get_task` to discover and load task context.
- Use `create_workspace` for deterministic workspace creation. If the user did not provide a GitHub Project URL, ask for it before calling the tool unless the user explicitly confirms the workspace does not need a Project; then pass `skipGithubProject: true`.
- Use `remember_active_tasks` when the chat has established a task set that future references should use.
- Use `create_task` for straightforward structured task creation; when `githubProject` is configured it runs all-or-fail GitHub sync, creates GitHub issues in every linked repository, adds the primary issue to the Project in `Todo`, assigns every issue to the authenticated user, and only then records the local task.
- When creating executable tasks, choose `executionAgent`, `routingPolicy`, `executionProfile`, `preferredModel`, and `reasoningEffort` only from the selected workspace's advertised agents/models. Use `preferred` by default, `pinned` for exact requirements, and `portable` when only difficulty/risk should drive execution. Never store a shell command in task routing.
- For current-chat execution, use `start_task_execution` before implementation and `finish_task_execution` after implementation.
- For `run_with_runner` and `run_parallel`, every selected task card moves to `In Progress` when execution starts and `Testing` after successful completion.
- Use `set_task_status` for `open`, `implemented`, `needs-rework`, or user-validated `done`; before `done`, ask whether to skip PR handoff, use the current branch, or create a new branch, then pass `prHandoff`. `done` updates the GitHub issue closeout section and moves the Project item to `Done` when GitHub metadata exists.
- Use `run_with_runner` only with explicit user confirmation.

## Repository Rules

- Centralized planning lives in `ws-runner`.
- Stable human docs live in the owning repository.
- Do not revert unrelated user changes.
- Run the narrowest useful validation for touched repositories.
