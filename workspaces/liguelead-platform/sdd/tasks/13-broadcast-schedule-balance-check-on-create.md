---
id: broadcast-schedule-balance-check-on-create
title: Check broadcast schedule balance during creation
scope: broadcast-schedule-billing
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npx vitest run tests/broadcast-billing.service.spec.ts tests/broadcast-action.schemas.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
---

## Goal

Move the decisive broadcast cost check into schedule creation. When an authenticated client schedules a broadcast, the API must calculate the total sending cost, check whether the client has enough balance, and only create the schedule when the balance is sufficient.

## Affected Behavior

`POST /broadcasts/actions/:id/schedules` must no longer trust a prior frontend estimate as a scheduling precondition. The schedule flow must:

- resolve the target audience exactly as the current schedule creation flow does
- calculate the total cost using the same billing rules that apply to schedule estimates, including the current interactive voice worst-case-per-lead rule
- check the logged client's available balance before creating legacy `actions`, queue tables, dialer campaign rows, or async mailing jobs
- allow scheduling normally when balance is sufficient
- reject scheduling when balance is insufficient and return a structured response containing `totalCost`, `availableBalance`, and `missingAmount`

## Implementation Constraints

- Keep the charging/balance decision behind a small interface/port such as `BroadcastBalanceProvider`, `ClientBalanceGateway`, or equivalent naming that matches the repository style.
- Provide the current implementation using existing local data/source-of-truth for client balance, but keep the caller decoupled so a future implementation can call a billing microservice without changing schedule orchestration.
- Do not debit balance in this task unless the existing system already does that as part of scheduling. This task is about affordability validation before schedule creation.
- Avoid coupling controllers directly to database tables or future microservice details.
- Preserve tenant/client scoping from the authenticated context.
- Keep the existing estimate endpoint behavior only if it is still needed by other clients; the new schedule-time validation must be authoritative either way.
- Ensure failed insufficient-balance attempts do not leave partial schedules, dynamic mailing tables, dialer campaigns, or queued jobs behind.

## Error Contract

For insufficient balance, return a stable machine-readable error code, for example `INSUFFICIENT_BROADCAST_BALANCE`, and include a details payload with:

- `totalCost`: full calculated cost for the requested send
- `availableBalance`: current balance considered by the check
- `missingAmount`: amount the client must add to complete the scheduling

Use the repository's existing error/exception shape if one exists, but keep these semantic fields intact for middleware and frontend consumption.

## Docs Alignment

Update broadcast human docs to state that schedule creation performs the authoritative balance check and document the insufficient-balance response fields.

## Validation Expectations

- Focused billing/schedule tests cover sufficient balance, insufficient balance, exact missing amount, and no partial side effects after rejection.
- Existing estimate/billing tests continue to pass.
- Typecheck and build pass.
