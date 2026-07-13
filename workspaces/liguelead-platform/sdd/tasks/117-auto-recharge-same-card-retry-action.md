---
id: auto-recharge-same-card-retry-action
title: Auto Recharge Same Card Retry Action
scope: auto-recharge
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - platform-api:npm test -- tests/auto-recharges.spec.ts tests/auto-recharge-processor.spec.ts
  - platform-api:npm run typecheck
  - platform-api:npm run build
  - platform-front:npx eslint src/components/AutoRechargeSection/AutoRechargeSection.tsx src/components/CardPaymentModal/CardPaymentModal.tsx src/pages/Credits/Credits.tsx src/service/auto-recharges/auto-recharges-service.types.ts
  - platform-front:npm run build
docs_targets:
  - platform-api:docs/human/modules/auto-recharges.md
  - platform-front:docs/features/credit-purchase.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4692881054
github_issue_number: 38
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/38
github_issue_node_id: I_kwDORpoJ688AAAABF7eung
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/38
  - https://github.com/ligue-lead-tech/platform-front/issues/57
github_project_item_id: 201981456
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJ_hA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201981456"
github_project_status: Done
---

## Objective
- Add a retry action beside `Alterar cartão` for failed auto-recharge rules.
- Retry the failed rule with the currently configured card.
- Attempt all eligible gateways for the retry, including gateways not used by the failed attempt when the card can be charged through them.
- Keep `Alterar cartão` behavior for saved-card selection and new-card entry.

## Frontend Files
```text
platform-front/src/components/AutoRechargeSection/AutoRechargeSection.tsx
platform-front/src/components/AutoRechargeSection/AutoRechargeSection.styles.ts
platform-front/src/service/auto-recharges/auto-recharges-service.types.ts
platform-front/docs/features/credit-purchase.md
```

## Backend Files
```text
platform-api/src/modules/auto-recharges/use-cases/auto-recharges.use-cases.ts
platform-api/src/modules/auto-recharges/services/auto-recharge-processor.service.ts
platform-api/src/modules/auto-recharges/schemas/auto-recharges.schemas.ts
platform-api/tests/auto-recharges.spec.ts
platform-api/docs/human/modules/auto-recharges.md
```

## UI Requirements
- Render two actions for failed rules:
  - `Tentar novamente`
  - `Alterar cartão`
- `Tentar novamente` must use the current rule card.
- `Alterar cartão` must open the existing change-card modal.
- Show loading state only on the clicked action.
- Keep clean card-failure messages.
- Do not display raw gateway JSON.

## API Contract
```ts
type RetryAutoRechargePayload =
  | { retryCurrentCard: true }
  | { clientCreditCardId: number }
  | { newCard: NewCardData };
```

## Backend Requirements
- Resolve `retryCurrentCard: true` to the rule's current `clientCreditCardId`.
- Reject retry when the rule has no configured card.
- Retry the current card without changing the rule card id.
- Attempt all eligible gateways allowed by available card token data.
- Preserve existing saved-card change retry behavior.
- Preserve existing new-card retry behavior.
- Return a clean failure payload when all attempts fail.

## Gateway Rules
| Case | Behavior |
| --- | --- |
| current card has one gateway token | retry with that gateway token |
| current card has multiple gateway tokens | retry every available gateway until success |
| current card lacks required token for a gateway | skip that gateway |
| new card payload | use normal purchase fallback order |
| selected saved card payload | update rule card then retry |

## Error Cases
| Case | HTTP Status | Code |
| --- | --- | --- |
| rule not found | `404` | `AUTO_RECHARGE_NOT_FOUND` |
| current card missing | `400` | `CARD_NOT_FOUND` |
| all gateway attempts fail | `402` or existing payment failure status | `AUTO_RECHARGE_PAYMENT_FAILED` |

## Validation
```bash
cd /home/rick/projetos/platform-api
npm test -- tests/auto-recharges.spec.ts tests/auto-recharge-processor.spec.ts
npm run typecheck
npm run build

cd /home/rick/projetos/platform-front
npx eslint src/components/AutoRechargeSection/AutoRechargeSection.tsx src/components/CardPaymentModal/CardPaymentModal.tsx src/pages/Credits/Credits.tsx src/service/auto-recharges/auto-recharges-service.types.ts
npm run build
```
