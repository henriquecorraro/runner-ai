---
id: broadcast-schedule-estimate-interaction-cost-cap
title: Broadcast Interactive Voice Estimate Worst Case Per Lead
scope: broadcast-schedule-estimate-alignment
status: done
repositories:
  - platform-api
validation:
  - npx vitest run tests/broadcast-billing.service.spec.ts tests/broadcast-action.schemas.spec.ts
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
---

## Goal

Align interactive voice schedule estimation with the real execution model where a lead can trigger at most one DTMF interaction during a call.

## Affected Behavior

For `typeId = 2` interactive voice broadcasts, schedule estimation must no longer sum every interaction branch for every recipient. The estimate should represent the maximum plausible cost per lead:

- one base voice call per recipient
- plus only the single most expensive interaction path for that recipient
- and, when that most expensive path sends SMS, one SMS credit per recipient

This keeps the estimate conservative without assuming a single lead traverses multiple interaction branches in one call.

## Implementation Constraints

- Keep non-interactive voice, SMS, and SMS Flash estimates unchanged.
- Preserve the audience resolution flow already used by `/schedule-estimate` and `/schedules`.
- Keep the estimate deterministic for the same action payload and audience total.
- Cover the rule with automated tests.

## Docs Alignment

Update the repository human docs to describe the new worst-case-per-lead estimate rule for interactive voice scheduling.

## Validation Expectations

- Focused broadcast billing and schema tests must pass.
- Interactive voice estimate coverage must prove that only the most expensive single interaction path is charged per recipient.
