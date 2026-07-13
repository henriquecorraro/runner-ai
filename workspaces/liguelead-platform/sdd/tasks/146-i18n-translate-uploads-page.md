---
id: i18n-translate-uploads-page
title: i18n: Translate Uploads page
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
github_issue_id: 4710487699
github_issue_number: 91
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/91
github_issue_node_id: I_kwDORqaAXc8AAAABGMRWkw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/91
github_project_item_id: 202914032
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOPA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914032"
github_project_status: Done
---

## Scope

Translate Uploads page. Namespace: `uploads`.

## Files to modify

- `src/pages/Uploads/Uploads.tsx`
- `src/pages/Uploads/components/UploadsContent.tsx`
- `src/hooks/tables/useUploadsColumns.tsx`
- `src/components/Dialogs/LeadListUploadDialog/LeadListUploadDialog.tsx`

## Key translations (pt-BR → es-ES → en)

- title: "Uploads" → "Uploads" → "Uploads"
- subtitle: "Acompanhe o processamento dos arquivos enviados." → "Acompañe el procesamiento de los archivos enviados." → "Track the processing of uploaded files."
- newUpload: "Novo upload" → "Nuevo upload" → "New upload"
- All table column headers, empty states, error states, dialog texts.
- Upload dialog: file selection labels, progress states, success/error messages.

## Constraints

- Replace date formatting with `formatDate()` / `formatDateTime()`.
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
