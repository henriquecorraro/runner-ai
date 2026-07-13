---
id: i18n-translate-audios-page
title: i18n: Translate Audios page
scope: i18n
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710491725
github_issue_number: 94
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/94
github_issue_node_id: I_kwDORqaAXc8AAAABGMRmTQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/94
github_project_item_id: 202914333
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOh0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914333"
github_project_status: Todo
---

## Scope

Translate Audios page. Namespace: `audios`.

## Files to modify

- `src/pages/Audios/Audios.tsx`
- `src/pages/Audios/components/AudiosContent.tsx`
- `src/hooks/tables/useAudiosColumns.tsx`
- `src/components/Dialogs/AudioDialog/AudioDialog.tsx`

## Key translations

- title: "Áudios" → "Audios" → "Audios"
- counter with pluralization: "Você possui {{count}} áudio(s) cadastrado(s)" → i18next `_one`/`_other`
- newAudio: "Novo áudio" → "Nuevo audio" → "New audio"
- Table columns, dialog fields (title, upload, TTS options), error/success messages.

## Constraints

- Provide full JSON for all 3 locales.
- Replace date formatting with `formatDate()`.

## Validation

```bash
npm run lint
npm run build
```
