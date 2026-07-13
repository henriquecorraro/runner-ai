---
id: broadcast-schedule-report-header-middleware
title: Update middleware broadcast schedule report header contracts
scope: broadcast-schedule-report
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware/docs/
depends_on:
  - broadcast-schedule-report-header-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4696882186
github_issue_number: 59
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/59
github_issue_node_id: I_kwDOR6h3H88AAAABF_S8Cg
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/59
github_project_item_id: 202193021
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNOH0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202193021"
github_project_status: Done
---

## Repositories

| Repository | Paths |
|---|---|
| middleware | `src/**`, `docs/**`, OpenAPI artifacts |

## Requirements

| Item | Requirement |
|---|---|
| Route | Preserve existing middleware routes for broadcast schedules and schedule detail. |
| Contract | Expose/pass through `typeLabel` and `campaignName` from platform-api schedule responses. |
| Header fields | Ensure clients can read `typeId`, `typeLabel`, `campaignId`, `campaignName`, `statusId`, `statusLabel`, `title` from schedule detail payload. |
| Report route | Do not change voice metrics/download response shapes unless middleware already models schedule report responses. |
| Compatibility | Do not remove existing fields. |
| Docs | Regenerate OpenAPI docs when schemas/contracts change. |
| Tests | Update route/service/schema tests for new fields. |

## TypeScript Shape

```ts
type BroadcastScheduleReportHeaderFields = {
  typeId: 1 | 2 | 3 | 4;
  typeLabel: string;
  campaignId: number | null;
  campaignName: string | null;
  statusId: number;
  statusLabel: string;
  title: string | null;
};
```

## Constraints

| Rule | Value |
|---|---|
| Backend | Treat platform-api as source of truth. |
| Performance | Do not add extra middleware calls for campaign/status lookup. |
| Auth | Preserve current auth/session forwarding. |
| Errors | Preserve existing middleware error mapping. |
