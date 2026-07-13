---
id: broadcast-action-aggregate-report-api
title: Broadcast Action Aggregate Report API
scope: broadcast-action-reporting
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sends.repository.spec.ts tests/broadcast-scheduling.use-cases.spec.ts tests/contract-validation.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:report-schemas.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4748133734
github_issue_number: 79
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/79
github_issue_node_id: I_kwDORpoJ688AAAABGwLFZg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/79
github_project_item_id: 205046364
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgw4wlw
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205046364"
github_project_status: Done
---

## Files

| Path | Operation |
| --- | --- |
| `src/modules/broadcasts/contracts/broadcasts.contracts.ts` | add action report input/output types |
| `src/modules/broadcasts/entities/broadcast-send.entity.ts` | add aggregate report entity types |
| `src/modules/broadcasts/repositories/broadcast-sends.repository.ts` | add aggregate report queries |
| `src/modules/broadcasts/use-cases/broadcast-scheduling.use-cases.ts` | add use case |
| `src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts` | add response mapper |
| `src/modules/broadcasts/controllers/broadcasts.controller.ts` | add controller method |
| `src/modules/broadcasts/routes/broadcasts.routes.ts` | add route before `/actions/:id` |
| `src/modules/broadcasts/schemas/broadcasts.schemas.ts` | reuse `broadcastActionIdParamSchema` |
| `tests/broadcast-sends.repository.spec.ts` | cover aggregate SQL/mapping |
| `tests/broadcast-scheduling.use-cases.spec.ts` | cover use-case behavior |
| `tests/contract-validation.spec.ts` or route registry fixture | cover route contract |
| `docs/human/modules/broadcasts.md` | document endpoint/aggregation |

## Route

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| `GET` | `/broadcasts/actions/:id/report` | session client | `200` |

## Not Found

| Case | Status | Code |
| --- | --- | --- |
| `broadcast_actions.id` missing for authenticated client | `404` | `BROADCAST_ACTION_NOT_FOUND` |
| no linked schedules | `200` | return empty aggregates with `scheduleCount = 0` |
| linked schedules exist but no generated per-schedule reports | `200` | return `generatedReportCount = 0`, zero report metrics |

## Contract

```ts
type BroadcastActionReportResponse = {
  broadcastAction: {
    id: string;
    title: string;
    description: string | null;
    typeId: 1 | 2 | 3 | 4;
    status: "draft" | "saved" | "archived";
    createdAt: string;
    updatedAt: string | null;
  };
  reportType: "voice" | "sms";
  scheduleCount: number;
  generatedReportCount: number;
  latestScheduleAt: string | null;
  latestReportAt: string | null;
  totals: {
    totalShipping: number;
    totalCredits: number;
    chargedAmount: number;
  };
  voice?: {
    summary: {
      totalDialed: number;
      totalAttempts: number;
      notDialed: number;
      answered: number;
      notAnswered: number;
      answeredPercent: number;
      notAnsweredPercent: number;
      dtmfCount: number;
      dtmfPercent: number;
      interactionSmsSent: number;
      credits: number;
      creditsToCharge: number;
      chargedAmount: number;
      avgListenedSeconds: number;
      totalListenedSeconds: number;
      billableCalls: number;
      failedCount: number;
    };
    engagement: {
      totalDialed: number;
      answered: number;
      fullyListened: number;
      audioDurationSeconds: number | null;
      fullyListenedThresholdPercent: 90;
      answeredPercentOfDialed: number;
      fullyListenedPercentOfAnswered: number;
    };
    durationBuckets: Array<{ label: string; minSeconds: number; maxSeconds: number | null; total: number }>;
    statusDistribution: Array<{ key: "answered" | "not_answered" | "busy_congestion" | "invalid_no_route"; label: string; total: number; percentOfDialed: number }>;
  };
  sms?: {
    summary: {
      totalLeads: number;
      totalSent: number;
      sentPercent: number;
    };
  };
  schedules: Array<{
    id: number;
    typeId: 1 | 2 | 3 | 4;
    statusId: number;
    statusLabel: string;
    date: string;
    startTime: string | null;
    limitTime: string | null;
    totalShipping: number;
    campaignId: number | null;
    campaignName: string | null;
    reportGenerated: boolean;
    reportUrl: string | null;
    summary: Record<string, number> | null;
  }>;
};
```

## SQL

```sql
SELECT
  broadcast_actions.id,
  broadcast_actions.title,
  broadcast_actions.description,
  broadcast_actions.types_id AS typeId,
  broadcast_actions.status,
  broadcast_actions.created_at AS createdAt,
  broadcast_actions.updated_at AS updatedAt
FROM broadcast_actions
WHERE broadcast_actions.clients_id = :clientId
  AND broadcast_actions.id = :broadcastActionId
  AND broadcast_actions.deleted = '0'
LIMIT 1;
```

