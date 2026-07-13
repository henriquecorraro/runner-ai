---
id: animate-credit-package-cart-addition
title: Animate credit package addition in purchase summary
scope: credit-purchase-cart-feedback
status: done
repositories:
  - platform-front
validation:
  - platform-front:npx eslint src/pages/CreditPurchase/CreditPurchase.tsx src/pages/CreditPurchase/CreditPurchase.styles.ts
  - platform-front:npm run build
docs_targets:
  - platform-front/docs/features/credit-purchase.md
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4696260979
github_issue_number: 68
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/68
github_issue_node_id: I_kwDORqaAXc8AAAABF-tBcw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/68
github_project_item_id: 202162882
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMwsI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202162882"
github_project_status: Done
---

## Files

```text
platform-front/src/pages/CreditPurchase/CreditPurchase.tsx
platform-front/src/pages/CreditPurchase/CreditPurchase.styles.ts
platform-front/docs/features/credit-purchase.md
```

## Requirements

| Area | Requirement |
| --- | --- |
| Package modal | Keep `Aplicar pacote` behavior: confirm draft package selection and close modal. |
| Order summary | Highlight the selected product row when a package is applied or replaced. |
| Animation | Use a short non-blocking animation on the cart/summary item that became selected. |
| Feedback | Make the summary item visually draw attention after the modal closes. |
| Repeat selection | Re-trigger the animation when the same product receives a different quantity/package. |
| Accessibility | Do not trap focus. Do not add flashing or long-running motion. Respect `prefers-reduced-motion`. |
| Layout | Do not shift surrounding summary rows or payment controls. |

## Constraints

- Do not change payment API payloads.
- Do not change package pricing rules.
- Do not keep the modal open after applying a package.
- Do not add global notification/toast for this task.

## Validation

```bash
cd /home/rick/projetos/platform-front
npx eslint src/pages/CreditPurchase/CreditPurchase.tsx src/pages/CreditPurchase/CreditPurchase.styles.ts
npm run build
```
