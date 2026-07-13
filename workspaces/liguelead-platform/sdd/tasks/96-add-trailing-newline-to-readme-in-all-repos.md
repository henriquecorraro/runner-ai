---
id: add-trailing-newline-to-readme-in-all-repos
title: Add trailing newline to README in all repos
scope: add-trailing-newline-to-readme-in-all-repos
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - "cat -A README.md | tail -1 should show '$' (empty line with newline)"
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKnu90
github_project_item_id: 200129875
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgvtvVM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200129875"
github_project_status: Done
---

## Objective
Ensure each repository's README.md ends with exactly one trailing newline.

## Steps
- For each repo (platform-api, middleware, platform-front):
  - Open README.md
  - Ensure file ends with a single `\n` (add one blank line at EOF if missing)
  - No other changes

## Acceptance
- Each README.md ends with exactly one trailing newline
- No content changes beyond whitespace normalization at EOF
