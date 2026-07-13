---
id: add-lead-summary-metrics-for-the-leads-screen
title: Add lead summary metrics for the Leads screen
scope: leads-dashboard-summary-cards
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - "platform-api docs/human route or leads feature documentation, if the API contract changes"
---

## Context

The Leads management screen must show three summary blocks from the provided reference screenshot: `TOTAL DE LEADS`, `SEM EMAIL`, and `BLOQUEADOS`.

This backend task should make the authoritative counts available from the platform API so the UI does not need to infer them from a paginated lead list.

## Requirements

- Identify the existing Leads listing/search endpoint or dashboard endpoint used by the Leads screen.
- Add or extend a server-side summary source that returns these metrics for the same tenant/account and filter context used by the Leads screen:
  - total leads
  - new leads created in the last 7 days
  - leads without email
  - blocked leads
- Return enough comparison data for the UI to display percentage badges on the summary cards. Prefer backend-provided percentages when the denominator/window semantics are business-critical; otherwise document the denominator clearly so middleware/frontend can safely format them.
- Define the semantics for each percentage explicitly, including whether it is a share of total leads, a variation against a previous period, or another existing dashboard convention.
- Define the 7-day window for new leads using the repository's existing timezone/date handling conventions, and make the boundary inclusive/exclusive rules clear.
- Keep naming consistent with existing API conventions, while making the semantics explicit enough for the middleware/frontend to consume.
- Ensure counts respect the same authorization, tenant scoping, and relevant lead filters already applied to the screen.
- Avoid adding duplicated business rules in downstream layers.
- Update repository-local human docs if the route contract or business rule documentation changes.

## Notes

The screenshot labels are Portuguese UI copy, but the API contract should use stable English field names unless this repository already uses localized keys.
