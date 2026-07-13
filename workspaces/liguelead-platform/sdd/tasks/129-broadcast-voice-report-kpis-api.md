---
id: broadcast-voice-report-kpis-api
title: Add voice report KPI fields to platform API
scope: broadcast-reports
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- broadcast-voice-close-worker broadcast-sends.repository broadcast-scheduling.use-cases
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4697216817
github_issue_number: 49
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/49
github_issue_node_id: I_kwDORpoJ688AAAABF_nXMQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/49
github_project_item_id: 202211348
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNgBQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202211348"
github_project_status: Done
---

## Files

| Path | Change |
| --- | --- |
| `src/modules/broadcasts/entities/broadcast-send.entity.ts` | Extend `BroadcastVoiceReportEntity.summary`. |
| `src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts` | Expose new summary fields. |
| `src/modules/broadcasts/repositories/broadcast-sends.repository.ts` | Select new persisted columns in `getVoiceReport`. |
| `src/modules/broadcasts/services/broadcast-voice-close.service.ts` | Compute and persist new fields during voice close. |
| `tests/broadcast-sends.repository.spec.ts` | Cover selected fields. |
| `tests/broadcast-voice-close-worker.spec.ts` | Cover computed/persisted fields. |
| `tests/broadcast-scheduling.use-cases.spec.ts` | Cover report use case fixture fields. |
| `tests/contracts/route-contract.fixtures.ts` | Update fixtures. |
| `docs/human/modules/broadcasts.md` | Document persisted report KPI fields. |

## Database

Do not add report analytics columns to `actions`.
Do not add `last_snapshot_at`.

Add migration for `action_voice_reports`:

```sql
ALTER TABLE action_voice_reports
  ADD COLUMN avg_listened_seconds int unsigned NOT NULL DEFAULT 0 AFTER credits_to_charge,
  ADD COLUMN total_listened_seconds bigint unsigned NOT NULL DEFAULT 0 AFTER avg_listened_seconds,
  ADD COLUMN billable_calls int unsigned NOT NULL DEFAULT 0 AFTER total_listened_seconds,
  ADD COLUMN failed_count int unsigned NOT NULL DEFAULT 0 AFTER billable_calls;
```

Keep `action_voice_report_duration_buckets` unchanged.

## Summary Contract

```ts
type BroadcastVoiceReportSummary = {
  totalDialed: number
  answered: number
  notAnswered: number
  answeredPercent: number
  notAnsweredPercent: number
  dtmfCount: number
  dtmfPercent: number
  interactionSmsSent: number
  credits: number
  creditsToCharge: number
  avgListenedSeconds: number
  totalListenedSeconds: number
  billableCalls: number
  failedCount: number
}
```

## Computation

| Field | Rule |
| --- | --- |
| `total_listened_seconds` | Sum `billsec` for all dialer rows with numeric `billsec > 0`. |
| `avg_listened_seconds` | `Math.round(total_listened_seconds / answered)` when `answered > 0`; otherwise `0`. |
| `billable_calls` | Count rows charged by the billing plan: `call_status = 'ANSWER'`, `billsec > 0`, `tariffed = 0` before close. |
| `failed_count` | `total_dialed - answered - not_answered` only if positive; otherwise `0`. |

## Output

`GET /broadcasts/schedules/:id/report` must include the new summary fields.
Existing error behavior must remain unchanged:

| Case | Status |
| --- | --- |
| Unsupported report type | `409` |
| Report not generated | `404` |
| Schedule not found/client mismatch | `404` |

## Constraints

Do not use S3 JSON payloads.
Do not change CSV download behavior.
Do not duplicate duration bucket data into `actions`.
