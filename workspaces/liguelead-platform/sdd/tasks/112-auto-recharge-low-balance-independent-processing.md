---
id: auto-recharge-low-balance-independent-processing
title: Keep low-balance auto-recharge processing independent per product
scope: auto-recharge-low-balance-multi-product
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - docs/human/modules/auto-recharges.md
depends_on:
  - auto-recharge-recurring-api-refactor
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4692323202
github_issue_number: 35
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/35
github_issue_node_id: I_kwDORpoJ688AAAABF68rgg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/35
github_project_item_id: 201947926
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJexY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201947926"
github_project_status: Done
---

## Files

| File | Required change |
|------|-----------------|
| `src/modules/auto-recharges/services/auto-recharge-processor.service.ts` | Split low-balance rules into independent payment/charge groups. |
| `src/modules/auto-recharges/use-cases/auto-recharges.use-cases.ts` | Preserve per-credit-type low-balance trigger filtering. |
| `tests/auto-recharge-processor.spec.ts` | Add independent low-balance payment tests. |
| `tests/auto-recharges.spec.ts` | Add low-balance trigger filtering/regression tests if missing. |
| `tests/validate-order-pricing.spec.ts` | Preserve auto-recharge tariff resolution tests. |
| `docs/human/modules/auto-recharges.md` | Document current recurring items shape, low-balance single-product shape, pricing order, and distinct low-balance charging. |

## Processing rules

| Trigger type | Payment grouping |
|--------------|------------------|
| `recurring` | One payment/charge per active recurring rule; include all `items` from that rule. |
| `low_balance` | One payment/charge per triggered low-balance rule; do not merge multiple low-balance rules into one payment. |

## Low-balance invariant

- `low_balance` must remain one rule per `client_id + credit_type_id`.
- `low_balance` create/update schemas must not accept multi-item `items` as the source of truth.
- `processLowBalanceAutoRechargesForClient(clientId)` must compare each rule against that rule's own `creditTypeId` balance.
- If only SMS balance is `<= triggerValue`, only the SMS rule must be sent to payment processing.
- If SMS, Voice, and SMS Flash are all `<= triggerValue`, create three separate payments/charges.
- A failure in one low-balance rule must not block attempts for other triggered low-balance rules.
- Low-balance failures must keep `incrementRetry: false`.

## Tariff resolution

`validateAutoRechargePricing(clientId, items)` must resolve each item in this order:

1. `customized_packages` where `clients_id = clientId`, `credits_types_id = creditTypeId`, `unitary_value > 0`.
2. `packages` where `credits_types_id = creditTypeId`, `profiles_id = 3`, `deleted = 0`, `range_start <= quantity`, `range_end >= quantity`.
3. Throw `400 PACKAGE_NOT_FOUND`.

## Tests

- Assert two triggered low-balance rules with the same `clientId` and `clientCreditCardId` create two `paymentsRepository.create` calls and two `processPayment` calls.
- Assert one triggered low-balance rule creates one payment containing only that credit type.
- Assert recurring rule with multiple `items` still creates one payment containing all recurring items.
- Assert `validateAutoRechargePricing` still checks custom package before package range.
- Assert standard package range query uses `creditTypeId` and `quantity`.

## Constraints

- Do not change route paths.
- Do not change Mercado Pago/Iugu gateway orchestration contracts.
- Do not create a combined low-balance multi-item rule.
- Do not credit products whose balance did not trigger that rule.
