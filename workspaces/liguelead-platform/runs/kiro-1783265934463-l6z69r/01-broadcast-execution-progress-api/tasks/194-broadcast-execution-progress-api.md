---
id: broadcast-execution-progress-api
title: Broadcast schedule execution progress endpoint
scope: broadcast-execution-progress
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4813422032
github_issue_number: 106
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/106
github_issue_node_id: I_kwDORpoJ688AAAABHub90A
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/106
github_project_item_id: 208848695
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxyxzc
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208848695"
github_project_status: Todo
---

## Objective

Add endpoint to return real-time execution progress for a broadcast schedule (action) with `status_id = 4` (Discando).

## Endpoint

```
GET /broadcasts/schedules/:id/execution-progress
```

Auth: standard client session (same as existing schedule detail).

## Response Types

```typescript
type VoiceExecutionProgress = {
  type: 'voice'
  total: number
  processed: number
  pending: number
  answered: number
  answeredBillsecZero: number
  notAnswered: number
  busy: number
  failed: number
  progressPercent: number
  avgDurationSeconds: number | null
}

type SmsExecutionProgress = {
  type: 'sms'
  total: number
  sent: number
  pending: number
  totalCredits: number
  progressPercent: number
}

type ExecutionProgressResponse = {
  progress: VoiceExecutionProgress | SmsExecutionProgress | null
  updatedAt: string
}
```

## SQL Queries

Voice — query `dialer_numbers_{dialerCampaignId}` on `dialer_mailings` DB:

```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status IN (2,3) THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN status NOT IN (2,3) THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN call_status = 'ANSWER' THEN 1 ELSE 0 END) as answered,
  SUM(CASE WHEN call_status = 'ANSWER' AND billsec = 0 THEN 1 ELSE 0 END) as answered_billsec_zero,
  SUM(CASE WHEN call_status IN ('NO_ANSWER', 'CANCEL') THEN 1 ELSE 0 END) as not_answered,
  SUM(CASE WHEN call_status = 'BUSY' THEN 1 ELSE 0 END) as busy,
  SUM(CASE WHEN call_status IN ('FAILED', 'CONGESTION') THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status IN (2,3) THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as progress_percent,
  ROUND(AVG(CASE WHEN call_status = 'ANSWER' AND billsec > 0 THEN billsec END), 1) as avg_duration_seconds
FROM dialer_numbers_{dialerCampaignId}
```

SMS — query `sms_numbers_{actionId}` on `sms_mailings` DB:

```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as pending,
  COALESCE(SUM(credits), 0) as total_credits,
  ROUND(SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as progress_percent
FROM sms_numbers_{actionId}
```

## Implementation

| Layer | File | Action |
|-------|------|--------|
| Service | `src/modules/broadcasts/services/broadcast-execution-progress.service.ts` | New file. Query mailing DBs. Cache in Redis 60s. |
| Controller | `src/modules/broadcasts/controllers/broadcasts.controller.ts` | Add `getExecutionProgress` handler. |
| Routes | `src/modules/broadcasts/routes/broadcasts.routes.ts` | Add `GET /schedules/:id/execution-progress`. |

## Redis Cache

Key pattern: `broadcast:exec-progress:{actionId}`
TTL: 60 seconds.

Use existing `redis` from `@/infra/redis/redis`.
Use existing `mailingSequelize` and `smsMailingsSequelize` sequelize instances from `@/infra/database/sequelize` (same ones used by `broadcast-sends.repository.ts`).

## Constraints

- Return `null` for `progress` if table does not exist (ER_NO_SUCH_TABLE) — do NOT throw.
- Return `null` if schedule `statusId !== 4` (only serve progress for actively running schedules).
- Sanitize `dialerCampaignId` and `actionId` with `Number()` before interpolating into table names (SQL injection prevention via same pattern used in `broadcast-sends.repository.ts`).
- Must validate the schedule belongs to the authenticated client before querying.
- Do NOT refactor existing `resolveQueueProgress` — this is a separate concern (execution progress vs audience loading progress).

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
