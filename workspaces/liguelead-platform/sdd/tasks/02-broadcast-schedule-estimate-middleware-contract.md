---
id: broadcast-schedule-estimate-middleware-contract
title: Broadcast Schedule Estimate Middleware Contract Alignment
scope: broadcast-schedule-estimate-alignment
status: done
repositories:
  - middleware
validation:
  - npm run build
  - node --enable-source-maps --test dist/tests/route-contracts.test.js
docs_targets:
  - middleware:docs/contracts-and-routes/README.md
---

## Goal

Align the middleware runtime contract for `POST /broadcasts/actions/:id/schedule-estimate` and `POST /broadcasts/actions/:id/schedules` with the broadcast payload already documented and expected by downstream services.

## Affected Behavior

The middleware schedule audience contract must accept `audience.removeBlocklist` instead of rejecting the request with `VALIDATION_ERROR` for an unrecognized key. This keeps runtime validation aligned with the published contract and with the platform API schedule payload.

## Implementation Constraints

- Update only the middleware runtime schema for the broadcast audience payload.
- Preserve the existing route shape, endpoint paths, and auth behavior.
- Do not rename the downstream field expected by the platform API.
- Avoid unrelated OpenAPI/doc churn in the same task unless it is necessary to keep the contract truthful.

## Docs Alignment

Keep the middleware human docs aligned with the schedule payload semantics and the `removeBlocklist` naming used by the public broadcast schedule routes.

## Validation Expectations

- The middleware must build successfully.
- The compiled route-contract validation test must pass.
- A schedule-estimate payload containing `audience.removeBlocklist` should no longer fail runtime schema validation.
