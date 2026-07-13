---
id: auto-recharge-failure-message-and-new-card-retry
title: Auto Recharge Failure Message and New Card Retry
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
github_issue_id: 4692873455
github_issue_number: 36
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/36
github_issue_node_id: I_kwDORpoJ688AAAABF7eQ7w
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/36
  - https://github.com/ligue-lead-tech/platform-front/issues/56
github_project_item_id: 201980881
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwJ-9E
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201980881"
github_project_status: Done
---

## Objective
- Replace raw gateway failure output in auto-recharge configured rules with clean customer-facing card failure messages.
- Add new-card retry flow from failed auto-recharge rules.
- Charge before saving a new card.
- Persist the new card only after a successful retry charge.

## Backend Files
```text
platform-api/src/modules/auto-recharges/use-cases/auto-recharges.use-cases.ts
platform-api/src/modules/auto-recharges/services/auto-recharge-processor.service.ts
platform-api/src/modules/auto-recharges/schemas/auto-recharges.schemas.ts
platform-api/src/modules/credit-cards/use-cases/credit-cards.use-cases.ts
platform-api/tests/auto-recharges.spec.ts
platform-api/docs/human/modules/auto-recharges.md
```

## Frontend Files
```text
platform-front/src/components/AutoRechargeSection/AutoRechargeSection.tsx
platform-front/src/components/CardPaymentModal/CardPaymentModal.tsx
platform-front/src/pages/Credits/Credits.tsx
platform-front/src/service/auto-recharges/auto-recharges-service.types.ts
platform-front/docs/features/credit-purchase.md
```

## API Contract
```ts
type RetryAutoRechargePayload =
  | { clientCreditCardId: number }
  | { newCard: NewCardData };
```

## Backend Requirements
- Accept saved-card retry payloads.
- Accept new-card retry payloads.
- Reject duplicated new cards before charging.
- Process new-card retries through the normal purchase gateway fallback order.
- Do not save the new card before an approved charge.
- Save the charged card after a successful gateway response.
- Update the auto-recharge rule to the saved new card id after success.
- Return a clean failure response when both gateway attempts fail.

## Frontend Requirements
- Display clean failed-rule text instead of raw gateway JSON.
- Add a `New card` tile in the change-card modal.
- Open the card entry modal in card-only mode.
- Submit the new card to the auto-recharge retry endpoint.
- Show success after charge and rule card update.
- Do not route to `/credits/buy` for this flow.

## Error Mapping
| Internal Code | UI Message |
| --- | --- |
| `CARD_NOT_FOUND` | `Não foi possível cobrar o cartão configurado.` |
| `GATEWAY_DECLINED` | `Falha no cartão. Verifique os dados ou altere o cartão para tentar novamente.` |
| `AUTO_RECHARGE_PAYMENT_FAILED` | `Falha no cartão. Verifique os dados ou altere o cartão para tentar novamente.` |
| unknown | `Falha ao processar a recarga automática.` |

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
