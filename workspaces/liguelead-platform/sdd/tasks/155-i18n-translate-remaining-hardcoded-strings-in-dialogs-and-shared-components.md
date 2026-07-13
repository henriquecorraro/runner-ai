---
id: i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components
title: i18n: Translate remaining hardcoded strings in dialogs and shared components
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
  - i18n-translate-lists-tags-and-listleads-pages
  - i18n-translate-credits-pages-dashboard-purchase-history
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710945393
github_issue_number: 100
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/100
github_issue_node_id: I_kwDORqaAXc8AAAABGMtScQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/100
github_project_item_id: 202943402
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYq6o
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202943402"
github_project_status: Done
---

## Scope

Translate all remaining hardcoded PT-BR strings in dialogs and shared components that were missed during page-level i18n migration.

## Files with hardcoded strings

### Dialogs

- `src/components/Dialogs/CreateLeadListDialog/CreateLeadListDialog.tsx`
- `src/components/Dialogs/CreateListFromFilterModal/CreateListFromFilterModal.tsx`
- `src/components/Dialogs/MergeListsDialog/MergeListsDialog.tsx`
- `src/components/Dialogs/LeadListUploadDialog/LeadListUploadDialog.tsx`
- `src/components/Dialogs/DeleteConfirmationDialog/DeleteConfirmationDialog.tsx`

### Legacy duplicates (same components at different paths)

- `src/components/CreateLeadListDialog/CreateLeadListDialog.tsx`
- `src/components/CreateListFromFilterModal/CreateListFromFilterModal.tsx`
- `src/components/MergeListsDialog/MergeListsDialog.tsx`
- `src/components/LeadListUploadDialog/LeadListUploadDialog.tsx`

### Shared components

- `src/components/AppAlertHost/AppAlertHost.tsx` — "Fechar alerta"
- `src/components/Dialog/Dialog.tsx` — "Fechar"
- `src/components/NotificationsDropdown/NotificationsDropdown.tsx` — "Remover notificação"
- `src/components/AutoRechargeSection/AutoRechargeSection.tsx` — multiple strings
- `src/components/LanguageSelector/LanguageSelector.tsx` — "Idioma", "Select language"

## Strings to translate

| String | Key (namespace: common) |
|--------|------------------------|
| "Fechar alerta" | common.actions.closeAlert |
| "Fechar" | common.actions.close |
| "Remover notificação" | common.notifications.removeNotification |
| "Cancelar" | common.actions.cancel (already exists) |
| "Idioma" | common.languageSelector.title |
| "Select language" | common.languageSelector.ariaLabel |
| "Preencha os dados da tag para criar uma nova origem de leads." | lists.createDialog.description |
| "Ex.: Tag comercial abril" | lists.createDialog.namePlaceholder |
| "Opcional. Ex.: Tag de leads do time comercial." | lists.createDialog.descriptionPlaceholder |
| "Os leads que correspondem aos filtros abaixo serao adicionados a tag." | lists.createFromFilter.description |
| "Nome da tag" | lists.createFromFilter.nameLabel |
| "Ex.: leads-quentes" | lists.createFromFilter.namePlaceholder |
| "Descrição" | lists.createFromFilter.descriptionLabel |
| "Descrição da tag (opcional)" | lists.createFromFilter.descriptionPlaceholder |
| "Selecionar tag existente" | lists.createFromFilter.selectExistingAriaLabel |
| "Selecione uma tag" | lists.createFromFilter.selectExistingPlaceholder |
| "Buscar..." | common.search.placeholder |
| "Nenhum item" | common.search.emptyText |
| "Nenhum resultado encontrado" | common.search.noResults |
| "Carregando..." | common.loading.text |
| "Combine leads de várias tags e remova leads de outras." | lists.mergeDialog.description |
| "Nome da tag resultante" | lists.mergeDialog.resultNameLabel |
| "Ex.: Tag mesclada maio" | lists.mergeDialog.resultNamePlaceholder |
| "Tags para somar" | lists.mergeDialog.addTagsAriaLabel |
| "Selecione tags para adicionar" | lists.mergeDialog.addTagsPlaceholder |
| "Tags para retirar" | lists.mergeDialog.removeTagsAriaLabel |
| "Selecione tags para remover (opcional)" | lists.mergeDialog.removeTagsPlaceholder |
| "Sem validade" | credits.autoRecharge.noExpiry |
| "Não foi possível cobrar este cartão." | credits.autoRecharge.chargeError |
| "Consultando tarifa..." | credits.autoRecharge.consultingRate |
| "Tarifa indisponível" | credits.autoRecharge.rateUnavailable |
| "Quantidade de créditos da recarga" | credits.autoRecharge.quantityAriaLabel |
| "Qtd" | credits.autoRecharge.quantityPlaceholder |

## Instructions

- Use `useTranslation('common')` for shared strings.
- Use `useTranslation('lists')` for tag/list dialog strings — add keys to existing `lists` namespace JSONs.
- Use `useTranslation('credits')` for auto-recharge strings — add keys to existing `credits` namespace JSONs.
- Provide translations in all 3 locales (pt-BR, es-ES, en).
- If a component has a legacy duplicate at another path, update BOTH files identically.

## Constraints

- Do NOT change component behavior or styling.
- Do NOT translate user-entered data (tag names, etc.).

## Validation

```bash
npm run lint
npm run build
```
