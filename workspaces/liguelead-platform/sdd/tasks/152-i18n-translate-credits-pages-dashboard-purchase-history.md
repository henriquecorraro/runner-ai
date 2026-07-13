---
id: i18n-translate-credits-pages-dashboard-purchase-history
title: "i18n: Translate Credits pages (dashboard, purchase, history)"
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
  - i18n-create-locale-aware-formatters-helper
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710495684
github_issue_number: 97
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/97
github_issue_node_id: I_kwDORqaAXc8AAAABGMR1xA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/97
github_project_item_id: 202914654
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYO14
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914654"
github_project_status: Done
---

## Scope

Translate Credits domain (dashboard, purchase, history). Namespace: `credits`.

## Files to modify

- `src/pages/Credits/Credits.tsx`
- `src/pages/CreditPurchase/CreditPurchase.tsx`
- `src/pages/CreditHistory/CreditHistory.tsx`
- `src/pages/CreditHistory/components/HistoryFilters.tsx`
- `src/components/AutoRechargeSection/AutoRechargeSection.tsx`
- `src/components/AutoRechargeSection/AutoRechargeNewCardRetryModal.tsx`
- `src/components/Dialogs/CardPaymentModal/CardPaymentModal.tsx`
- `src/components/Dialogs/OrderDetailModal/OrderDetailModal.tsx`

## Key translations

- Credits dashboard: "Créditos", "Seus créditos", "Comprar Crédito", "Histórico", "Recarga automática"
- Balance card: "Seu saldo total", "Saldo de créditos atual", "Nenhum crédito disponível.", "saldo financeiro disponível"
- Purchase: product cards, package tables, checkout flow, payment method selection (Cartão/PIX/Boleto)
- History: statusLabels (Pendente/Aprovado/Reprovado/Aguardando pagamento/Expirado/Falha no cartão), table headers, pagination
- Auto-recharge: config labels, toggle texts, threshold/amount fields
- formatCurrency for all monetary values — already uses BRL, keep as-is.

## Constraints

- Currency formatting stays `formatCurrency()` (always BRL/pt-BR) — do NOT localize currency.
- `formatNumber()` and `formatDate()`/`formatDateTime()` must use active locale.
- Provide full JSON for all 3 locales.
- This is a large task (~38k CreditPurchase) — focus on UI text extraction.

## Validation

```bash
npm run lint
npm run build
```
