---
id: broadcast-schedule-submissions-analysis-status
title: Broadcast Schedule Honors Client Submissions Analysis Status
scope: broadcast-schedules
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/broadcast-legacy-flow.md
---

## Goal

Align the new `platform-api` broadcast scheduling flow with the legacy client review rule: when the authenticated client's `clients.submissions_analysis` flag is filled with `'1'`, a confirmed broadcast schedule must create the legacy `actions` row with status `2` (`IN_ANALYSIS`) instead of status `3` (`SCHEDULED`).

## Legacy Evidence

The legacy implementation lives in `areadocliente/application/services/Action_service.php` in `getSendStatus()`.

Key behavior:

- `$statusEnvio` defaults to `ActionStatus::SCHEDULED`.
- If `$client['submissions_analysis'] == 1`, the method forces `$statusEnvio = ActionStatus::IN_ANALYSIS`.
- `areadocliente/application/constants/ActionStatus.php` defines:
  - `DRAFT = 1`
  - `IN_ANALYSIS = 2`
  - `SCHEDULED = 3`

The same forced analysis branch also applies to lead-profile clients and non-client-created sends in the legacy method, but this task is scoped only to the explicit `clients.submissions_analysis = '1'` requirement.

## Current New-Platform Behavior

`platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts` currently creates `BroadcastSendModel` with `statusId: 3` fixed. It then writes the same status to `actions_has_status` through `insertStatus(created.id, created.statusId, ...)`.

That means clients configured for submission analysis are currently scheduled directly as status `3`, diverging from the legacy behavior.

The existing `ClientModel` in `platform-api/src/modules/clients/models/client.model.ts` does not expose `submissions_analysis` yet, so implementation should add the minimum client-read surface needed by the scheduling path.

## Required Behavior

When `POST /broadcasts/actions/:id/schedules` confirms a schedule:

- Read the scheduling client's `clients.submissions_analysis` value from the legacy `clients` table.
- If the value is `'1'` or equivalent legacy truthy value, create `actions.status_id = 2`.
- Insert the matching `actions_has_status.status_id = 2` history row.
- Otherwise keep the current scheduled behavior with `actions.status_id = 3`.
- Keep the response `send.statusId` aligned with the persisted status.

## Implementation Notes

Prefer a small status resolver near the scheduling boundary or repository layer instead of spreading magic numbers through the code. If constants are introduced, name them after the legacy statuses (`DRAFT`, `IN_ANALYSIS`, `SCHEDULED`) and document only where it clarifies the legacy mapping.

The implementation should avoid changing billing or balance behavior in this task. A client may still pass schedule/balance validation, but the created send should wait in analysis when `submissions_analysis` requires it.

For voice broadcasts, confirm whether the current dialer materialization and mailing queue behavior should still run for status `2`. If legacy behavior or runtime expectations imply analysis sends must not be queued as executable, document and implement the correct guard in this same task. Do not silently enqueue status `2` voice sends if that would bypass analysis.

## Test Coverage

Add focused tests proving:

- A client with `submissions_analysis = '1'` creates an `actions` row with `statusId/status_id = 2`.
- The corresponding `actions_has_status` insert receives `status_id = 2`.
- A client without the flag keeps the existing status `3` behavior.
- The API response maps the chosen status back through `send.statusId`.

## Docs Alignment

Update `platform-api` human docs for broadcasts to state that scheduled sends can enter `IN_ANALYSIS` when the client has `submissions_analysis = '1'`, matching the legacy `Action_service::getSendStatus()` rule.
