---
name: workspace-task-closer
description: "Close centralized workspace tasks after the user confirms the delivered work is correct. Use when the user says a task is completed, approved, validated, ready to close, or should be marked as done. Update repository-local human docs first, then mark task frontmatter and the workspace Task Status as done."
---

# Workspace Task Closer

## Overview

Use this skill when the user confirms that one or more workspace tasks now meet expectations and should be closed.

This skill is for final consolidation only. It writes stable human docs in the affected repositories and then marks the central task files as `done`.

## Trigger Phrases

Use this skill for requests like:

- "task completada"
- "marcar como done"
- "fechar task"
- "essa task esta correta"
- "pode concluir"
- "validado, atualiza a doc"

## Workflow

1. Identify the target workspace and task ids from the user's message.
2. Read:
   - `workspaces/<name>/workspace.config.json`
   - `workspaces/<name>/sdd/README.md`
   - the selected files under `workspaces/<name>/sdd/tasks/`
3. Resolve each task's `repositories` and `docs_targets`.
4. Read the current repository-local docs listed in `docs_targets`.
5. Inspect the relevant code and recent task output only enough to write accurate final docs.
6. Update human docs inside the affected repositories, not inside this runner.
7. Run the narrowest useful validation when the task or repository rules require it.
8. Before closing, ask whether to publish repository changes as PRs when there are unpushed task changes:
   - ask whether to use the current branch or create a new branch
   - ask for the PR target branch if it is not already explicit
   - do not push or open PRs until the user answers
9. Use MCP `set_task_status` with `status: "done"` and `userValidated: true` for each closed task.
   - Include a concise `closeoutSummary`.
   - Include `prHandoff.decision`.
   - Include `prHandoff.pullRequests` with `{ repository, url }` entries for every PR opened.
   - When GitHub metadata exists, the tool updates the GitHub issue closeout section and moves the Project item to `Done`.
10. Confirm the workspace `sdd/README.md` Task Status entry for each closed task was updated by the tool.
11. Reply with a short summary of docs updated, validations run, tasks closed, and any PR handoff performed or intentionally skipped.

## Docs Rules

- Human docs belong in the repository that owns the behavior.
- `docs_targets` use the format `repo-id:path/inside/repo.md`.
- If a task has no `docs_targets`, infer the repository-local doc target from repo rules and code context, then add it to the task before closing.
- If the correct doc target is unclear, inspect the repository docs index before choosing.
- Do not create human docs inside `ws-runner`.
- Keep docs factual and stable; describe current behavior, business rules, routes, contracts, module boundaries, and operational notes.

## Status Rules

- Only mark `done` after the user has confirmed the delivered behavior is correct.
- Do not mark `done` when the user reports gaps, bugs, doubts, or pending validation.
- If the user reports issues, move the task to `needs-rework` instead and update the task body with the concrete gap.
- If implementation exists but the user has not validated it yet, keep or move the task to `implemented`.

## Task Status Update

When closing a task:

- use MCP `set_task_status` instead of editing task status by hand when available
- update YAML frontmatter from `status: open`, `implemented`, or `needs-rework` to `status: done`
- update `Task Status` in `workspaces/<name>/sdd/README.md`
- update the linked GitHub issue closeout section and move the Project item to `Done` when GitHub metadata exists
- preserve task ids, titles, scopes, repositories, validation, and dependencies
- keep `docs_targets` pointing to repository-local docs

Use checked boxes in `Task Status` when the README uses checklist format:

```md
- [x] Task 01: Example Task
```

If the README uses a different format, preserve that format and make the done state clear.

## Optional PR Handoff

This step is opt-in and must be treated as a locked gate after task closure work is complete.

Only perform PR handoff when all of these are true:

- the user explicitly asks to create/push a branch and open a PR, or says yes to an offer to do it
- the user says whether to use the current branch or create a new branch
- the user provides the exact PR target branch, such as `develop`, `staging`, or `main`
- the affected repository worktree is in a state that can be safely committed without including unrelated user changes

If any requirement is missing, do not create a branch, do not push, and do not open a PR. Instead, state what is needed.

When the user opts in and provides the target branch:

1. For each affected repository, inspect `git status --short`, `git branch --show-current`, and remotes.
2. If the repository is on `main`, create a new branch with a clear task-derived name before committing, for example `task/<task-id>-docs-closeout`.
3. If the repository is already on a non-`main` branch, ask before creating another branch unless the user already specified the source branch name to use.
4. Commit only the docs and task-closure changes made for this closeout. Never include unrelated user changes.
5. Push the source branch to the appropriate remote.
6. Open a PR from the pushed source branch into the exact target branch provided by the user.
7. Include the PR URL in the final response.

If the target branch does not exist locally or remotely, stop and ask for clarification. Do not guess a target branch.

## Completion Response

Keep the final response concise:

- tasks marked `done`
- repository docs updated
- validation run or skipped
- PR branch/URL when the user opted into PR handoff, otherwise note that PR handoff was skipped
- any residual risk
