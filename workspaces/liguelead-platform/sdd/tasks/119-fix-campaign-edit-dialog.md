---
id: fix-campaign-edit-dialog
title: Fix campaign edit dialog opening and update flow
scope: frontend-bugfix
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4695425482
github_issue_number: 61
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/61
github_issue_node_id: I_kwDORqaAXc8AAAABF96Byg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/61
github_project_item_id: 202121270
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMIDY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202121270"
github_project_status: Done
---

## Repositories

| Repository | Required |
|---|---|
| platform-front | yes |

## Files

```txt
src/pages/Campaigns/components/CampaignsContent.tsx
src/pages/Campaigns/Campaigns.tsx
src/components/Dialogs/CampaignDialog/CampaignDialog.tsx
src/hooks/tables/useCampaignsColumns.tsx
src/hooks/queries/campaigns.queries.ts
src/service/campaigns/campaigns-service.ts
src/service/campaigns/campaigns-service.types.ts
```

## Defect

| Area | Current behavior | Required behavior |
|---|---|---|
| `/campaigns` table edit action | Edit button does not open a campaign edit modal | Edit button opens `CampaignDialog` with selected campaign values |
| Campaign edit submit | Existing campaign cannot be edited from table action | Submit sends update request and refreshes campaign list/cache |

## Implementation

- Use one dialog control pattern for `CampaignDialog`.
- Do not pass ignored props to `CampaignDialog`.
- Open edit mode through `useModal<CampaignDialogData>('campaign-dialog')` with `{ campaign }`.
- Keep create mode from header button working.
- Pre-fill `title` and `description` from selected campaign.
- Preserve empty title/description normalization already used by `CampaignDialog`.
- Keep active toggle and delete behavior unchanged.
- Remove duplicate `CampaignDialog` mounts if they produce conflicting modal state.

## Acceptance

- Clicking `Editar` on any campaign row opens modal title `Editar campanha`.
- Modal fields show the selected campaign `title` and `description`.
- Clicking `Salvar campanha` calls campaign update mutation with selected campaign `id`.
- Successful save closes only the campaign modal.
- Successful save updates visible row data without requiring a full page reload.
- Clicking `Nova campanha` still opens modal title `Nova campanha`.
- Cancel and overlay close reset form state.

## Do Not

- Do not implement a separate edit-only modal component.
- Do not alter campaign API routes unless the frontend contract is proven wrong.
- Do not change campaign active/delete behavior.

## Validation

```sh
npm run lint
npm run build
```
