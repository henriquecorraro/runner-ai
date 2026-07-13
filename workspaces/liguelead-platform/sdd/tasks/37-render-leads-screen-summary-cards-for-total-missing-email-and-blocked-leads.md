---
id: render-leads-screen-summary-cards-for-total-missing-email-and-blocked-leads
title: "Render Leads screen summary cards for total, missing email, and blocked leads"
scope: leads-dashboard-summary-cards
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - "platform-front docs/features leads documentation, if present or if the data contract is documented"
depends_on:
  - expose-lead-summary-metrics-through-the-middleware-contract
---

## Context

The Leads management screen should include the three summary blocks visible in the provided reference screenshot:

- `TOTAL DE LEADS`
- `SEM EMAIL`
- `BLOQUEADOS`

The UI currently needs to be aligned with that target state on the Leads page.

## Requirements

- Locate the Leads management page and its data-loading flow.
- Fetch the lead summary metrics from the middleware contract once available.
- Render three summary cards/blocks near the top of the Leads screen matching the existing design language:
  - Total leads
  - Leads without email
  - Blocked leads
- Show a percentage badge/value on each card, following the visual treatment from the screenshot and the semantics provided by the backend/middleware contract.
- On the `TOTAL DE LEADS` card, show a secondary line with the number of new leads added in the last 7 days.
- Use Portuguese UI labels exactly as expected by the product screen: `TOTAL DE LEADS`, `SEM EMAIL`, and `BLOQUEADOS`, unless existing copy conventions require a minor casing adjustment.
- Use Portuguese supporting copy for the 7-day total-leads subtitle, for example `+X novos nos últimos 7 dias`, adapted to the existing product copy style.
- Include loading, empty, and error-safe states so the cards do not break the page if metrics are unavailable.
- Ensure values are formatted consistently with existing numeric formatting on the platform.
- Ensure percentage values handle zero/empty denominators gracefully and do not show misleading values.
- Keep the cards responsive and visually aligned with the current Leads layout shown in the screenshot.
- Update frontend feature docs if the Leads screen data contract or UX behavior is documented there.

## Acceptance Criteria

- The Leads page shows the three requested summary blocks above or alongside the lead list controls.
- Each card displays its main count and percentage badge/value.
- The `TOTAL DE LEADS` card displays the number of new leads from the last 7 days as secondary text.
- Card values come from the backend/middleware summary contract, not from paginated table rows.
- The table filters/search behavior remains intact.
- The layout remains usable on desktop and mobile widths.
