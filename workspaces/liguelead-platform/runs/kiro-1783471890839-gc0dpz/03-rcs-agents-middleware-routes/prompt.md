You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: rcs-agents-middleware-routes
Title: RCS Agents: middleware proxy routes and contracts

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

### rcs-agents-middleware-routes
Task id: rcs-agents-middleware-routes
Task title: RCS Agents: middleware proxy routes and contracts
Task status: open
Task scope: rcs-agents
Task validation: npm run build passes ; npm test passes ; npm run docs:openapi generates without errors ; Domain exists at src/domains/rcs-agents/ ; Routes registered in handler.ts

```md
Create domain `src/domains/rcs-agents/` with `routes.ts` and `contracts.ts`.

## File: `src/domains/rcs-agents/contracts.ts`

```typescript
import { z } from "zod"
import { requestHeadersSchema, emptyObjectSchema } from "../../contracts/schemas"

// Enums
const rcsAgentStatusSchema = z.enum(['rascunho', 'enviado', 'em_analise', 'aprovado', 'reprovado', 'editado'])
const sendTypeSchema = z.enum(['promotional', 'otp', 'transactional', 'multi'])
const uploadTypeSchema = z.enum(['logo', 'banner', 'optin_evidence'])

// Agent response shape (client-facing — no internal_notes, no status_updated_by)
const rcsAgentSchema = z.object({
  id: z.number(),
  protocolNumber: z.string(),
  status: rcsAgentStatusSchema,
  rejectionReason: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  companyName: z.string().nullable(),
  legalName: z.string().nullable(),
  companyWebsite: z.string().nullable(),
  country: z.string(),
  senderName: z.string().nullable(),
  senderDescription: z.string().nullable(),
  brandColor: z.string().nullable(),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  phone: z.string().nullable(),
  phoneLabel: z.string().nullable(),
  publicEmail: z.string().nullable(),
  publicEmailLabel: z.string().nullable(),
  publicWebsite: z.string().nullable(),
  publicWebsiteLabel: z.string().nullable(),
  privacyPolicyUrl: z.string().nullable(),
  termsUrl: z.string().nullable(),
  sendType: sendTypeSchema.nullable(),
  useCase: z.string().nullable(),
  messageTriggers: z.string().nullable(),
  userInteractions: z.string().nullable(),
  optinMethods: z.array(z.string()).nullable(),
  optinDescription: z.string().nullable(),
  optinEvidenceUrl: z.string().nullable(),
  optinUrl: z.string().nullable(),
  optoutMessage: z.string().nullable(),
  testDevices: z.array(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// --- List ---
export const listRcsAgentsInputSchema = z.object({
  headers: requestHeadersSchema,
  params: emptyObjectSchema,
  query: emptyObjectSchema,
  body: z.null(),
})
export const listRcsAgentsOutputSchema = z.array(rcsAgentSchema)

// --- Get by ID ---
export const getRcsAgentInputSchema = z.object({
  headers: requestHeadersSchema,
  params: z.object({ id: z.string() }),
  query: emptyObjectSchema,
  body: z.null(),
})
export const getRcsAgentOutputSchema = rcsAgentSchema

// --- Create ---
export const createRcsAgentInputSchema = z.object({
  headers: requestHeadersSchema,
  params: emptyObjectSchema,
  query: emptyObjectSchema,
  body: z.object({}).passthrough(),
})
export const createRcsAgentOutputSchema = rcsAgentSchema

// --- Update ---
export const updateRcsAgentInputSchema = z.object({
  headers: requestHeadersSchema,
  params: z.object({ id: z.string() }),
  query: emptyObjectSchema,
  body: z.object({}).passthrough(),
})
export const updateRcsAgentOutputSchema = rcsAgentSchema

// --- Submit ---
export const submitRcsAgentInputSchema = z.object({
  headers: requestHeadersSchema,
  params: z.object({ id: z.string() }),
  query: emptyObjectSchema,
  body: z.null(),
})
export const submitRcsAgentOutputSchema = rcsAgentSchema

// --- Upload ---
export const uploadRcsAgentFileInputSchema = z.object({
  headers: requestHeadersSchema,
  params: z.object({ id: z.string() }),
  query: z.object({ type: uploadTypeSchema }),
  body: z.any(),
})
export const uploadRcsAgentFileOutputSchema = z.object({ url: z.string() })
```

## File: `src/domains/rcs-agents/routes.ts`

```typescript
import type { RouteDefinition } from "../../contracts/types"
import {
  listRcsAgentsInputSchema, listRcsAgentsOutputSchema,
  getRcsAgentInputSchema, getRcsAgentOutputSchema,
  createRcsAgentInputSchema, createRcsAgentOutputSchema,
  updateRcsAgentInputSchema, updateRcsAgentOutputSchema,
  submitRcsAgentInputSchema, submitRcsAgentOutputSchema,
  uploadRcsAgentFileInputSchema, uploadRcsAgentFileOutputSchema,
} from "./contracts"

export const rcsAgentsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/rcs-agents",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    inputSchema: listRcsAgentsInputSchema,
    outputSchema: listRcsAgentsOutputSchema,
  },
  {
    method: "GET",
    path: "/rcs-agents/:id",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    inputSchema: getRcsAgentInputSchema,
    outputSchema: getRcsAgentOutputSchema,
  },
  {
    method: "POST",
    path: "/rcs-agents",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    inputSchema: createRcsAgentInputSchema,
    outputSchema: createRcsAgentOutputSchema,
  },
  {
    method: "PATCH",
    path: "/rcs-agents/:id",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    inputSchema: updateRcsAgentInputSchema,
    outputSchema: updateRcsAgentOutputSchema,
  },
  {
    method: "POST",
    path: "/rcs-agents/:id/submit",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    inputSchema: submitRcsAgentInputSchema,
    outputSchema: submitRcsAgentOutputSchema,
  },
  {
    method: "POST",
    path: "/rcs-agents/:id/upload",
    auth: { required: true, strategy: "session" },
    target: "NEW_BACKEND_URL",
    passthrough: true,
    inputSchema: uploadRcsAgentFileInputSchema,
    outputSchema: uploadRcsAgentFileOutputSchema,
  },
]
```

## Registration

Register `rcsAgentsRoutes` in `src/handler.ts` domain imports (follow existing pattern of importing and spreading into route catalog).
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1783471890839-gc0dpz/03-rcs-agents-middleware-routes/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: rcs-agents-middleware-routes
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
