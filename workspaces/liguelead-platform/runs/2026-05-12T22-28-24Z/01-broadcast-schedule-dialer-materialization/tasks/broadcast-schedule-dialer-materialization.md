---
id: broadcast-schedule-dialer-materialization
title: Broadcast Schedule Dialer Campaign And Mailing Materialization
scope: broadcast-schedule-dialer-materialization
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
  - npm test
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - platform-api-multi-database-connections
---

## Goal

Extend the new `platform-api` broadcast scheduling flow so `POST /broadcasts/actions/:id/schedules` not only inserts the legacy `actions` snapshot, but also materializes the dialer-side runtime artifacts required for voice execution.

## Affected Behavior

When a schedulable voice broadcast is confirmed, the new flow must create the corresponding row in `dialer.dialer_campaigns` and create or populate the dynamic queue table in `dialer_mailings.dialer_numbers_<id>`, following the legacy runtime expectations closely enough for the scheduled action to become executable by the dialer pipeline.

This task is specifically about the runtime materialization step after the schedule is accepted. It should cover the generated campaign binding and the dynamic mailing queue lifecycle needed by the voice scheduler.

## Implementation Constraints

- Keep `actions` as the canonical legacy schedule row created by the new flow.
- Use the new multi-database bootstrap to write to the correct `discador_liguelead` and `dialer_mailings` connections.
- Preserve current scheduling behavior for non-voice broadcasts unless the legacy runtime explicitly requires additional materialization.
- Be explicit about how `dialer_campaign_id` is generated, stored back into `actions`, and reused to name the dynamic queue table.
- Mirror the legacy population rules for audience inclusion and exclusion as closely as possible, including lead-list based resolution and the fields needed by downstream dialer processing.
- If any legacy schema mismatch or unsupported runtime dependency remains, document it clearly in the task result instead of silently skipping the artifact creation.

## Docs Alignment

Update the human docs to describe that the new schedule flow now materializes the dialer campaign and dynamic mailing queue for voice broadcasts, and record any remaining divergence from the legacy runtime if applicable.

## Validation Expectations

- TypeScript typecheck must pass.
- The project must build successfully.
- The existing automated test suite must keep passing.
- Add focused coverage for the schedule path so it proves `actions`, `dialer.dialer_campaigns`, and the dynamic `dialer_mailings` table materialization are coordinated correctly for voice scheduling.
