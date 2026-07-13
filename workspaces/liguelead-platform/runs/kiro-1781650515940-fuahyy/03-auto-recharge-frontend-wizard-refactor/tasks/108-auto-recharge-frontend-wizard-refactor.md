---
id: auto-recharge-frontend-wizard-refactor
title: Refactor auto-recharge frontend wizard for recurring multi-product flow
scope: auto-recharge-recurring-consolidation
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - auto-recharge-recurring-api-refactor
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKofpc
github_project_item_id: 201178900
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv9vxQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201178900"
github_project_status: Todo
---

## Overview

Refactor the auto-recharge creation wizard to split flow by trigger type first, then configure items accordingly.

## Current flow (to change)

Step 1: Product → Step 2: Rules (trigger type + values) → Step 3: Card

## New flow

Step 1: Trigger type choice (recurring OR low_balance)
- If **low_balance** → Step 2: Product (single) → Step 3: Rules (threshold + amount) → Step 4: Card
- If **recurring** → Step 2: Items (multi-product: pick 1..3 credit types, each with rechargeAmount) + day → Step 3: Card

## Files to modify

| File | Change |
|------|--------|
| `src/components/AutoRechargeSection/AutoRechargeSection.tsx` | Wizard flow restructure |
| `src/service/auto-recharges/auto-recharges-service.types.ts` | New payload/response types |
| `src/service/auto-recharges/auto-recharges-service.ts` | Adjust create payload |
| `src/hooks/queries/auto-recharges.queries.ts` | Adjust mutation payloads |

## Type changes

```typescript
// New response shape
export type AutoRechargeItem = {
  creditTypeId: number;
  rechargeAmount: number;
};

export type AutoRechargeRule = {
  uuid: string;
  clientCreditCardId: number;
  creditTypeId: number | null;
  triggerType: TriggerType;
  triggerValue: number;
  rechargeAmount: number;
  items: AutoRechargeItem[];
  active: boolean;
  lastAttemptedAt: string | null;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  lastFailureCode: string | null;
  lastFailureMessage: string | null;
  lastPaymentId: number | null;
  createdAt: string;
};

// New create payloads (discriminated)
export type CreateRecurringPayload = {
  triggerType: "recurring";
  triggerValue: number;
  clientCreditCardId: number;
  items: AutoRechargeItem[];
};

export type CreateLowBalancePayload = {
  triggerType: "low_balance";
  triggerValue: number;
  clientCreditCardId: number;
  creditTypeId: number;
  rechargeAmount: number;
};

export type CreateAutoRechargePayload = CreateRecurringPayload | CreateLowBalancePayload;
```

## Wizard UX spec

### Step 1 — Trigger type

Two large option cards:
- "Dia fixo do mês" (recurring) — "Uma recarga com todos os produtos no mesmo dia"
- "Saldo mínimo" (low_balance) — "Recarrega quando o saldo de um produto ficar baixo"

Disable "Dia fixo" if client already has an active recurring rule. Show message: "Você já possui uma recarga recorrente ativa. Edite a existente."

### Recurring path — Step 2: Items + Day

- Day picker (1-31) at the top
- Multi-product selector: checkboxes for SMS, Ligação, SMS Flash
  - For each checked product: quantity input (slider + presets like today)
  - Show tariff preview per product
  - Show total estimated charge (sum of all products)
- Min 1 product selected, max 3

### Recurring path — Step 3: Card

Same as today's card step.

### Low balance path — Step 2: Product

Same as today's product step (single choice).

### Low balance path — Step 3: Rules

Threshold input + recharge amount. Same as today but only for low_balance trigger.

### Low balance path — Step 4: Card

Same as today.

## Rule list display

For recurring rules, the rule card must show all items:
```
Dia 15 — SMS (5.000) · Ligação (2.000) · SMS Flash (1.000)
```

## Edit dialog

For recurring rules, allow editing:
- Day (triggerValue)
- Items array (add/remove products, change amounts)
- Card

For low_balance rules, keep current edit dialog.

## Constraints

- The create mutation for recurring sends `{ triggerType: "recurring", triggerValue, clientCreditCardId, items: [...] }` — a single API call, NOT multiple calls.
- Remove the old behavior of calling create multiple times in a loop for different trigger types.
- Maintain the existing banner, retry dialog, and delete dialog unchanged.
