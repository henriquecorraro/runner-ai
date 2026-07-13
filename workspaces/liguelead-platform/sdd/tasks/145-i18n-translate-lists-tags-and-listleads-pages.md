---
id: i18n-translate-lists-tags-and-listleads-pages
title: "i18n: Translate Lists (Tags) and ListLeads pages"
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
github_issue_id: 4710486569
github_issue_number: 90
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/90
github_issue_node_id: I_kwDORqaAXc8AAAABGMRSKQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/90
github_project_item_id: 202913967
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOK8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913967"
github_project_status: Done
---

## Scope

Translate Lists/Tags pages. Namespace: `lists`.

## Files to modify

- `src/pages/Lists/Lists.tsx`
- `src/pages/Lists/components/ListsContent.tsx`
- `src/pages/ListLeads/ListLeads.tsx`
- `src/pages/ListLeads/components/ListLeadsContent.tsx`
- `src/hooks/tables/useListsColumns.tsx`
- `src/components/Dialogs/CreateLeadListDialog/CreateLeadListDialog.tsx`
- `src/components/Dialogs/MergeListsDialog/MergeListsDialog.tsx`
- `src/components/Dialogs/CreateListFromFilterModal/CreateListFromFilterModal.tsx`

## Translations (3 locales)

pt-BR keys:
```
lists.title = "Tags"
lists.subtitle = "Organize as tags usadas nos seus envios."
lists.newTag = "Nova tag"
lists.mergeTags = "Mesclar tags"
lists.uploadLeads = "Upload de leads"
lists.table.columns.name = "Nome"
lists.table.columns.totalLeads = "Total de leads"
lists.table.columns.totalBlocklist = "Total em blocklist"
lists.table.columns.createdAt = "Criado em"
lists.table.columns.updatedAt = "Atualizado em"
lists.table.emptyTitle = "Nenhuma tag encontrada."
lists.table.footerText = "{{filtered}} de {{total}} tags"
lists.table.ariaLabel = "Tabela de tags"
lists.editDialog.title = "Editar tag"
lists.editDialog.nameLabel = "Nome"
lists.editDialog.colorLabel = "Cor da tag"
lists.deleteDialog.title = "Tem certeza que deseja excluir a Tag?"
lists.deleteDialog.deleteTag = "Excluir tag"
lists.success.updated = "Tag atualizada com sucesso."
lists.success.deleted = "Tag excluída com sucesso."
lists.errors.updateFallback = "Não foi possível atualizar a tag."
lists.errors.updateConflict = "Já existe uma tag com esse nome."
lists.errors.updateValidation = "Revise os dados da tag e tente novamente."
lists.errors.deleteFallback = "Não foi possível excluir a tag."
lists.error.title = "Não foi possível carregar as tags"
lists.error.description = "Houve uma falha ao buscar os dados. Tente novamente em instantes."
lists.listLeads.backLink = "Voltar para tags"
lists.listLeads.title = "Leads da tag: {{tagName}}"
```

Provide equivalent es-ES and en translations following same structure.

## Constraints

- Replace `toLocaleDateString('pt-BR')` with `formatDate()` from `@/i18n/formatters`.
- Do NOT translate tag names (user-defined data).

## Validation

```bash
npm run lint
npm run build
```
