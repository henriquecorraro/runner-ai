You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-create-locale-aware-formatters-helper
Title: i18n: Create locale-aware formatters helper

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

### i18n-create-locale-aware-formatters-helper
Task id: i18n-create-locale-aware-formatters-helper
Task title: i18n: Create locale-aware formatters helper
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Create `src/i18n/formatters.ts`

Locale-aware formatters that use the active i18next language. Currency always BRL (R$) with pt-BR number formatting regardless of locale.

```typescript
import i18n from './index'

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(i18n.language, options ?? { dateStyle: 'short' }).format(date)
}

export function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language).format(value)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatCurrencyFromCents(valueCents: number): string {
  return formatCurrency(valueCents / 100)
}
```

## Constraints

- Currency formatter ALWAYS uses `'pt-BR'` locale and `'BRL'` currency — no locale switching for money.
- All other formatters (date, number, percent) follow the active i18n locale.
- Export all functions as named exports.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/02-i18n-create-locale-aware-formatters-helper/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-create-locale-aware-formatters-helper
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
