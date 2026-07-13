---
id: persist-voice-report-engagement-and-status-analytics
title: Persist voice report engagement and status analytics
scope: broadcast-voice-report-analytics
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- broadcast-voice-close-worker broadcast-sends.repository voice-report-kpi-backfill broadcast-scheduling.use-cases
  - npm run build
docs_targets:
  - docs/human/modules/broadcasts.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4708524881
github_issue_number: 60
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/60
github_issue_node_id: I_kwDORpoJ688AAAABGKZjUQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/60
github_project_item_id: 202792380
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwWXbw
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202792380"
github_project_status: Done
---

## Data model

```sql
ALTER TABLE action_voice_reports
  ADD COLUMN audio_duration_seconds INT UNSIGNED NULL AFTER failed_count,
  ADD COLUMN fully_listened_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER audio_duration_seconds;

CREATE TABLE action_voice_report_status_buckets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  actions_id INT UNSIGNED NOT NULL,
  status_key VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  total INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_action_voice_status_bucket (actions_id, status_key),
  KEY idx_action_voice_status_action (actions_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- Add an idempotent next-numbered migration.
- Persist analytics during `BroadcastVoiceCloseService` report construction.
- Extend `scripts/backfill-voice-report-kpis.ts` to populate both fields and status buckets from each `dialer_numbers_<dialer_campaign_id>` table.
- Read audio duration from `audios.audio_time` through the action audio relation.
- Convert `audio_time` to integer seconds.
- Set `fully_listened_count` to answered rows with `billsec >= CEIL(audio_duration_seconds * 0.90)`.
- Return `audio_duration_seconds = NULL` and `fully_listened_count = 0` when audio duration is unavailable.

## Status mapping

| status_key | label | source rule |
|---|---|---|
| answered | Atendida | `call_status = ANSWER`; include calls classified as mailbox by the dialer |
| not_answered | Não atendida | `call_status IN (NO_ANSWER, NOANSWER, CANCEL)` |
| busy_congestion | Ocupado / congestão | `call_status IN (BUSY, CONGESTION)` |
| invalid_no_route | Inválido / sem rota | `call_status = NOT_FOUND` or any non-empty unmapped status |

- Exclude null/blank `call_status` from status buckets; preserve it in `not_dialed`.
- Persist all four bucket keys, including zero totals.
- Do not create a separate voicemail/mailbox bucket; mailbox is part of `answered` in the current dialer contract.
- Do not query `voice_result` or `voice_result_failures` as the authoritative source.

## Response contract

Extend `GET /broadcasts/schedules/:id/report`:

```ts
type VoiceReportAnalytics = {
  engagement: {
    totalDialed: number;
    answered: number;
    fullyListened: number;
    audioDurationSeconds: number | null;
    fullyListenedThresholdPercent: 90;
    answeredPercentOfDialed: number;
    fullyListenedPercentOfAnswered: number;
  };
  statusDistribution: Array<{
    key: "answered" | "not_answered" | "busy_congestion" | "invalid_no_route";
    label: string;
    total: number;
    percentOfDialed: number;
  }>;
};
```

- Percentages must use two-decimal precision.
- Zero denominators must return `0`.
- Preserve existing `summary`, `durationBuckets`, `timeline`, and `pauses` fields.
- Update entities, repository queries, response mapper, contracts, schemas, fixtures, tests, and `docs/human/modules/broadcasts.md`.

## Validation

```bash
npm run typecheck
npm test -- broadcast-voice-close-worker broadcast-sends.repository voice-report-kpi-backfill broadcast-scheduling.use-cases
npm run build
```
