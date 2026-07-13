---
id: build-the-initial-credits-overview-screen
title: Build the initial Credits overview screen
scope: credits
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - rename-credits-entry-point-and-open-the-credits-area
---

## Context
The first reference screenshot shows a complete credits dashboard, but the first delivery should be intentionally smaller. For now, the Credits area only needs to show the user's balance and a `Comprar Crédito` action.

## Requirements
- Implement the initial Credits overview screen opened by the `Créditos` entry point.
- Show the current credit balance/saldo prominently.
- Add a primary button labeled `Comprar Crédito`.
- The `Comprar Crédito` button opens the purchase screen described in the second reference screenshot.
- Do not implement the full dashboard from the first screenshot yet: skip transfer, full history, channel cards, charts, distribution, projections, and alert configuration unless existing components require minimal placeholders.
- Follow the frontend's existing page layout, typography, spacing, loading, empty, and error state conventions.
- Reuse existing credit balance data/services if already present; if not, isolate the data access so the later full dashboard can expand it.
- Keep user-facing strings in Portuguese.

## Reference UI Details
- The reference screen is a `Gestão`/financial dashboard page with a compact page header:
  - Small section label: `GESTÃO`.
  - Main title: `Créditos`.
  - Subtitle: `Dashboard financeiro · consumo por canal · projeções e histórico`.
  - Header actions in the full reference include `Transferir`, `Histórico completo`, and `+ Comprar Créditos`; these actions should not be implemented in this initial delivery except for the simplified purchase CTA.
- The primary visual block is a wide, pale green balance panel with rounded corners:
  - Label: `Seu saldo total`.
  - Large currency amount such as `R$ 1.248,00`.
  - Small inline indicators below the amount in the full reference: last-7-days change, average daily consumption, and estimated days remaining.
  - A right-side alert card exists in the full reference (`Alerta configurado`, threshold text, and `Configurar ->`), but it should be omitted for now unless the existing layout needs a disabled placeholder.
- For this first delivery, keep only the core version of that balance panel:
  - The saldo must be the dominant element.
  - The purchase action should be clearly available as a primary button labeled exactly `Comprar Crédito`.
  - The screen should feel like the beginning of the dashboard shown in the reference, not like the checkout screen.
- The full reference also contains four channel cards (`WhatsApp`, `E-mail`, `SMS`, `Ligações`), a daily consumption chart, and a distribution donut chart. These should be explicitly left out of the initial delivery.
- On mobile, the balance block and button should stack cleanly, with the saldo still easy to scan.

## Acceptance Criteria
- Opening `Créditos` shows a focused overview screen with the saldo and `Comprar Crédito` button.
- The saldo has sensible loading and failure handling according to existing app conventions.
- Clicking `Comprar Crédito` opens the purchase screen.
- The omitted dashboard sections are not visible in this first delivery.
- The UI remains responsive on desktop and mobile widths.
