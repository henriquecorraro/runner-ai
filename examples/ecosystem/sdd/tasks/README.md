# Example SDD Tasks

This folder is the centralized task queue for an workspace.

Keep the parent `sdd/README.md` task status ordered from oldest to newest. When a task is created later, append it to the end of `## Task Status` so the newest work remains at the bottom.

Name task files with the same two-digit number used by their chronological position in the parent status list, for example `01-example-backend-contract-update.md`.

Example task file:

```md
---
id: example-backend-contract-update
title: Example Backend Contract Update
scope: example-contracts
status: open
repositories:
  - example-backend
validation:
  - npm test
docs_targets:
  - example-backend:docs/contracts.md
depends_on: []
---

## Goal

Describe the behavior that should change and which repository owns it.
```
