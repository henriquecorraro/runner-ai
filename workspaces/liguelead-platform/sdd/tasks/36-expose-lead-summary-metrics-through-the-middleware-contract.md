---
id: expose-lead-summary-metrics-through-the-middleware-contract
title: Expose lead summary metrics through the middleware contract
scope: leads-dashboard-summary-cards
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
docs_targets:
  - middleware docs/ route contract documentation
  - middleware docs/public-api generated artifacts if route schemas change
depends_on:
  - add-lead-summary-metrics-for-the-leads-screen
---

## Context

The Leads screen needs the summary metrics shown in the reference screenshot: `TOTAL DE LEADS`, `SEM EMAIL`, and `BLOQUEADOS`.

The platform API should provide the authoritative counts, and the middleware must expose them to the frontend using the existing route, auth, and schema patterns.

## Requirements

- Locate the middleware route/service used by the Leads management screen.
- Add the lead summary metrics to the relevant response or create a focused summary endpoint if that better matches existing middleware conventions.
- Preserve tenant/account authorization and forward any filter context needed so the metrics match the Leads screen data scope.
- Add or update Zod schemas/types/OpenAPI definitions for the response contract.
- Keep field names stable and documented for frontend consumption, for example total leads, new leads in the last 7 days, without-email leads, blocked leads, and percentage badge values for the cards.
- Preserve or expose the backend-defined semantics for percentages so the frontend can display them without guessing the denominator or period.
- Ensure the total-leads card contract includes the secondary value needed by the UI copy for new leads created in the last 7 days.
- Avoid calculating these counts in middleware if the platform API already returns them.
- Update repository-local docs when public route contracts or generated API docs change.

## Notes

The frontend cards should be able to render these values without fetching the full lead dataset or deriving totals from paginated results.
