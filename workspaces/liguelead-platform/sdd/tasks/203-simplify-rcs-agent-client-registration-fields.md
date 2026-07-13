---
id: simplify-rcs-agent-client-registration-fields
title: Simplify RCS agent client registration fields
scope: rcs-agents
status: open
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - platform-api:npm run typecheck
  - platform-api:npm test
  - platform-api:npm run build
  - middleware:npm run build
  - middleware:npm test
  - middleware:npm run docs:openapi
  - platform-front:npm run lint
  - platform-front:npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4859750663
github_issue_number: 129
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/129
github_issue_node_id: I_kwDORpoJ688AAAABIanpBw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/129
  - https://github.com/ligue-lead-tech/middleware/issues/94
  - https://github.com/ligue-lead-tech/platform-front/issues/140
github_project_item_id: 211657935
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgydpM8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=211657935"
github_project_status: Testing
---

## Repositories

| Repository | Changes |
|---|---|
| platform-api | Simplify rcs_agents schema, model, entity, schemas, use cases, upload types, responses |
| middleware | Simplify RCS contracts and upload type enum |
| platform-front | Reduce wizard to 4 steps and simplify service types |
| areadocliente | Reduce legacy wizard to 4 steps; align local model/service/validation behavior |

## Client-managed fields

```typescript
type ClientManagedRcsAgent = {
  contactName: string | null
  contactEmail: string | null
  companyName: string | null
  legalName: string | null
  companyWebsite: string | null
  senderName: string | null
  senderDescription: string | null
  brandColor: string | null
  logoUrl: string | null
  bannerUrl: string | null
  phone: string | null
  publicEmail: string | null
  publicWebsite: string | null
  privacyPolicyUrl: string | null
  termsUrl: string | null
  testDevices: string[] | null
}
```

## UI

- Keep exactly 4 steps: Company, Visual identity, Contact information, Tests.
- Remove Country from UI and client payload.
- Default senderDescription to `Canal oficial da empresa para atendimento, avisos e comunicações com clientes.`
- Keep senderDescription editable.
- Remove phoneLabel, publicEmailLabel, publicWebsiteLabel from UI and client payload.
- Initialize publicWebsite from companyWebsite until the user edits publicWebsite.
- Keep up to 5 optional test devices.
- Remove Service, User experience, Consent steps.
- Do not expose or persist externally-managed fields in this client registration flow.

## Database

- Update migration 028 for fresh databases.
- Add migration 029 for existing databases.
- Retain metadata columns: id, client_id, protocol_number, status, rejection_reason, internal_notes, status_updated_by, created_at, updated_at.
- Retain only ClientManagedRcsAgent database columns.
- Drop country, phone_label, public_email_label, public_website_label, send_type, use_case, message_triggers, user_interactions, optin_methods, optin_description, optin_evidence_url, optin_url, optout_message.
- Do not modify legacy database/skm.sql in the mixed code branch.

## Submission

- Require every retained client-managed field except testDevices.
- Keep testDevices optional.
- Restrict uploads to logo and banner.
- Preserve ownership and editable-status rules.

## Validation

```bash
cd /home/rick/projetos/platform-api && npm run typecheck && npm test && npm run build
cd /home/rick/projetos/middleware && npm run build && npm test && npm run docs:openapi
cd /home/rick/projetos/platform-front && npm run lint && npm run build
```
