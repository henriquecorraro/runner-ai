You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: persist-voice-report-engagement-and-status-analytics
Title: Persist voice report engagement and status analytics

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### persist-voice-report-engagement-and-status-analytics
Task id: persist-voice-report-engagement-and-status-analytics
Task title: Persist voice report engagement and status analytics
Task status: open
Task scope: broadcast-voice-report-analytics
Task validation: npm run typecheck ; npm test -- broadcast-voice-close-worker broadcast-sends.repository voice-report-kpi-backfill broadcast-scheduling.use-cases ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781996029903-04mxft/01-persist-voice-report-engagement-and-status-analytics/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: persist-voice-report-engagement-and-status-analytics
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
