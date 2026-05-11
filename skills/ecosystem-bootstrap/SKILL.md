---
name: ecosystem-bootstrap
description: "Create a new centralized ecosystem inside /home/rick/projetos/ecosystem-ai-runner from one or more local repositories. Use when the user wants to register a new ecosystem, inspect local repositories, generate runner config, create central SDD files and tasks, and optionally add ecosystem-specific skills without requiring docs/sdd inside each repository."
---

# Ecosystem Bootstrap

## Overview

Use this skill to create a new ecosystem under `/home/rick/projetos/ecosystem-ai-runner/ecosystems/<name>/`.

The repositories of the ecosystem are treated as code sources, not as homes for the SDD queue.

## Goal

Generate a centralized ecosystem structure that the runner can execute without requiring `docs/sdd` inside the target repositories.

## Output Structure

Create this shape:

```text
ecosystems/<name>/
  ecosystem.config.json
  skills/
  sdd/
    README.md
    tasks/
  runs/
```

## Workflow

1. Read each repository root and its top-level docs, especially `README.md`, package manifests, and obvious validation scripts.
2. Identify repository ids, labels, stack, docs hints, and validation commands.
3. Create `ecosystem.config.json` with repository metadata and centralized `sddRoot` / `historyRoot`.
4. Create `sdd/README.md` describing the ecosystem queue.
5. Create a small set of initial tasks under `sdd/tasks/`.
6. If the repositories clearly form a cross-repo feature flow, put related tasks under a shared `scope`.
7. Keep the ecosystem generic and runner-friendly. Do not require repo-local SDD folders.
8. Use the shared `ecosystem-task-factory` skill for future task creation instead of generating a per-ecosystem task factory file.

## Task Format

Every generated task must use YAML frontmatter with at least:

```md
---
id: task-id
title: Human Title
scope: optional-scope-id
status: open
repositories:
  - repo-id
validation:
  - command
---
```

## Design Rules

- Keep all tasks for the ecosystem in one place: `ecosystems/<name>/sdd/tasks/`.
- Prefer one task per implementation responsibility, even when multiple tasks share the same scope.
- Use `scope` for grouping related tasks that should run in the same `codex exec` when requested.
- Put repo-specific docs and validation hints in `ecosystem.config.json`.
- Do not create extra process documentation beyond the files needed by the runner.

## Defaults

- If a repo exposes `package.json`, prefer its scripts for validation.
- If no clear validation script exists, record that explicitly instead of guessing.
- If the user does not specify a storage preference, keep the ecosystem fully inside this runner project.
