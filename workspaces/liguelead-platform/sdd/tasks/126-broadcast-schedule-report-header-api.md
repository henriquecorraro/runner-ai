---
id: broadcast-schedule-report-header-api
title: Add broadcast schedule report header fields to API contracts
scope: broadcast-schedule-report
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api/docs/human/broadcasts.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4696744907
github_issue_number: 48
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/48
github_issue_node_id: I_kwDORpoJ688AAAABF_Kjyw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/48
github_project_item_id: 202186099
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNHXM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202186099"
github_project_status: Done
---

## Repositories

| Repository | Paths |
|---|---|
| platform-api | `src/modules/broadcasts/**`, `tests/**`, `docs/human/broadcasts.md` |

## Requirements

| Item | Requirement |
|---|---|
| Route | `GET /broadcasts/schedules/:id` must return report header fields usable by the schedule report page. |
| Route | `GET /broadcasts/schedules/:id/report` must keep current voice report response shape stable unless adding a backward-compatible `header` object is cleaner. |
| Header fields | Return `typeId`, `typeLabel`, `campaignId`, `campaignName`, `statusId`, `statusLabel`, `title`. |
| Title source | Use broadcast action title when present. Fallback to schedule/content title only when needed. |
| Campaign source | Join `campaigns` by `actions.campaign_id`; return `campaignName: null` when no campaign row exists. |
| Status source | Use existing action status mapping; do not expose raw DB-only labels as the only display field. |
| Client scope | Preserve `actions.clients_id = authSession.clientId` scoping. |
| Compatibility | Do not remove existing fields from schedule or report responses. |
| Tests | Update unit tests and route contract fixtures for the new fields. |
| Docs | Document the report header fields in `docs/human/broadcasts.md` if the file exists; otherwise create/update the nearest broadcast human doc. |

## TypeScript Shape

```ts
type BroadcastScheduleReportHeader = {
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
| SQL | Use parameterized Sequelize queries. |
| Performance | Do not query large result tables for header fields. |
| Report availability | Header data must be available even when the generated voice report is not ready. |
| Errors | Preserve existing 404/409 behavior for report endpoints. |
