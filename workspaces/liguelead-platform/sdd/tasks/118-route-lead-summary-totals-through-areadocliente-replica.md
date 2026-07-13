---
id: route-lead-summary-totals-through-areadocliente-replica
title: Route lead summary totals through areadocliente replica
scope: platform-api
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/lead-lists.repository.spec.ts
  - npm run typecheck
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4695137294
github_issue_number: 44
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/44
github_issue_node_id: I_kwDORpoJ688AAAABF9ocDg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/44
github_project_item_id: 202106941
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwL6D0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202106941"
github_project_status: Done
---

## Files

```text
src/modules/lead-lists/repositories/lead-lists.repository.ts
tests/lead-lists.repository.spec.ts
```

## Requirements

- Use `areadoclienteReplica` for read-only `leads_summary` access in lead-list totals.
- Use `areadoclienteReplica` for lead-list listing queries that join `leads_summary`.
- Keep all `leads_summary` writes on primary `sequelize`.
- Keep `saveLeadListSummary` on primary.
- Keep `incrementLeadListSummaryTotals` on primary.
- Do not route lead create/update/delete flows through replica.
- Do not route duplicate checks through replica.

## SQL

```sql
SELECT
  total_leads AS totalLeads,
  total_blocklist AS totalBlocklist,
  updated_at AS updatedAt
FROM leads_summary
WHERE client_id = :clientId
  AND list_id = :listId
LIMIT 1;
```

## Expected Behavior

| Flow | Database |
| --- | --- |
| `getLeadListSummary` read | `areadoclienteReplica` |
| `ensureGeneralLeadListSummary` existing summary read | `areadoclienteReplica` |
| lead-list listing totals read | `areadoclienteReplica` |
| `saveLeadListSummary` write | primary `sequelize` |
| `incrementLeadListSummaryTotals` write | primary `sequelize` |

## Validation

```sh
npm test -- tests/lead-lists.repository.spec.ts
npm run typecheck
```
