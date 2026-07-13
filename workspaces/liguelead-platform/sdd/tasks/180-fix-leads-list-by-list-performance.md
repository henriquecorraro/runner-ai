---
id: fix-leads-list-by-list-performance
title: "Fix listByList query performance (570s → 28ms)"
scope: fix-leads-list-by-list-performance
status: done
repositories:
  - platform-api
validation:
  - "listByList responds in <100ms for large lists"
  - STRAIGHT_JOIN used with leads_lists_map as driving table
  - leads_summary used for total when no search
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4790085866
github_issue_number: 97
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/97
github_issue_node_id: I_kwDORpoJ688AAAABHYLo6g
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/97
github_project_item_id: 207492498
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxeFZI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207492498"
github_project_status: Done
---

## Problem
listByList query uses leads as driving table with ORDER BY llm.created_at DESC. For lists with 496k+ leads, query takes 570 seconds (timeout).

## Solution
- Use STRAIGHT_JOIN with leads_lists_map as driving table
- Order by llm.id DESC (PK) instead of llm.created_at
- Use leads_summary for total count when no search filter
- Remove redundant client_id filter (list ownership validated upstream)

## Performance
- Before: 570 seconds (timeout)
- After: 28ms

## PR
https://github.com/ligue-lead-tech/platform-api/pull/new/fix/leads-list-by-list-performance

## Validation
- listByList query on replica with list 19c7fb33 (496k leads): 28ms
