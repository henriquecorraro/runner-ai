---
id: i18n-translate-sms-page
title: i18n: Translate SMS page
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
github_issue_id: 4710490504
github_issue_number: 93
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/93
github_issue_node_id: I_kwDORqaAXc8AAAABGMRhiA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/93
github_project_item_id: 202914219
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOas
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914219"
github_project_status: Todo
---

## Scope

Translate SMS page. Namespace: `sms`.

## Files to modify

- `src/pages/Sms/Sms.tsx`
- `src/pages/Sms/components/SmsContent.tsx`
- `src/hooks/tables/useSmsColumns.tsx`
- `src/components/Dialogs/SmsDialog/SmsDialog.tsx`
- `src/components/Dialogs/SmsShortLinksDialog/SmsShortLinksDialog.tsx`

## Key translations (pt-BR → es-ES → en)

- title: "SMS" (same all locales)
- counter: "Você possui {{count}} SMS cadastrado(s)" — use i18next pluralization: `"counter_one": "Você possui {{count}} SMS cadastrado"`, `"counter_other": "Você possui {{count}} SMS cadastrados"`
- newSms: "Novo SMS" → "Nuevo SMS" → "New SMS"
- Table columns: SMS, Mensagem, Créditos, Tamanho, Data de Criação, Ações
- "{{length}} caracteres" → "{{length}} caracteres" → "{{length}} characters"
- Activate/Deactivate/Delete action labels with interpolation: `"activate": "Ativar {{title}}"`, etc.

## Pluralization

Use i18next `_one` / `_other` suffixes for the counter text.

## Constraints

- Replace date formatting with `formatDate()`.
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
