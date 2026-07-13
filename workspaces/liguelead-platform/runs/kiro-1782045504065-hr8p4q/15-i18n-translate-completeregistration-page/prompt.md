You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-completeregistration-page
Title: i18n: Translate CompleteRegistration page

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

### i18n-translate-completeregistration-page
Task id: i18n-translate-completeregistration-page
Task title: i18n: Translate CompleteRegistration page
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/15-i18n-translate-completeregistration-page/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-completeregistration-page
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
