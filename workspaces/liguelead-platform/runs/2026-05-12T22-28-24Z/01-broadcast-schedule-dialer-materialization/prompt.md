You are running one shared Ecosystem AI Runner stage for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Batch id: broadcast-schedule-dialer-materialization
Batch label: Broadcast Schedule Dialer Campaign And Mailing Materialization

Execution goals:
- Execute every task listed below in the same agent session.
- Use the task repository ownership to decide where to edit code.
- Keep cross-repository contract changes aligned across all affected repositories.
- Keep execution summaries short and operational to control token cost.
- Update repo docs only when the implementation is stable enough to describe the real module behavior.
- If the result is partial or needs another pass, record gaps and rework instead of writing large final docs.
- Do not revert unrelated user changes.
- Run the narrowest useful validation in each touched repository.

Repositories and tasks in this batch:

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

Mandatory tasks for this repository in the current batch:
- broadcast-schedule-dialer-materialization: Broadcast Schedule Dialer Campaign And Mailing Materialization

### broadcast-schedule-dialer-materialization
Task id: broadcast-schedule-dialer-materialization
Task title: Broadcast Schedule Dialer Campaign And Mailing Materialization
Task file: broadcast-schedule-dialer-materialization.md
Task status: open
Task scope: broadcast-schedule-dialer-materialization
Docs targets: platform-api:docs/human/modules/broadcasts.md, platform-api:docs/human/modules/broadcast-legacy-flow.md
Task validation: npm run typecheck ; npm run build ; npm test

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/2026-05-12T22-28-24Z/01-broadcast-schedule-dialer-materialization/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Batch: broadcast-schedule-dialer-materialization
- Repositories:
- Tasks:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
