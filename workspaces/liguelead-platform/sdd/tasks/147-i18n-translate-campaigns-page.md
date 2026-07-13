---
id: i18n-translate-campaigns-page
title: i18n: Translate Campaigns page
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
github_issue_id: 4710488700
github_issue_number: 92
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/92
github_issue_node_id: I_kwDORqaAXc8AAAABGMRafA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/92
github_project_item_id: 202914093
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOS0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914093"
github_project_status: Done
---

## Scope

Translate Campaigns page. Namespace: `campaigns`.

## Files to modify

- `src/pages/Campaigns/Campaigns.tsx`
- `src/pages/Campaigns/components/CampaignsContent.tsx`
- `src/hooks/tables/useCampaignsColumns.tsx`
- `src/components/Dialogs/CampaignDialog/CampaignDialog.tsx`

## Key translations (pt-BR → es-ES → en)

- title: "Campanhas" → "Campañas" → "Campaigns"
- subtitle: "Gerencie suas campanhas de comunicação." → "Gestione sus campañas de comunicación." → "Manage your communication campaigns."
- newCampaign: "Nova campanha" → "Nueva campaña" → "New campaign"
- All table column headers, empty states, error states, dialog fields/buttons.

## Constraints

- Provide full JSON for all 3 locales.
- Replace date formatting with `formatDate()`.

## Validation

```bash
npm run lint
npm run build
```
