---
id: i18n-translate-integrations-pages
title: i18n: Translate Integrations pages
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710498289
github_issue_number: 99
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/99
github_issue_node_id: I_kwDORqaAXc8AAAABGMR_8Q
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/99
github_project_item_id: 202914835
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYPBM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914835"
github_project_status: Done
---

## Scope

Translate Integrations domain. Namespace: `integrations`.

## Files to modify

- `src/pages/Integrations/Integrations.tsx`
- `src/pages/Integrations/IntegrationWebhooks.tsx`
- `src/pages/Integrations/WebhookForm.tsx`
- `src/pages/Integrations/ConnectIntegrationModal.tsx`

## Key translations

- title: "Integrações" → "Integraciones" → "Integrations"
- subtitle, section headers (Connected/Available CRMs)
- Connect modal: form fields (API key, token, URL), instructions, success/error messages
- Webhooks: list headers, create/edit form labels (URL, events, headers), status badges
- Webhook form: all field labels, placeholders, validation hints, event type options
- Empty states, error states

## Constraints

- Do NOT translate CRM names (e.g., "Bitrix24", "HubSpot", "RD Station").
- Do NOT translate webhook URLs or API keys.
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
