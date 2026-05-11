---
name: ecosystem-task-factory
description: "Create or split centralized ecosystem tasks under ecosystem-ai-runner/ecosystems/<name>/sdd/tasks. Use when the user wants to turn repository analysis into executable ecosystem tasks, group related tasks by scope, assign repository ownership, and update the central Task Status without relying on task-factory.md files inside each ecosystem."
---

# Ecosystem Task Factory

## Overview

Use this skill when the user wants to create, split, or normalize centralized ecosystem tasks inside this runner project.

It replaces repeated `task-factory.md` files inside each ecosystem.

## Goal

Create ecosystem-level tasks under `ecosystems/<name>/sdd/tasks/` and keep the ecosystem `sdd/README.md` aligned.

## Workflow

1. Read the target ecosystem folder, especially:
   - `ecosystems/<name>/ecosystem.config.json`
   - `ecosystems/<name>/sdd/README.md`
   - existing files under `ecosystems/<name>/sdd/tasks/`
2. Read the relevant repositories only as implementation context.
3. Decide whether the request should become one task or multiple tasks.
4. Use `scope` to group related tasks that should run together.
5. Use `repositories` to declare which repositories each task owns.
6. Keep all task files in the ecosystem `sdd/tasks/` folder.
7. Add or update `Task Status` in the ecosystem `sdd/README.md`.
8. Default new tasks to `status: open`.

## When To Split

Prefer multiple tasks when:

- backend and frontend have separate implementation responsibilities
- middleware is a distinct contract boundary
- one part of the work can block another
- the user asked for staged execution or partial rollout

Prefer one task when:

- the change is tightly coupled
- the same repository owns almost all of the work
- splitting would add overhead without making execution safer

## Task Format

Every generated task must start with YAML frontmatter like:

```md
---
id: task-id
title: Human Title
scope: optional-scope-id
status: open
repositories:
  - backend
validation:
  - npm run typecheck
docs_targets:
  - docs/example.md
depends_on:
  - another-task-id
---
```

## Body Requirements

The task body should describe:

- goal
- affected behavior
- implementation constraints
- required docs alignment
- validation expectations

## Design Rules

- Keep task ids stable and descriptive.
- Prefer one task per implementation responsibility.
- Reuse an existing scope when the new task belongs to the same cross-repo change.
- If a task is open and already covers the request, update it instead of creating a duplicate.
- Do not create extra process documents beyond task files and the ecosystem `sdd/README.md`.
