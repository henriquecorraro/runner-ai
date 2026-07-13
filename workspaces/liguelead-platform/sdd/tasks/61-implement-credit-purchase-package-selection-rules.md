---
id: implement-credit-purchase-package-selection-rules
title: Implement credit purchase package selection rules
scope: credits
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - build-the-initial-credits-overview-screen
---

## Context
The second reference screenshot shows the credit purchase screen with separate sections for credit types such as `Ligação`, `SMS`, and `SMS Flash`, package cards, optional custom quantities, a payment method area, and an order summary. The important business rule for this delivery is that the user may choose only one package for each credit type.

## Requirements
- Implement or adjust the credit purchase screen opened from the Credits overview.
- Display purchase sections for each available credit type using the existing domain/source of truth for credit types and packages where possible.
- For each credit type, allow at most one selected package at a time.
- Selecting a package in one credit type must not clear selections from other credit types.
- Selecting another package inside the same credit type replaces the previous selection for that type.
- Support the existing/custom quantity behavior only if it already exists or is required by the current purchase flow; otherwise keep it structured for a future enhancement without blocking package selection.
- Update the order summary so it reflects the selected package for each credit type and totals correctly.
- Preserve existing payment behavior and payment method defaults unless the current implementation needs a minimal adaptation for the new flow.
- Keep user-facing strings in Portuguese.

## Reference UI Details
- The purchase screen is a two-column checkout layout on desktop:
  - A wide left column contains the selectable credit-type sections and payment method.
  - A narrower right column contains a sticky-looking order summary card and a secondary sales/contact card.
  - On smaller screens, the order summary should move below or above the package sections according to the existing responsive pattern.
- Each credit type appears as a large white card with a colored accent on the left edge and a compact icon badge:
  - `Ligação`: phone-style icon, subtitle similar to `Áudio automatizado · TTS ou upload`, unit price area showing `R$ 0,18 por crédito`.
  - `SMS`: star/spark-style icon, subtitle similar to `Texto simples · até 160 caracteres`, unit price area showing `R$ 0,07 por crédito`.
  - `SMS Flash`: lightning-style icon, subtitle similar to `Aparece em pop-up na tela · maior visibilidade · até 160 chars`, unit price area showing `R$ 0,09 por crédito`.
- Inside each credit type card, the package choices are shown as horizontal option cards:
  - Example quantities from the reference: `1.000`, `5.000`, `25.000`, `100.000`.
  - Each option shows total price and per-unit price, for example `R$ 850` and `R$ 0,17/un`.
  - Some options show a small discount badge, for example `-5%`, `-11%`, `-22%`, `-7%`, `-14%`, `-29%`.
  - The selected package is indicated with the product green border/accent. Non-selected packages remain neutral.
- The single-selection rule is per credit type:
  - A user may select `5.000` for `Ligação` and `25.000` for `SMS` at the same time.
  - If the user then selects `100.000` for `Ligação`, only the previous `Ligação` package is cleared; `SMS` remains selected.
  - The state shape should make this explicit, for example one selected package id keyed by credit type.
- The reference includes a custom quantity row under each package grid:
  - Label similar to `Ou qtd customizada:`.
  - Placeholder examples such as `ex: 7.500`, `ex: 12.000`, `ex: 3.000`.
  - A calculated price/value area on the right, and an estimated coverage label such as `Cobre ~28 dias`.
  - Implement this only if compatible with the existing purchase flow; otherwise leave the package selection architecture ready for custom quantity support.
- The payment method card appears below the package sections:
  - Title: `Forma de pagamento`.
  - Options: `PIX`, `Cartão`, `Boleto`.
  - `PIX` is selected in the reference and shows a `+5% crédito` badge with immediate approval text.
  - Preserve the current payment behavior if it already exists.
- The order summary card on the right uses the title `Resumo do pedido` and lists selected credit types with quantities, unit values, and totals:
  - Example rows from the reference include `Ligação` and `SMS` selected, while `SMS Flash` is zero/disabled.
  - It shows `Subtotal`, a PIX bonus line such as `Bônus PIX (+5%)`, a large `Você paga` amount, and a highlighted `Você recebe` credits amount.
  - A primary green payment button reads `Pagar com PIX ->` when PIX is selected.
  - Below the totals, informational checkmarks mention included/bonus credits, credits not expiring, and flexible usage.
- A secondary card below the summary offers custom volume/sales contact:
  - Heading similar to `Volume customizado?`.
  - Copy for purchases above a threshold and a link/action `Falar com vendas ->`.
- Visual tone should match the screenshots: neutral page background, white cards, thin borders, product green highlights, compact financial/dashboard typography, and no marketing-style hero treatment.

## Acceptance Criteria
- The purchase screen opens from the `Comprar Crédito` button on the overview screen.
- Each credit type section can have zero or one selected package.
- Users can select packages for multiple credit types at the same time.
- Changing a package within one type replaces only that type's selected package.
- The order summary and payable amount update from the current selections.
- The flow prevents ambiguous duplicate package selections for the same credit type.
- Responsive layout remains usable for the package list, summary, and payment controls.
