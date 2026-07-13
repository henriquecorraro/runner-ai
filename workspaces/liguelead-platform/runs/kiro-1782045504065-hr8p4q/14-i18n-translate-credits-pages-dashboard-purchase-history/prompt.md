You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-credits-pages-dashboard-purchase-history
Title: i18n: Translate Credits pages (dashboard, purchase, history)

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

### i18n-translate-credits-pages-dashboard-purchase-history
Task id: i18n-translate-credits-pages-dashboard-purchase-history
Task title: i18n: Translate Credits pages (dashboard, purchase, history)
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/14-i18n-translate-credits-pages-dashboard-purchase-history/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-credits-pages-dashboard-purchase-history
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
