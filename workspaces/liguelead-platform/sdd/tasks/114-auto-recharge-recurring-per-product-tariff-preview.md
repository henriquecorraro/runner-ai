---
id: auto-recharge-recurring-per-product-tariff-preview
title: Show per-product tariffs in recurring auto-recharge previews
scope: auto-recharge-low-balance-multi-product
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/credit-purchase.md
depends_on:
  - auto-recharge-frontend-wizard-refactor
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4692327824
github_issue_number: 55
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/55
github_issue_node_id: I_kwDORqaAXc8AAAABF689kA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/55
github_project_item_id: 201948185
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJfBk
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201948185"
github_project_status: Done
---

## Files

| File | Required change |
|------|-----------------|
| `src/components/AutoRechargeSection/AutoRechargeSection.tsx` | Show unit tariff and product total for each recurring item. |
| `src/components/AutoRechargeSection/AutoRechargeSection.styles.ts` | Add compact tariff row styles if inline styles are insufficient. |
| `docs/features/credit-purchase.md` | Document recurring tariff details per product. |

## Creation wizard

In recurring `items` step:

- Keep one row per enabled product.
- Show product label.
- Show recharge amount.
- Show unit tariff as `R$ x,xxx/crédito`.
- Show product total as `R$ x,xx`.
- Show sum across enabled products.
- Show loading state per product while package query is loading/fetching.
- Show unavailable state per product when no tariff package matches.

## Card review step

For recurring rules, each selected item must show:

| Field | Source |
|-------|--------|
| Product label | `creditTypeId` label map |
| Recharge amount | `item.rechargeAmount` |
| Unit tariff | tariff preview for `item.creditTypeId + item.rechargeAmount` |
| Product total | `item.rechargeAmount * unit tariff` |

## Edit dialog

For recurring edit:

- Show the same unit tariff and product total for each enabled edit item.
- Update values live when quantity changes.
- Preserve total estimated sum.
- Preserve product enable/disable behavior.

## Tariff resolution parity

Frontend preview must mirror backend auto-recharge pricing as closely as package API allows:

1. Use custom package first when `rangeStart = 0` and `rangeEnd = 0`.
2. Otherwise use package where `rangeStart <= quantity <= rangeEnd`.
3. Do not use nearest lower package for auto-recharge preview.
4. Show unavailable state when no package covers the quantity.

## Constraints

- Do not change create/update payload shape.
- Do not change low-balance UI in this task.
- Do not hide total estimated recurring sum.
- Do not label estimated totals as charged now.
