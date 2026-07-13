---
id: add-execution-timeline-and-pause-summary-to-voice-broadcast-reports
title: Add execution timeline and pause summary to voice broadcast reports
scope: broadcasts
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - platform-api: npm run typecheck
  - platform-api: npm test
  - platform-api: npm run build
  - platform-front: npm run lint
  - platform-front: npm run build
docs_targets:
  - platform-api/docs/human/modules/broadcasts.md
  - platform-front/docs/features/broadcasts.md
depends_on:
  - implement-pause-and-resume-controls-for-running-voice-broadcasts
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4707288163
github_issue_number: 59
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/59
github_issue_node_id: I_kwDORpoJ688AAAABGJOEYw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/59
  - https://github.com/ligue-lead-tech/platform-front/issues/80
github_project_item_id: 202730662
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwVbKY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202730662"
github_project_status: Done
---

# Deliverables

| Repository | Work |
| --- | --- |
| `platform-api` | Extend voice report payload with execution timeline and pause metrics derived from persisted history. |
| `platform-front` | Render report timeline block and pause summary using the new payload. |

# Report contract

Extend:

```ts
GET /broadcasts/schedules/:id/report
```

Response additions:

```ts
type BroadcastReportTimelineEvent = {
  kind: "status" | "pause" | "resume";
  statusId: number | null;
  statusLabel: string;
  actorName: string | null;
  actorSource: "user" | "system" | "legacy";
  actorDetail: string | null;
  byMethod: string | null;
  createdAt: string;
};

type BroadcastReportPauseSummary = {
  totalPauses: number;
  totalPausedSeconds: number;
  currentPauseStartedAt: string | null;
  isCurrentlyPaused: boolean;
};

type BroadcastVoiceReportResponse = {
  timeline: BroadcastReportTimelineEvent[];
  pauses: BroadcastReportPauseSummary;
};
```

# Data sources

| Concern | Source |
| --- | --- |
| Status transitions | `actions_has_status` |
| Pause/resume transitions | `audit_events` semantic events from pause task |
| Actor display name | `users.name` from `created_by` / `user_id` |
| Fallback actor source | `by_method`, audit source, route metadata |

# platform-api query rules

- Load `actions_has_status` ordered by `created_at ASC, id ASC`.
- Load `audit_events` for this action ordered by `created_at ASC, id ASC` with:
  - `resource_type = 'broadcast_schedule'`
  - `resource_id = String(actions.id)`
  - `action IN ('broadcast.paused', 'broadcast.resumed')`
- Merge both sources into one ascending timeline.
- Deduplicate consecutive status events when all of these match:
  - same `kind = 'status'`
  - same `statusId`
  - same `statusLabel`
  - timestamps within 5 seconds
- Do not deduplicate pause/resume events.

# Status label mapping

Inline mapping for timeline events:

| `status_id` | label |
| --- | --- |
| `1` | `RASCUNHO` |
| `2` | `EM ANÁLISE` |
| `3` | `AGENDADO` |
| `4` | `INICIADO` |
| `6` | `CANCELADO` |
| `7` | `CONCLUÍDO` |
| `8` | `EXPIRADO` |

Pause/resume labels:

| kind | label |
| --- | --- |
| `pause` | `PAUSADO` |
| `resume` | `RETOMADO` |

# Actor mapping

Rules:
- `actions_has_status.created_by` joined to `users.id` => `actorSource = 'user'`, `actorName = users.name`
- `audit_events.user_id` joined to `users.id` => `actorSource = 'user'`, `actorName = users.name`
- `by_method = 'Acoes::acoes_post'` => `actorSource = 'legacy'`, `actorDetail = 'legacy scheduler'`
- `by_method` starting with `platform-api-` => `actorSource = 'system'`, `actorDetail = by_method`
- missing user and missing method mapping => `actorSource = 'system'`, `actorDetail = null`

# Pause summary rules

- `totalPauses` = count of `broadcast.paused` events.
- Build intervals by pairing each pause with the next resume after it.
- Ignore unmatched resume events before the first pause.
- `totalPausedSeconds` = sum of paired intervals in seconds.
- If the latest pause has no later resume:
  - `isCurrentlyPaused = true`
  - `currentPauseStartedAt = latest pause timestamp`
  - for non-terminal actions, include open interval duration using `NOW()`
  - for terminal actions (`6`, `7`, `8`), do not extend beyond the action terminal timestamp from the last terminal timeline event
- If no open pause exists:
  - `isCurrentlyPaused = false`
  - `currentPauseStartedAt = null`

# platform-front rendering

- Add a report section below the metric cards and above the detailed report charts/tables.
- Render timeline items in chronological order using the payload order.
- Show event label, formatted timestamp, actor name/detail, and visual distinction for pause/resume items.
- Render `PAUSAS` summary from `pauses.totalPauses` and `pauses.totalPausedSeconds`.
- If there are no pause events, render `PAUSAS: Nenhuma`.
- Reuse loading/skeleton patterns already used on the report page.

# Errors

- Preserve current `404` and report-not-found behavior.
- Do not fail the report when no pause events exist; return empty timeline additions and zeroed pause summary.

# Files

```text
platform-api/src/modules/broadcasts/entities/broadcast-send.entity.ts
platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts
platform-api/src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts
platform-api/src/modules/broadcasts/use-cases/broadcast-scheduling.use-cases.ts
platform-front/src/pages/Broadcasts/**
platform-front/src/service/broadcasts/**
```

# Tests

- Add backend tests for merge ordering, deduplication, actor mapping, zero-pause case, paired pause durations, and open pause duration handling.
- Add frontend tests only if nearby report-page patterns already exist.

# Do not

- Do not synthesize pause events from `actions.dialer_paused` alone.
- Do not use raw `updated_at` as timeline source.
- Do not drop duplicate terminal status protection; keep backend deduplication for repeated `status 7` writes.
- Do not block timeline rollout on adding new legacy pause persistence beyond audit events.
