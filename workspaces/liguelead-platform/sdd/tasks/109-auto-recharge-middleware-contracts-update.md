---
id: auto-recharge-middleware-contracts-update
title: Update middleware auto-recharge contracts for recurring items
scope: auto-recharge-recurring-consolidation
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
depends_on:
  - auto-recharge-recurring-api-refactor
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKofrw
github_project_item_id: 201179528
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv9wYg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201179528"
github_project_status: Testing
---

## Overview

Update middleware auto-recharge Zod contracts to match new API shape with `items` array for recurring rules.

## File to modify

`src/domains/auto-recharges/contracts.ts`

## Changes

### `autoRechargeItemSchema` (response item)

Add `items` field:

```typescript
const autoRechargeProductItemSchema = z.object({
  creditTypeId: z.number().int(),
  rechargeAmount: z.number().int(),
});

const autoRechargeItemSchema = z.object({
  uuid: z.string(),
  clientCreditCardId: z.number().int(),
  creditTypeId: z.number().int().nullable(),
  triggerType: triggerTypeSchema,
  triggerValue: z.number().int(),
  rechargeAmount: z.number().int(),
  items: z.array(autoRechargeProductItemSchema),
  active: z.boolean(),
  lastAttemptedAt: z.string().nullable().optional(),
  lastSuccessAt: z.string().nullable().optional(),
  lastFailedAt: z.string().nullable().optional(),
  lastFailureCode: z.string().nullable().optional(),
  lastFailureMessage: z.string().nullable().optional(),
  lastPaymentId: z.number().int().nullable().optional(),
  createdAt: z.string(),
});
```

### `createAutoRechargeInputSchema`

Replace flat body with discriminated union:

```typescript
const createRecurringBodySchema = z.object({
  triggerType: z.literal("recurring"),
  triggerValue: z.number().int().min(1).max(31),
  clientCreditCardId: z.number().int().positive(),
  items: z.array(z.object({
    creditTypeId: z.number().int().positive(),
    rechargeAmount: z.number().int().positive(),
  })).min(1).max(3),
});

const createLowBalanceBodySchema = z.object({
  triggerType: z.literal("low_balance"),
  triggerValue: z.number().int().positive(),
  clientCreditCardId: z.number().int().positive(),
  creditTypeId: z.number().int().positive(),
  rechargeAmount: z.number().int().positive(),
});

export const createAutoRechargeInputSchema = z.object({
  headers: requestHeadersSchema,
  params: emptyObjectSchema,
  query: emptyObjectSchema,
  body: z.discriminatedUnion("triggerType", [
    createRecurringBodySchema,
    createLowBalanceBodySchema,
  ]),
});
```

### `updateAutoRechargeInputSchema`

Add optional `items` to body:

```typescript
export const updateAutoRechargeInputSchema = z.object({
  headers: requestHeadersSchema,
  params: z.object({ uuid: z.string() }),
  query: emptyObjectSchema,
  body: z.object({
    clientCreditCardId: z.number().int().positive().optional(),
    triggerValue: z.number().int().positive().optional(),
    rechargeAmount: z.number().int().positive().optional(),
    items: z.array(z.object({
      creditTypeId: z.number().int().positive(),
      rechargeAmount: z.number().int().positive(),
    })).min(1).max(3).optional(),
  }),
});
```

Remove `creditTypeId` and `triggerType` from update body — these are immutable after creation.

## Post-change

Run `npm run docs:openapi` to regenerate `docs/public-api/openapi.json`.

## Constraints

- Do NOT change route paths or methods.
- Do NOT change retry or delete contracts.
- The middleware only validates and proxies — no business logic changes needed.
