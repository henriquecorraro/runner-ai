# Example Workspace SDD

This folder shows a generic centralized SDD layout for one workspace.

The repositories remain the source of code and human documentation. The runner keeps the workspace config, tasks, and execution history.

## Structure

- `tasks/`: executable workspace tasks
- use the shared `workspace-task-factory` skill for task creation
- keep task status entries ordered oldest first, with new tasks appended at the end
- name task files with their two-digit task number prefix, for example `01-example-task.md`

## Docs Quality Baseline

### example-backend

- score: `8/10`
- label: `docs-ready`
- evidence files read:
  - `README.md`
  - `docs/README.md`
- missing areas:
  - add deeper operational troubleshooting only if the product needs it

### example-frontend

- score: `6/10`
- label: `docs-partial`
- evidence files read:
  - `README.md`
  - `docs/features/example-feature.md`
- missing areas:
  - improve module-by-module feature coverage
  - clarify integration contracts and UI state transitions

## Task Status

- No tasks yet
