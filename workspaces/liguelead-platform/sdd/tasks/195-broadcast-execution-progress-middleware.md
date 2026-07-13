---
id: broadcast-execution-progress-middleware
title: Middleware contract and route for execution progress
scope: broadcast-execution-progress
status: open
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
depends_on:
  - broadcast-execution-progress-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4813423159
github_issue_number: 79
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/79
github_issue_node_id: I_kwDOR6h3H88AAAABHucCNw
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/79
github_project_item_id: 208848765
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxyx30
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208848765"
github_project_status: Todo
---

## Objective

Add middleware proxy route and Zod contract for broadcast schedule execution progress.

## Route

```
GET /broadcasts/schedules/:id/execution-progress
```

Proxy to platform-api: `GET /broadcasts/schedules/:id/execution-progress`

## Contract

File: `src/domains/broadcasts/contracts.ts`

```typescript
export const voiceExecutionProgressSchema = z.object({
  type: z.literal('voice'),
  total: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  answeredBillsecZero: z.number().int().nonnegative(),
  notAnswered: z.number().int().nonnegative(),
  busy: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  progressPercent: z.number().min(0).max(100),
  avgDurationSeconds: z.number().nullable(),
})

export const smsExecutionProgressSchema = z.object({
  type: z.literal('sms'),
  total: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  totalCredits: z.number().int().nonnegative(),
  progressPercent: z.number().min(0).max(100),
})

export const executionProgressResponseSchema = z.object({
  progress: z.discriminatedUnion('type', [
    voiceExecutionProgressSchema,
    smsExecutionProgressSchema,
  ]).nullable(),
  updatedAt: z.string(),
})
```

## Route Registration

File: `src/domains/broadcasts/routes.ts`

Add route using existing pattern:
- Auth: session required (same as existing schedule routes)
- Backend: platform-api
- Response validation: `executionProgressResponseSchema`

## Constraints

- Follow existing route/contract patterns in `src/domains/broadcasts/routes.ts`.
- Register the contract in the route-contract test registry (`src/tests/route-contracts.test.ts`) if such a pattern exists.
- Run `npm run docs:openapi` to regenerate OpenAPI docs.

## Validation

- `npm run build`
- `npm test`
- `npm run docs:openapi`
