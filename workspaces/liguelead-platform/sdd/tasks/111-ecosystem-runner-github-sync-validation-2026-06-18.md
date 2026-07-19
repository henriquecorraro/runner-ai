---
id: ecosystem-runner-github-sync-validation-2026-06-18
title: Validate deterministic GitHub sync lifecycle
scope: ecosystem-runner-validation
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - GitHub issues exist in every linked repository.
  - The primary issue is linked to the ecosystem GitHub Project.
  - The Project item can move through In Progress and Testing.
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4692182570
github_issue_number: 34
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/34
github_issue_node_id: I_kwDORpoJ688AAAABF60GKg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/34
  - https://github.com/ligue-lead-tech/middleware/issues/53
  - https://github.com/ligue-lead-tech/platform-front/issues/53
github_project_item_id: 201939057
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJWHE
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201939057"
github_project_status: Done
---

Goal:
- Validate ws-runner deterministic GitHub sync lifecycle with real GitHub artifacts.

Checks:
- Confirm one issue was created in each linked repository.
- Confirm every issue is assigned to the authenticated GitHub user.
- Confirm the primary issue is represented as the GitHub Project item.
- Confirm board lifecycle transitions can move the Project item to In Progress and Testing.

Implementation:
- No product code changes are required for this validation task.
