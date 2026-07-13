You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: auto-recharge-recurring-api-refactor
Title: Refactor auto-recharge API to support recurring with multiple items

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

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### auto-recharge-recurring-api-refactor
Task id: auto-recharge-recurring-api-refactor
Task title: Refactor auto-recharge API to support recurring with multiple items
Task status: open
Task scope: auto-recharge-recurring-consolidation
Task validation: npm run typecheck ; npm test ; npm run build

```md
## Overview

Refactor auto-recharges backend to use `auto_recharge_items` for recurring rules. A recurring auto_recharge has 1..N items (one per credit_type_id). A low_balance auto_recharge has exactly 1 item.

## Files to modify

| File | Change |
|------|--------|
| `src/modules/auto-recharges/schemas/auto-recharges.schemas.ts` | New schema shapes |
| `src/modules/auto-recharges/use-cases/auto-recharges.use-cases.ts` | New create/update/list logic |
| `src/modules/auto-recharges/repositories/auto-recharges.repository.ts` | Include items in queries, new create with items |
| `src/modules/auto-recharges/services/auto-recharge-processor.service.ts` | Read items from relation |

## Schema changes

`createAutoRechargeBodySchema` — replace with discriminated union:

```typescript
const autoRechargeItemSchema = z.object({
  creditTypeId: z.number().int().positive(),
  rechargeAmount: z.number().int().positive(),
});

const createRecurringSchema = z.object({
  triggerType: z.literal("recurring"),
  triggerValue: z.number().int().min(1).max(31),
  clientCreditCardId: z.number().int().positive(),
  items: z.array(autoRechargeItemSchema).min(1).max(3),
});

const createLowBalanceSchema = z.object({
  triggerType: z.literal("low_balance"),
  triggerValue: z.number().int().positive(),
  clientCreditCardId: z.number().int().positive(),
  creditTypeId: z.number().int().positive(),
  rechargeAmount: z.number().int().positive(),
});

export const createAutoRechargeBodySchema = z.discriminatedUnion("triggerType", [
  createRecurringSchema,
  createLowBalanceSchema,
]);
```

`updateAutoRechargeBodySchema` for recurring must accept optional `items` array. For low_balance, accept optional `rechargeAmount` and `triggerValue`.

## Uniqueness validation

| triggerType | Constraint |
|-------------|-----------|
| `recurring` | Max 1 active recurring per client (ignore creditTypeId). Return 409 `AUTO_RECHARGE_RECURRING_LIMIT` if violated. |
| `low_balance` | Max 1 active per client + creditTypeId (existing behavior). |

Update `validateUniqueActiveRule`:
- For recurring: query `findActiveRecurringByClient(clientId, excludeUuid?)` — if any exists, reject.
- For low_balance: keep current logic using creditTypeId.

## Repository changes

### `create` for recurring

```typescript
async createWithItems(data: {
  clientId: number;
  clientCreditCardId: number;
  triggerType: "recurring";
  triggerValue: number;
  items: Array<{ creditTypeId: number; rechargeAmount: number }>;
}) {
  // Use transaction
  // 1. Create auto_recharges row (credit_type_id=NULL, recharge_amount=0)
  // 2. Bulk create auto_recharge_items
  // Return record with items
}
```

### `findActiveByClientId` — include items

```typescript
// Include AutoRechargeItemModel in the query
AutoRechargeModel.findAll({
  where: { clientId, active: true },
  include: [{ model: AutoRechargeItemModel, as: "items" }],
  order: [["id", "DESC"]],
});
```

### `findActiveRecurringByClient(clientId, excludeUuid?)`

Return first active recurring rule for client, optionally excluding a uuid.

## List response shape change

```typescript
// Recurring rule response:
{
  uuid: string;
  triggerType: "recurring";
  triggerValue: number;
  clientCreditCardId: number;
  items: Array<{ creditTypeId: number; rechargeAmount: number }>;
  active: boolean;
  // ... status fields
}

// Low balance rule response (unchanged, but include items for consistency):
{
  uuid: string;
  triggerType: "low_balance";
  triggerValue: number;
  clientCreditCardId: number;
  creditTypeId: number;
  rechargeAmount: number;
  items: Array<{ creditTypeId: number; rechargeAmount: number }>;
  active: boolean;
  // ... status fields
}
```

## Processor changes

In `auto-recharge-processor.service.ts`, update `resolveItems`:

```typescript
async function resolveItems(clientId: number, rules: AutoRechargeRule[]) {
  // For each rule, read items from the relation (rule.items)
  // Build orderItems from items array instead of rule.creditTypeId/rechargeAmount
  const orderItems = rules.flatMap((rule) =>
    (rule.items ?? [{ creditTypeId: rule.creditTypeId ?? 1, rechargeAmount: Number(rule.rechargeAmount) }])
      .map((item) => ({ creditTypeId: item.creditTypeId, quantity: Number(item.rechargeAmount) }))
  );
  return validateAutoRechargePricing(clientId, orderItems);
}
```

## Update recurring use-case

`updateAutoRecharge` for recurring rules must accept `items` array replacement:
- Delete existing items for the auto_recharge_id
- Insert new items
- Use transaction

## Delete

`deleteAutoRecharge` — cascade handles items deletion (FK ON DELETE CASCADE).

## Tests

Update `tests/auto-recharges.spec.ts` and `tests/auto-recharge-processor.spec.ts`:
- Test creating recurring with items array
- Test uniqueness: only 1 recurring per client
- Test list returns items
- Test processor reads items from relation
- Test update replaces items
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781650515940-fuahyy/02-auto-recharge-recurring-api-refactor/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: auto-recharge-recurring-api-refactor
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
