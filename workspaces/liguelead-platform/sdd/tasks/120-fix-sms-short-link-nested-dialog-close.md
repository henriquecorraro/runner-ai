---
id: fix-sms-short-link-nested-dialog-close
title: Fix SMS short-link nested dialog close behavior
scope: frontend-bugfix
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4695428713
github_issue_number: 62
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/62
github_issue_node_id: I_kwDORqaAXc8AAAABF96OaQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/62
github_project_item_id: 202121396
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMILQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202121396"
github_project_status: Done
---

## Repositories

| Repository | Required |
|---|---|
| platform-front | yes |

## Files

```txt
src/components/Dialogs/SmsDialog/SmsDialog.tsx
src/components/Dialogs/SmsShortLinksDialog/SmsShortLinksDialog.tsx
src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx
src/hooks/useModal.tsx
src/App.tsx
```

## Defect

| Flow | Current behavior | Required behavior |
|---|---|---|
| Create SMS -> `Encurtar URL` -> close shortener | Closing shortener dialog also closes SMS create dialog | Closing shortener dialog closes only shortener dialog |
| Create SMS -> `Ver links encurtados` -> close list | Closing inner links dialog can affect parent modal | Closing inner links dialog closes only inner links dialog |

## Implementation

- Preserve `sms-dialog` modal state when `short-link-dialog` closes.
- Preserve `sms-dialog` modal state when `sms-short-links` closes.
- Prevent dialog close events, form submit events, and overlay interactions inside child dialogs from closing `sms-dialog`.
- Keep SMS draft state unchanged while child dialogs open and close.
- Keep global short-link dialog usage from `/shortener` working.
- Keep SMS edit mode immutable message behavior unchanged.

## Acceptance

- Open `/sms`.
- Click `Adicionar SMS`.
- Fill `Nome do SMS` and `Mensagem`.
- Click `Encurtar URL`.
- Close shortener dialog with `Fechar`.
- SMS modal remains open.
- Filled SMS fields remain unchanged.
- Repeat with overlay close or escape close when supported by design system.
- Click `Ver links encurtados`.
- Close links dialog.
- SMS modal remains open.
- Saving SMS after child dialog close still submits the SMS payload once.

## Do Not

- Do not persist incomplete SMS drafts to backend.
- Do not close `sms-dialog` from child dialog handlers.
- Do not remove short-link creation from the SMS flow.

## Validation

```sh
npm run lint
npm run build
```
