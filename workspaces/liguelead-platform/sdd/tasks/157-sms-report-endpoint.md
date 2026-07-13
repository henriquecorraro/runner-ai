---
id: sms-report-endpoint
title: "SMS report endpoint: metrics from actions + timeline"
scope: sms-report
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
depends_on:
  - sms-dispatch-totals-csv
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4720808844
github_issue_number: 66
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/66
github_issue_node_id: I_kwDORpoJ688AAAABGWHTjA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/66
github_project_item_id: 203507256
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwhRjg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=203507256"
github_project_status: Done
---

## Objective

Unblock `GET /broadcasts/schedules/:id/report` for SMS/SMS Flash broadcasts (typeId 3, 4). Return simplified report with metrics from `actions` table and timeline from `actions_has_status`.

## File: `src/modules/broadcasts/use-cases/broadcast-scheduling.use-cases.ts`

Remove the guard:
```typescript
if (action.typeId !== 1 && action.typeId !== 2) {
  throw new ConflictError("Broadcast report type is not supported yet", ...);
}
```

Replace with branching:
- typeId 1,2 → existing `getVoiceReport` path
- typeId 3,4 → new `getSmsReport` path

## New entity type

```typescript
// File: src/modules/broadcasts/entities/broadcast-send.entity.ts (add)
export type BroadcastSmsReportEntity = {
  actionId: number;
  typeId: 3 | 4;
  reportType: "sms";
  summary: {
    totalLeads: number;
    totalSent: number;
    sentPercent: number;
  };
  timeline: BroadcastReportTimelineEvent[];
  reportUrl: string | null;
};
```

`BroadcastReportTimelineEvent` — reuse existing type from voice report entity.

## Repository method

Add to `BroadcastSendsRepository`:

```typescript
async getSmsReport(clientId: number, scheduleId: number): Promise<BroadcastSmsReportEntity | null>
```

Query:
```sql
SELECT
  a.id AS actionId,
  a.types_id AS typeId,
  a.total_shipping AS totalLeads,
  a.total_send_sms AS totalSent,
  a.action_report_url AS reportUrl
FROM actions a
WHERE a.id = (
  SELECT actions_id FROM sends WHERE id = :scheduleId AND clients_id = :clientId LIMIT 1
)
LIMIT 1
```

`sentPercent` = `totalSent / totalLeads * 100` (compute in code, handle division by zero → 0).

Timeline query — reuse same query pattern as voice timeline from `actions_has_status`:
```sql
SELECT
  ahs.status_id AS statusId,
  s.status AS statusLabel,
  ahs.created_by AS createdBy,
  ahs.by_method AS byMethod,
  ahs.created_at AS createdAt
FROM actions_has_status ahs
LEFT JOIN status s ON s.id = ahs.status_id
WHERE ahs.actions_id = :actionId
ORDER BY ahs.created_at ASC
```

Map each row to timeline event with `kind`:
- statusId 12 or byMethod contains 'pause' → kind = 'pause'
- statusId 4 and previous was pause → kind = 'resume'
- else → kind = 'status'

## Response mapper

File: `src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts`

Add `broadcastSmsReportResponseMapper` that returns the entity shape as-is.

## Controller update

In `getScheduleReport`: if result has `reportType === 'sms'`, use `broadcastSmsReportResponseMapper`.

## Download endpoint

`GET /broadcasts/schedules/:id/report/download` — already works for SMS if `action_report_url` is set and CSV exists in S3. No changes needed (uses `reports/report_{actionId}.csv` key).

## Constraints

- Do NOT query `sms_result` table
- Return 404 if `total_send_sms` is NULL (report not yet generated / dispatch not finished)
- Do NOT create new database tables
