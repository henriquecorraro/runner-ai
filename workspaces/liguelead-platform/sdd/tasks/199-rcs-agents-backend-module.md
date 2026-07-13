---
id: rcs-agents-backend-module
title: "RCS Agents: backend module with CRUD + file upload"
scope: rcs-agents
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck passes
  - npm test passes
  - npm run build passes
  - Module exists at src/modules/rcs-agents/
  - All 6 routes registered and reachable
depends_on:
  - rcs-agents-migration
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4833312022
github_issue_number: 118
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/118
github_issue_node_id: I_kwDORpoJ688AAAABIBZ9Fg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/118
github_project_item_id: 210018434
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyEoII
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=210018434"
github_project_status: Testing
---

Create module `src/modules/rcs-agents/` following existing module structure.

## Module structure

```
src/modules/rcs-agents/
  index.ts
  models/rcs-agent.model.ts
  entities/rcs-agent.entity.ts
  schemas/rcs-agent.schemas.ts
  repositories/rcs-agents.repository.ts
  use-cases/rcs-agents.use-cases.ts
  controllers/rcs-agents.controller.ts
  routes/rcs-agents.routes.ts
  services/rcs-agents-protocol.service.ts
  services/rcs-agents-file-upload.service.ts
```

## Entity / Model

```typescript
interface RcsAgent {
  id: number;
  clientId: number;
  protocolNumber: string;
  status: 'rascunho' | 'enviado' | 'em_analise' | 'aprovado' | 'reprovado' | 'editado';
  rejectionReason: string | null;
  internalNotes: string | null;
  statusUpdatedBy: number | null;
  // Step 1
  contactName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  legalName: string | null;
  companyWebsite: string | null;
  country: string;
  // Step 2
  senderName: string | null;
  senderDescription: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  // Step 3
  phone: string | null;
  phoneLabel: string | null;
  publicEmail: string | null;
  publicEmailLabel: string | null;
  publicWebsite: string | null;
  publicWebsiteLabel: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  // Step 4
  sendType: 'promotional' | 'otp' | 'transactional' | 'multi' | null;
  useCase: string | null;
  // Step 5
  messageTriggers: string | null;
  userInteractions: string | null;
  // Step 6
  optinMethods: string[] | null;
  optinDescription: string | null;
  optinEvidenceUrl: string | null;
  optinUrl: string | null;
  optoutMessage: string | null;
  // Step 7
  testDevices: string[] | null;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /rcs-agents | session (client) | Create draft agent |
| GET | /rcs-agents | session (client) | List agents for authenticated client |
| GET | /rcs-agents/:id | session (client) | Get agent by id (must belong to client) |
| PATCH | /rcs-agents/:id | session (client) | Update draft/reprovado agent (step fields) |
| POST | /rcs-agents/:id/submit | session (client) | Submit agent (status rascunho→enviado or reprovado→editado) |
| POST | /rcs-agents/:id/upload | session (client) | Upload file (logo, banner, optin_evidence) |

## Business rules

1. **Create**: insert with `status = 'rascunho'`. Generate `protocol_number` with format `RCS-{YYYYMMDD}-{5-digit-seq}`. Sequence: query `SELECT COUNT(*) FROM rcs_agents WHERE DATE(created_at) = CURDATE()` + 1, zero-pad to 5 digits.
2. **Update (PATCH)**: only allowed when `status IN ('rascunho', 'reprovado')`. Validate `send_type` immutability — if agent was previously submitted (`status != 'rascunho'` in history), do NOT allow changing `send_type`. Return 409 if status not editable.
3. **Submit**: validate all required fields are filled (all Step 1–6 required fields non-null). If any missing, return 422 with list of missing fields. Transition: `rascunho → enviado`, `reprovado → editado`. Return 409 for other statuses.
4. **List**: return only agents where `client_id` matches authenticated client. Order by `created_at DESC`.
5. **Get by ID**: return 404 if agent does not belong to authenticated client. Do NOT expose `internal_notes` or `status_updated_by` in client-facing response.
6. **Upload**: accept `multipart/form-data` with field `file`. Query param `type` = `logo` | `banner` | `optin_evidence`. Validate:
   - logo: PNG/JPG, max 50KB, 224×224px
   - banner: PNG/JPG, max 200KB, 1440×448px  
   - optin_evidence: PNG/JPG/PDF, max 10MB
   Upload to S3 bucket (use existing S3 infra in `src/infra/`). Return URL. Update corresponding `*_url` field on the agent record.

## Protocol number generation service

File: `src/modules/rcs-agents/services/rcs-agents-protocol.service.ts`

```typescript
async function generateProtocolNumber(db: Knex): Promise<string> {
  const today = formatDate(new Date(), 'YYYYMMDD');
  const [{ count }] = await db('rcs_agents')
    .whereRaw("DATE(created_at) = CURDATE()")
    .count('* as count');
  const seq = String(Number(count) + 1).padStart(5, '0');
  return `RCS-${today}-${seq}`;
}
```

## Error responses

| Condition | HTTP Status |
|-----------|-------------|
| Agent not found or not owned by client | 404 |
| Status not editable (PATCH) | 409 |
| Status transition invalid (submit) | 409 |
| Required fields missing on submit | 422 |
| File validation failed (size/type/dimensions) | 422 |
| Unauthorized | 401 |

## Registration in app

Register `rcsAgentsRouter` in `src/app/` route registration (follow existing pattern).
