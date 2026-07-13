---
id: i18n-translate-completeregistration-page
title: i18n: Translate CompleteRegistration page
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
github_issue_id: 4710496942
github_issue_number: 98
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/98
github_issue_node_id: I_kwDORqaAXc8AAAABGMR6rg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/98
github_project_item_id: 202914757
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYO8U
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914757"
github_project_status: Todo
---

## Scope

Translate CompleteRegistration page. Namespace: `registration`.

## Files to modify

- `src/pages/CompleteRegistration/CompleteRegistration.tsx`

## Key translations

- Page title: "Complete seu cadastro" → "Complete su registro" → "Complete your registration"
- Stepper labels, section titles (Dados pessoais/Endereço/Contatos)
- Type toggle: "Pessoa Física" / "Pessoa Jurídica" → "Persona Física" / "Persona Jurídica" → "Individual" / "Company"
- All field labels: Nome, CPF, CNPJ, Razão Social, Nome Fantasia, RG, CEP, Endereço, Número, Complemento, Bairro, Cidade, UF, WhatsApp, Telefone, Responsável, Especialista
- Placeholders for each field
- Error/success messages
- Submit button states

## Constraints

- BRAZIL_STATES_OPTIONS labels stay in Portuguese (they are official state names).
- Do NOT translate CPF/CNPJ/RG (these are Brazilian document types — keep as technical identifiers).
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
