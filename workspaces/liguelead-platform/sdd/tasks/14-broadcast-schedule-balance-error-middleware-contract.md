---
id: broadcast-schedule-balance-error-middleware-contract
title: Expose broadcast schedule balance errors through middleware
scope: broadcast-schedule-billing
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware:docs/contracts-and-routes/README.md
depends_on:
  - broadcast-schedule-balance-check-on-create
---

## Goal

Keep the public middleware contract aligned with the authoritative balance check performed by `platform-api` schedule creation.

## Affected Behavior

The middleware route that proxies `POST /broadcasts/actions/:id/schedules` must preserve and expose insufficient-balance failures from the platform API so the frontend can show the total send cost and the amount missing to schedule the broadcast.

## Implementation Constraints

- Preserve existing authentication/session propagation and tenant scoping behavior for broadcast schedule routes.
- Do not implement balance business rules in the middleware. The middleware should validate/proxy the public contract and forward the platform API decision.
- Keep the insufficient-balance error code stable, for example `INSUFFICIENT_BROADCAST_BALANCE`, matching the platform API task.
- Ensure the error details payload keeps `totalCost`, `availableBalance`, and `missingAmount` as numeric fields.
- Update route schemas/types/OpenAPI artifacts if this repository generates or publishes route contracts.
- Do not remove the schedule-estimate route from the middleware unless repository usage search proves it is safe and docs/contracts are updated accordingly. The frontend will stop depending on it for scheduling.

## Docs Alignment

Document the schedule route's insufficient-balance response in middleware public/human docs, including the fact that the balance decision belongs to `platform-api` and may later come from a billing service behind that API.

## Validation Expectations

- Middleware tests cover proxying a successful schedule response.
- Middleware tests cover forwarding an insufficient-balance response with `totalCost`, `availableBalance`, and `missingAmount` intact.
- OpenAPI/public route docs regenerate cleanly when required.
- Build and tests pass.
