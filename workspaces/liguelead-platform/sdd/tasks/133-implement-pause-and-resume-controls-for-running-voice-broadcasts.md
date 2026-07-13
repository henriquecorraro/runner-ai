---
id: implement-pause-and-resume-controls-for-running-voice-broadcasts
title: Implement pause and resume controls for running voice broadcasts
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
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4707285514
github_issue_number: 58
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/58
github_issue_node_id: I_kwDORpoJ688AAAABGJN6Cg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/58
  - https://github.com/ligue-lead-tech/platform-front/issues/79
github_project_item_id: 202730580
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwVbFQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202730580"
github_project_status: Done
---

# Deliverables

| Repository | Work |
| --- | --- |
| `platform-api` | Add authenticated pause/resume mutation for running voice broadcasts created/managed by the new platform. |
| `platform-front` | Add pause/resume toggle in the schedules list and details flow for eligible voice broadcasts. |

# Eligibility

| Field | Required value |
| --- | --- |
| `actions.status_id` | `4` |
| `actions.dialer_id` | `2` |
| `actions.types_id` | `1` or `2` |
| `actions.deleted` | `0` |

Reject every other action with `409`.

# API contract

Create route:

```ts
POST /broadcasts/schedules/:id/pause
```

Request body:

```ts
type BroadcastSchedulePauseRequest = {
  paused: boolean;
};
```

Response body:

```ts
type BroadcastSchedulePauseResponse = {
  id: number;
  statusId: number;
  statusLabel: string;
  paused: boolean;
  pausedAt: string | null;
  updatedAt: string | null;
};
```

# platform-api rules

- Do not change `actions.status_id` when pausing or resuming.
- Do update `actions.dialer_paused` to `1` when `paused=true` and `0` when `paused=false`.
- Do update `actions.updater_name` with authenticated user name on every pause/resume mutation.
- Do update `dialer.dialer_campaigns.status`:
  - `2` when `paused=true`
  - `1` when `paused=false`
- Do verify the action belongs to authenticated client.
- Do verify `dialer_campaign_id` is present and the dialer campaign row exists.
- Do make the action update and dialer campaign update atomic from the API point of view. Fail the request if either update cannot be applied.
- Do make repeated requests idempotent:
  - pause when already paused returns `200` with unchanged state
  - resume when already active returns `200` with unchanged state
- Do emit semantic audit events through the audit module.

# Audit events

Emit domain audit events into `audit_events` using `auditUserAction`.

| Operation | `action` | `resourceType` | Required metadata |
| --- | --- | --- | --- |
| Pause | `broadcast.paused` | `broadcast_schedule` | `actionId`, `dialerCampaignId`, `previousDialerPaused`, `nextDialerPaused` |
| Resume | `broadcast.resumed` | `broadcast_schedule` | `actionId`, `dialerCampaignId`, `previousDialerPaused`, `nextDialerPaused` |

Use `resourceId = String(actions.id)`.

# Schedule payload changes

Extend schedule list/detail payloads:

```ts
type BroadcastScheduleResponse = {
  paused: boolean;
  pausedAt: string | null;
};
```

Rules:
- `paused = actions.dialer_paused === 1`
- `pausedAt` = latest matching `audit_events.created_at` for `broadcast.paused` on this action when currently paused; otherwise `null`
- `statusLabel` override:
  - when `statusId === 4 && paused === true`, return `"PAUSADO"`
  - otherwise preserve current mapping

# platform-front rules

- Show the toggle only when the schedule matches the eligibility table.
- Use confirmation copy:
  - pause: `Pausando os envios, eles deixarão de ser processados até serem inicializados novamente.`
  - resume: `Inicializando os envios, eles voltarão a ser processados normalmente.`
- Call the new API route with explicit `paused` boolean.
- Update list and details views optimistically only after success.
- Reuse existing loading/error patterns from the schedules screen.
- Render paused state with the overridden `PAUSADO` label from the API.

# Errors

| Case | HTTP | Code |
| --- | --- | --- |
| Schedule not found for client | `404` | `BROADCAST_SCHEDULE_NOT_FOUND` |
| Schedule not eligible for pause/resume | `409` | `BROADCAST_SCHEDULE_NOT_PAUSABLE` |
| Dialer campaign missing/inconsistent | `409` | `BROADCAST_SCHEDULE_DIALER_CAMPAIGN_NOT_FOUND` |
| Invalid body | `400` | standard validation error |

# Files

```text
platform-api/src/modules/broadcasts/controllers/broadcasts.controller.ts
platform-api/src/modules/broadcasts/routes/broadcasts.routes.ts
platform-api/src/modules/broadcasts/use-cases/broadcast-scheduling.use-cases.ts
platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts
platform-api/src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts
platform-api/src/modules/broadcasts/entities/broadcast-send.entity.ts
platform-api/src/modules/audit/services/audit-user-action.service.ts
platform-front/src/pages/Broadcasts/**
platform-front/src/service/broadcasts/**
```

# Tests

- Add repository/use-case/controller tests for eligibility, idempotency, dialer updates, payload shape, and audit event emission.
- Add frontend service/view tests only if the repository already has nearby coverage patterns.

# Do not

- Do not overload `actions_has_status` for pause/resume.
- Do not map pause to legacy terminal statuses.
- Do not make SMS or SMS Flash schedules pausable.
- Do not infer pause state from `dialer_campaigns.status` alone; persist and read `actions.dialer_paused` as source of truth.
