---
id: auto-recharge-low-balance-multi-product-wizard
title: Build one low-balance auto-recharge wizard for multiple products
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
  - auto-recharge-low-balance-independent-processing
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4692325853
github_issue_number: 54
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/54
github_issue_node_id: I_kwDORqaAXc8AAAABF6813Q
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/54
github_project_item_id: 201948074
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJe6o
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201948074"
github_project_status: Done
---

## Files

| File | Required change |
|------|-----------------|
| `src/components/AutoRechargeSection/AutoRechargeSection.tsx` | Replace single-product low-balance wizard path with multi-product row setup. |
| `src/components/AutoRechargeSection/AutoRechargeSection.styles.ts` | Add responsive row layout styles. |
| `src/service/auto-recharges/auto-recharges-service.types.ts` | Keep API payload types unchanged; add UI-only draft types if needed. |
| `src/hooks/queries/auto-recharges.queries.ts` | Support multiple sequential create calls through existing mutation or local submit helper. |
| `docs/features/credit-purchase.md` | Document one low-balance journey creating separate rules per product. |

## UX flow

| Step | Required UI |
|------|-------------|
| `trigger-type` | User chooses `Saldo mínimo`. |
| `rules` | Render SMS, Ligação, SMS Flash rows in one screen. |
| `card` | Render selected product rows and one saved-card selector. |

## Low-balance row

Each product row must contain:

| Area | Field |
|------|-------|
| Left | Enable checkbox/toggle. |
| Left | Product icon and label. |
| Middle | `triggerValue`: low-balance threshold input. |
| Right | `rechargeAmount`: credits to add input. |
| Right/secondary | Unit tariff for `rechargeAmount`. |
| Right/secondary | Total estimated value for that product. |

## State shape

```typescript
type LowBalanceProductDraft = {
  creditTypeId: 1 | 2 | 3;
  enabled: boolean;
  triggerValue: number | null;
  rechargeAmount: number | null;
};
```

## Submit behavior

For each enabled row, call existing create API once:

```typescript
{
  triggerType: "low_balance",
  triggerValue: number,
  clientCreditCardId: number,
  creditTypeId: 1 | 2 | 3,
  rechargeAmount: number
}
```

Rules:

- One user submit may create 1..3 low-balance rules.
- Do not create one combined low-balance payload.
- Use the same selected saved card for all created rules.
- Existing low-balance rules must disable that product row and show configured/unavailable state.
- If one create call fails after another succeeds, keep the modal open, show per-product error state, and refresh `autoRechargesQueryKey`.
- If all enabled create calls succeed, close the modal and show success feedback.

## Tariff preview

For each row:

1. Use `useCreditPackagesQuery(creditTypeId)` data.
2. If custom package exists (`rangeStart = 0` and `rangeEnd = 0`), show custom unit tariff.
3. Otherwise use package where `rangeStart <= rechargeAmount <= rangeEnd`.
4. Show unavailable tariff state when no package matches.
5. Show total as `rechargeAmount * unitaryValue`, rounded to BRL cents.

## Card review step

- Show one item per enabled product.
- Include product label, low-balance threshold, recharge amount, unit tariff, and product total.
- Show estimated sum across selected rows as display-only summary.
- Do not imply one combined future charge; label total as estimated selected setup total.

## Constraints

- Do not change backend or middleware contracts.
- Do not change recurring wizard behavior in this task.
- Do not allow submit with zero enabled rows.
- Do not allow submit when an enabled row has invalid threshold, invalid recharge amount, or unavailable tariff.
- Keep mobile layout usable: product row may stack fields vertically below tablet widths.
