---
id: fix-leads-listing-use-index
title: Fix leads listing USE INDEX for general pagination
scope: fix-leads-listing-use-index
status: done
repositories:
  - platform-api
validation:
  - Query uses idx_leads_client_del_idpk on replica
  - "Leads listing returns in <50ms for large clients"
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4790084683
github_issue_number: 96
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/96
github_issue_node_id: I_kwDORpoJ688AAAABHYLkSw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/96
github_project_item_id: 207492440
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxeFVg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207492440"
github_project_status: Done
---

## Problem
MySQL optimizer on replica chooses uk_idpk (backward scan) instead of idx_leads_client_del_idpk for leads listing query. Results in ~500ms per query that timeouts under load.

## Solution
- Add USE INDEX (idx_leads_client_del_idpk) to listItems and count queries
- Performance: 500ms → 0.7ms

## PR
https://github.com/ligue-lead-tech/platform-api/pull/new/fix/leads-listing-use-index (merged)

## Validation
- Query on replica with client 2242 (685k leads): 0.7ms with USE INDEX vs 500ms without
