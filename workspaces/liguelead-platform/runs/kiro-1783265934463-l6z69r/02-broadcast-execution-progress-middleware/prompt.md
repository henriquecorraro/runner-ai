You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: broadcast-execution-progress-middleware
Title: Middleware contract and route for execution progress

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

### broadcast-execution-progress-middleware
Task id: broadcast-execution-progress-middleware
Task title: Middleware contract and route for execution progress
Task status: open
Task scope: broadcast-execution-progress
Task validation: npm run build ; npm test ; npm run docs:openapi

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1783265934463-l6z69r/02-broadcast-execution-progress-middleware/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: broadcast-execution-progress-middleware
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
