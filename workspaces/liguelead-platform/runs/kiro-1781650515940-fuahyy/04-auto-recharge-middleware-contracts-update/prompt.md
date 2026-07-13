You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: auto-recharge-middleware-contracts-update
Title: Update middleware auto-recharge contracts for recurring items

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## middleware
Repository label: Middleware API
Repository root: /home/rick/projetos/middleware

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/ updated when route contracts, auth strategies, backend targets, or operational behavior change.; Regenerate docs/public-api artifacts with npm run docs:openapi whenever route catalogs or Zod schemas change.
- Default validation: npm run build ; npm test ; npm run docs:openapi

### auto-recharge-middleware-contracts-update
Task id: auto-recharge-middleware-contracts-update
Task title: Update middleware auto-recharge contracts for recurring items
Task status: open
Task scope: auto-recharge-recurring-consolidation
Task validation: npm run build ; npm test ; npm run docs:openapi

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781650515940-fuahyy/04-auto-recharge-middleware-contracts-update/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: auto-recharge-middleware-contracts-update
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
