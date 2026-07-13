---
id: standardize-broadcast-blocklist-terminology
title: Standardize Broadcast Blocklist Terminology
scope: broadcasts
status: done
repositories:
  - middleware
  - platform-api
validation:
  - middleware: npm test
  - platform-api: npm run typecheck
  - platform-api: npm test
docs_targets:
  - middleware/docs
  - platform-api/docs/human
---

Standardize broadcast terminology on Blocklist/removeBlocklist/blocklist across middleware and platform-api. Public contracts, backend DTOs, tests, and human documentation must use the corrected terms consistently, and response validation must not keep a separate legacy spelling path once both repositories are updated together.
