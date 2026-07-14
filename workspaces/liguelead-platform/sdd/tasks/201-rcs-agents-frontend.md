---
id: rcs-agents-frontend
title: "RCS Agents: frontend listing + multi-step registration form"
scope: rcs-agents
status: done
repositories:
  - platform-front
validation:
  - npm run lint passes
  - npm run build passes
  - Pages exist at src/pages/RcsAgents/
  - Routes registered in AppRoutes.tsx
  - Service layer at src/service/rcs-agents/
depends_on:
  - rcs-agents-middleware-routes
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4833491086
github_issue_number: 136
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/136
github_issue_node_id: I_kwDORqaAXc8AAAABIBk4jg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/136
github_project_item_id: 210029249
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyEysE
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=210029249"
github_project_status: Done
---

Create RCS Agents pages at `src/pages/RcsAgents/` with listing and multi-step form.

## Routes to register in `src/routes/AppRoutes.tsx`

Add inside `<PlatformLayout>` authenticated routes:

```
/rcs/agents          → RcsAgents (listing)
/rcs/agents/new      → RcsAgentForm (create)
/rcs/agents/:id      → RcsAgentForm (view/edit)
```

Lazy imports:
```typescript
const RcsAgents = lazy(() => import('@/pages/RcsAgents/RcsAgents'))
const RcsAgentForm = lazy(() => import('@/pages/RcsAgents/RcsAgentForm'))
```

## Service layer

File: `src/service/rcs-agents/rcs-agents-service.types.ts`

```typescript
export type RcsAgentStatus = 'rascunho' | 'enviado' | 'em_analise' | 'aprovado' | 'reprovado' | 'editado'
export type RcsSendType = 'promotional' | 'otp' | 'transactional' | 'multi'
export type RcsUploadType = 'logo' | 'banner' | 'optin_evidence'

export interface RcsAgent {
  id: number
  protocolNumber: string
  status: RcsAgentStatus
  rejectionReason: string | null
  contactName: string | null
  contactEmail: string | null
  companyName: string | null
  legalName: string | null
  companyWebsite: string | null
  country: string
  senderName: string | null
  senderDescription: string | null
  brandColor: string | null
  logoUrl: string | null
  bannerUrl: string | null
  phone: string | null
  phoneLabel: string | null
  publicEmail: string | null
  publicEmailLabel: string | null
  publicWebsite: string | null
  publicWebsiteLabel: string | null
  privacyPolicyUrl: string | null
  termsUrl: string | null
  sendType: RcsSendType | null
  useCase: string | null
  messageTriggers: string | null
  userInteractions: string | null
  optinMethods: string[] | null
  optinDescription: string | null
  optinEvidenceUrl: string | null
  optinUrl: string | null
  optoutMessage: string | null
  testDevices: string[] | null
  createdAt: string
  updatedAt: string
}
```

File: `src/service/rcs-agents/rcs-agents-service.ts`

```typescript
import api from '../api'
import type { RcsAgent, RcsUploadType } from './rcs-agents-service.types'

export const rcsAgentsService = {
  list: () => api.get<RcsAgent[]>('/rcs-agents').then(r => r.data),
  getById: (id: number) => api.get<RcsAgent>(`/rcs-agents/${id}`).then(r => r.data),
  create: (data: Partial<RcsAgent>) => api.post<RcsAgent>('/rcs-agents', data).then(r => r.data),
  update: (id: number, data: Partial<RcsAgent>) => api.patch<RcsAgent>(`/rcs-agents/${id}`, data).then(r => r.data),
  submit: (id: number) => api.post<RcsAgent>(`/rcs-agents/${id}/submit`).then(r => r.data),
  upload: (id: number, type: RcsUploadType, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ url: string }>(`/rcs-agents/${id}/upload?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
}
```

## React Query hooks

File: `src/hooks/queries/rcs-agents.queries.ts`

Queries:
- `useRcsAgents()` → list all agents
- `useRcsAgent(id)` → get single agent

Mutations:
- `useCreateRcsAgent()`
- `useUpdateRcsAgent()`
- `useSubmitRcsAgent()`
- `useUploadRcsAgentFile()`

Invalidate `['rcs-agents']` query key on mutation success.

## Page: Listing (`src/pages/RcsAgents/RcsAgents.tsx`)

- Table with columns: Nome do agente (`senderName`), Status (badge), Data de criação (`createdAt`), Ação
- Status badges with colors per status:
  - rascunho → gray
  - enviado → blue
  - em_analise → orange
  - aprovado → green
  - reprovado → red
  - editado → purple
- Actions per status:
  - rascunho → "Continuar" (navigate to `/rcs/agents/:id`)
  - reprovado → "Corrigir" (navigate to `/rcs/agents/:id`) + show rejection reason in tooltip/modal
  - enviado/em_analise/editado → "Visualizar" (navigate to `/rcs/agents/:id`, form readonly)
  - aprovado → "Visualizar" (navigate to `/rcs/agents/:id`, form readonly)
- "Novo agente" button → navigate to `/rcs/agents/new`
- If no agents exist, redirect to intro page (show informational card about RCS process, then CTA to create)

## Page: Form (`src/pages/RcsAgents/RcsAgentForm.tsx`)

Multi-step stepper form with 7 steps:

| Step | Title | Fields |
|------|-------|--------|
| 1 | Empresa | contactName, contactEmail, companyName, legalName, companyWebsite, country (fixed BR) |
| 2 | Identidade | senderName, senderDescription (max 100), brandColor (color picker), logo upload, banner upload |
| 3 | Contato | phone, phoneLabel, publicEmail, publicEmailLabel, publicWebsite, publicWebsiteLabel, privacyPolicyUrl*, termsUrl* |
| 4 | Serviço | sendType (radio), useCase (textarea) |
| 5 | Experiência | messageTriggers (textarea), userInteractions (textarea, optional) |
| 6 | Consentimento | optinMethods (checkbox group), optinDescription (textarea), optin_evidence upload, optinUrl, optoutMessage (textarea) |
| 7 | Testes | testDevices (up to 5 phone inputs, all optional) |

`*` = required for submission

## Form behavior

1. **Create flow**: on route `/rcs/agents/new`, call `POST /rcs-agents` on first "Salvar" or "Próximo" to get an `id`, then subsequent saves use `PATCH /rcs-agents/:id`.
2. **Auto-save**: save current step data (PATCH) when user clicks "Próximo" or "Anterior".
3. **Draft resume**: on route `/rcs/agents/:id`, load agent data and pre-fill form. Allow navigation between steps freely.
4. **Readonly mode**: when `status NOT IN ('rascunho', 'reprovado')`, disable all inputs. Hide submit button.
5. **Submit**: final step shows "Enviar cadastro" button. On click call `POST /rcs-agents/:id/submit`. Show success screen with protocol number.
6. **Validation on submit**: if 422 returned with missing fields, highlight the steps that have errors and show field-level error messages.
7. **File uploads**: on file select, immediately call upload endpoint. Show upload progress. Display preview thumbnail for images. Show filename for PDFs.
8. **sendType immutability**: if agent was previously submitted (status is `reprovado`), disable `sendType` radio group.

## Sidebar registration

Add "RCS" menu group in `src/components/Sidebar/Sidebar.constants.tsx` with sub-item "Agentes" pointing to `/rcs/agents`.

## i18n

Add translation keys in `src/i18n/locales/pt-BR/`, `en/`, `es-ES/` for all labels and messages. Namespace: `rcsAgents`.

## Styles

Use styled-components following existing project pattern (`.styles.ts` files co-located with components). Use design system tokens from `@liguelead/design-system`.
