You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: rcs-agents-frontend
Title: RCS Agents: frontend listing + multi-step registration form

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

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### rcs-agents-frontend
Task id: rcs-agents-frontend
Task title: RCS Agents: frontend listing + multi-step registration form
Task status: open
Task scope: rcs-agents
Task validation: npm run lint passes ; npm run build passes ; Pages exist at src/pages/RcsAgents/ ; Routes registered in AppRoutes.tsx ; Service layer at src/service/rcs-agents/

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1783473893888-1mbc90/01-rcs-agents-frontend/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: rcs-agents-frontend
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
