---
id: rcs-agents-middleware-routes
title: RCS Agents: middleware proxy routes and contracts
scope: rcs-agents
status: open
repositories:
  - middleware
validation:
  - npm run build passes
  - npm test passes
  - npm run docs:openapi generates without errors
  - Domain exists at src/domains/rcs-agents/
  - Routes registered in handler.ts
depends_on:
  - rcs-agents-backend-module
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4833314421
github_issue_number: 90
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/90
github_issue_node_id: I_kwDOR6h3H88AAAABIBaGdQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/90
github_project_item_id: 210018553
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyEoPk
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=210018553"
github_project_status: Todo
---

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
