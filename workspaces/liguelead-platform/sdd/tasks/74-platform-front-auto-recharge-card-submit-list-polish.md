---
id: platform-front-auto-recharge-card-submit-list-polish
title: Finish auto-recharge card step submit flow and rule list polish
scope: platform-front
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/credit-purchase.md
depends_on:
  - platform-front-auto-recharge-wizard-trigger-quantity
---

## Target

```text
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.tsx
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.styles.ts
/home/rick/projetos/platform-front/src/hooks/queries/auto-recharges.queries.ts
/home/rick/projetos/platform-front/src/hooks/queries/credit-payments.queries.ts
/home/rick/projetos/platform-front/src/service/auto-recharges/auto-recharges-service.types.ts
/home/rick/projetos/platform-front/docs/features/credit-purchase.md
```

## Requirements

| Area | Requirement |
|------|-------------|
| Step 3 | Render saved-card selection using `useSavedCardsQuery(true)`. |
| Empty cards | If no saved card exists, show a compact empty state with CTA to the existing card registration/payment card flow if available; otherwise show blocked submit state. |
| Card selection | Use selectable card tiles, not `<select>`. Show last four digits and expiration date. |
| Favorite card | Preselect favorite card when API data exposes favorite marker. Else preselect first card. |
| Submit | Call `useCreateAutoRechargeMutation()` with wizard draft converted to backend payload. |
| Payload | Preserve `CreateAutoRechargePayload`: `clientCreditCardId`, `creditTypeId`, `triggerType`, `triggerValue`, `rechargeAmount`. |
| Success | Close modal, reset draft, invalidate auto recharge query through existing mutation hook, show success UI or toast consistent with app patterns. |
| Error | Keep modal open and render API error message near footer. |
| Rule list | Replace crude inline rule cards with polished compact rows/cards below banner. |
| Delete | Keep delete action. Replace `window.confirm` only if an existing project confirmation dialog is available. |
| Loading | Show skeleton/compact loading state for rules and saved cards. |
| Docs | Document the final auto-recharge UX and API usage. |

## Rule List UI

Each rule row/card must show:

| Field | Format |
|-------|--------|
| Trigger | `Dia {n}` for `recurring`; `Ao chegar em {n}` for `low_balance`. |
| Credit type | `SMS`, `Voz`, `SMS Flash`. |
| Recharge amount | `{amount} créditos`. |
| Status | `Ativa` when `active === true`. |
| Remove action | Icon button with accessible label. |

## Submit Mapping

```ts
const payload: CreateAutoRechargePayload = {
  clientCreditCardId: draft.clientCreditCardId,
  creditTypeId: draft.creditTypeId,
  triggerType: draft.triggerType,
  triggerValue: draft.triggerValue,
  rechargeAmount: draft.rechargeAmount,
}
```

Rules:

- Validate non-null values before mutation.
- Coerce values to numbers before submit.
- Do not send undefined `creditTypeId` from the wizard; wizard only supports `1`, `2`, `3`.
- Disable submit while `createMutation.isPending`.

## Validation

```bash
npm run lint
npm run build
```
