---
id: broadcast-schedule-remove-cost-estimate-ui
title: Remove broadcast schedule cost estimate UI and handle balance failures
scope: broadcast-schedule-billing
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/broadcasts.md
depends_on:
  - broadcast-schedule-balance-error-middleware-contract
---

## Goal

Remove the frontend schedule-cost estimate action and make schedule submission handle the backend's authoritative balance validation.

## Affected Behavior

The broadcast scheduling UI currently has a button/action that shows how much the send would cost before scheduling. Remove that estimate interaction from the scheduling flow. When the user submits the schedule:

- call the existing schedule creation flow normally
- if scheduling succeeds, keep the current successful scheduling behavior
- if the backend returns insufficient balance, show the user the total send cost and how much balance is missing to complete the send
- do not require the user to manually request or view a cost estimate before attempting to schedule

## Implementation Constraints

- Remove UI state, buttons, labels, service calls, and query/mutation paths that exist only to display the pre-schedule estimate, if they are no longer used elsewhere.
- Do not duplicate cost calculation logic in the frontend.
- Treat the schedule creation response/error contract as the source of truth for cost and missing balance.
- Preserve existing form validation and scheduling payload behavior.
- Keep the UI copy concise and operational: it should clearly communicate `totalCost` and `missingAmount` when balance is insufficient.
- If shared estimate service functions are still used by another screen, keep them and only remove this scheduling usage.
- Ensure loading, success, and error states remain stable after removing the estimate path.

## Docs Alignment

Update frontend broadcast feature docs to describe that scheduling now performs the balance check on submit and that insufficient balance displays total cost plus missing amount.

## Validation Expectations

- Lint and build pass.
- Focused frontend tests, if this area has them, cover successful scheduling and insufficient-balance display.
- Manual smoke path: open the broadcast schedule form, verify there is no estimate button, submit with sufficient balance, and submit with an insufficient-balance API response.
