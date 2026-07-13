---
id: platform-front-auto-recharge-wizard-trigger-quantity
title: Build auto-recharge wizard trigger and quantity steps
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
  - platform-front-auto-recharge-banner-ripple-entry
---

## Target

```text
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.tsx
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.styles.ts
/home/rick/projetos/platform-front/src/service/auto-recharges/auto-recharges-service.types.ts
/home/rick/projetos/platform-front/docs/features/credit-purchase.md
```

## Requirements

| Area | Requirement |
|------|-------------|
| Modal | Open a centered modal from the banner. Use the app's existing modal/dialog styling patterns where available. |
| Stepper | Build a three-step wizard with visible progress. Steps: `Gatilho`, `Créditos`, `Cartão`. |
| Step 1 | Let user choose `recurring` or `low_balance` with two large selectable option panels. |
| Step 1 recurring | Ask for day of month with compact stepper/input. Valid range: `1..31`. |
| Step 1 low_balance | Ask for minimum balance threshold with numeric input. Valid range: `>= 1`. |
| Step 2 | Let user choose credit type: SMS `1`, Voz `2`, SMS Flash `3`. |
| Step 2 creative quantity | Replace plain numeric quantity input with a richer credit builder. |
| Step 2 validation | `rechargeAmount >= 1`. Disable next/submit until valid. |
| State | Keep local wizard draft state. Reset draft only after successful create or modal close confirmation. |
| Existing create API | Preserve `CreateAutoRechargePayload` shape. Do not change backend contracts. |
| Mobile | Modal content must fit mobile viewport without horizontal overflow. |

## Quantity Builder

Implement all controls:

| Control | Behavior |
|---------|----------|
| Preset chips | `500`, `1.000`, `2.000`, `5.000`, `10.000`, `25.000` credits. |
| Plus/minus buttons | Increment/decrement by selected step size. |
| Step size segmented control | `100`, `500`, `1.000`. |
| Direct input | Numeric input accepts manual credit quantity. |
| Preview rail | Show selected amount as a horizontal meter with tick labels. |
| Summary badge | Show `SMS`, `Voz`, or `SMS Flash` plus formatted amount. |

## Type Shape

```ts
type AutoRechargeWizardDraft = {
  triggerType: 'recurring' | 'low_balance'
  triggerValue: number | null
  creditTypeId: 1 | 2 | 3
  rechargeAmount: number | null
  clientCreditCardId: number | null
}
```

## UX Rules

- Use icons for trigger cards and credit type selectors.
- Keep labels short.
- Do not show explanatory paragraphs inside the modal.
- Show inline errors only after the field is touched or when user tries to advance.
- Allow Back/Next navigation.
- Preserve Enter/Escape keyboard behavior.

## Validation

```bash
npm run lint
npm run build
```