```sql
SELECT
  actions.id,
  actions.types_id AS typeId,
  actions.status_id AS statusId,
  actions.date,
  actions.start_time AS startTime,
  actions.limit_time AS limitTime,
  actions.total_shipping AS totalShipping,
  actions.campaign_id AS campaignId,
  campaigns.title AS campaignName,
  actions.action_report_url AS smsReportUrl,
  voice.report_url AS voiceReportUrl,
  voice.total_dialed AS totalDialed,
  voice.total_attempts AS totalAttempts,
  voice.not_dialed AS notDialed,
  voice.answered,
  voice.not_answered AS notAnswered,
  voice.dtmf_count AS dtmfCount,
  voice.interaction_sms_sent AS interactionSmsSent,
  voice.credits,
  voice.credits_to_charge AS creditsToCharge,
  voice.avg_listened_seconds AS avgListenedSeconds,
  voice.total_listened_seconds AS totalListenedSeconds,
  voice.billable_calls AS billableCalls,
  voice.failed_count AS failedCount,
  voice.audio_duration_seconds AS audioDurationSeconds,
  voice.fully_listened_count AS fullyListenedCount,
  actions.total_send_sms AS totalSmsSent,
  COALESCE((
    SELECT SUM(actions_has_fees.quantity * actions_has_fees.unity_value)
    FROM actions_has_fees
    WHERE actions_has_fees.actions_id = actions.id
      AND actions_has_fees.status = 'used'
  ), 0) AS chargedAmount,
  COALESCE(voice.updated_at, actions.updated_at, actions.created_at) AS reportUpdatedAt
FROM actions
LEFT JOIN action_voice_reports voice
  ON voice.actions_id = actions.id
LEFT JOIN campaigns
  ON campaigns.id = actions.campaign_id
 AND campaigns.clients_id = actions.clients_id
 AND campaigns.deleted = '0'
WHERE actions.clients_id = :clientId
  AND actions.broadcast_action_id = :broadcastActionId
  AND actions.status_id != 1
  AND actions.deleted = 0
ORDER BY actions.date DESC, actions.start_time DESC, actions.id DESC;
```

```sql
SELECT
  buckets.label,
  buckets.min_seconds AS minSeconds,
  buckets.max_seconds AS maxSeconds,
  SUM(buckets.total) AS total
FROM action_voice_report_duration_buckets buckets
JOIN actions
  ON actions.id = buckets.actions_id
WHERE actions.clients_id = :clientId
  AND actions.broadcast_action_id = :broadcastActionId
  AND actions.deleted = 0
GROUP BY buckets.label, buckets.min_seconds, buckets.max_seconds
ORDER BY buckets.min_seconds ASC;
```

```sql
SELECT
  buckets.status_key AS statusKey,
  buckets.label,
  SUM(buckets.total) AS total
FROM action_voice_report_status_buckets buckets
JOIN actions
  ON actions.id = buckets.actions_id
WHERE actions.clients_id = :clientId
  AND actions.broadcast_action_id = :broadcastActionId
  AND actions.deleted = 0
GROUP BY buckets.status_key, buckets.label
ORDER BY FIELD(buckets.status_key, 'answered', 'not_answered', 'busy_congestion', 'invalid_no_route');
```

## Aggregation Rules

| Field | Rule |
| --- | --- |
| `scheduleCount` | count linked `actions` rows |
| `generatedReportCount` | count rows with `action_voice_reports` for voice; count SMS rows where `actions.total_send_sms IS NOT NULL` for SMS |
| `totals.totalShipping` | sum `actions.total_shipping` for linked schedules |
| `totals.totalCredits` | voice: sum `action_voice_reports.credits`; SMS: sum `actions_has_fees.quantity` with `status = 'used'` or 0 when not available |
| `totals.chargedAmount` | sum `actions_has_fees.quantity * unity_value` with `status = 'used'` |
| `voice.* count metrics` | sum per action report rows |
| `voice.answeredPercent` | `answered / totalDialed * 100`, 0 when denominator is 0 |
| `voice.notAnsweredPercent` | `notAnswered / totalDialed * 100`, 0 when denominator is 0 |
| `voice.dtmfPercent` | `dtmfCount / totalDialed * 100`, 0 when denominator is 0 |
| `voice.avgListenedSeconds` | weighted average: `totalListenedSeconds / billableCalls`, rounded down to integer; 0 when denominator is 0 |
| `voice.engagement.audioDurationSeconds` | value only when every generated voice report has the same non-null duration; otherwise `null` |
| `voice.engagement.fullyListenedPercentOfAnswered` | `fullyListened / answered * 100`, 0 when denominator is 0 |
| `voice.statusDistribution.percentOfDialed` | bucket total / aggregate `totalDialed` * 100 |
| `sms.summary.totalLeads` | sum `actions.total_shipping` |
| `sms.summary.totalSent` | sum `actions.total_send_sms` where non-null |
| `sms.summary.sentPercent` | `totalSent / totalLeads * 100`, 0 when denominator is 0 |

## Constraints

- Do not aggregate legacy schedules with `broadcast_action_id IS NULL`.
- Do not synthesize per-schedule voice metrics from dynamic dialer tables.
- Do not read CSV files from S3 for aggregate metrics.
- Do not expose internal S3 URLs beyond existing `reportUrl` fields.
- Keep schedule report endpoints unchanged.
- Keep all queries client-scoped by `actions.clients_id` and `broadcast_actions.clients_id`.
- Route order must keep `/actions/:id/report` before `/actions/:id`.
- Percentages must use two decimal places.

## Documentation

- Document aggregate route, denominator rules, missing report behavior, and schedule drill-down list.
- State that per-schedule CSV download remains `/broadcasts/schedules/:id/report/download`.
