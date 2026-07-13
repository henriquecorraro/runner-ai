You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components
Title: i18n: Translate remaining hardcoded strings in dialogs and shared components

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components
Task id: i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components
Task title: i18n: Translate remaining hardcoded strings in dialogs and shared components
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782054961934-qj41y2/01-i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
