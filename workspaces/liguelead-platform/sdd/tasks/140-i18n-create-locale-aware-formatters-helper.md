---
id: i18n-create-locale-aware-formatters-helper
title: i18n: Create locale-aware formatters helper
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-install-and-configure-i18next-with-language-detector
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710477002
github_issue_number: 85
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/85
github_issue_node_id: I_kwDORqaAXc8AAAABGMQsyg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/85
github_project_item_id: 202913426
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYNpI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913426"
github_project_status: Done
---

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
