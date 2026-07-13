---
id: 63-credit-card-vault-and-management-api
title: Plan native credit-card vaulting and card management API migration
scope: credit-card-payments-native-migration
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api/docs/human/credit-purchase.md
  - platform-api/docs/human/modules/clients.md
  - platform-front/docs/features/legacy-credit-card-payment-flow.md
depends_on:
  - 65-credit-payment-middleware-contracts
---

Phase 2 task: plan and implement the native platform-api card-vaulting foundation that can eventually replace the phase 1 middleware-to-legacy adapter.

This is not required for the first production version of the new credit purchase screen. Phase 1 should reuse the legacy `areadocliente` payment/card endpoints through middleware.

Legacy behavior to preserve:
- The legacy purchase/profile flows store only card metadata locally: internal card id, client id, last four digits, expiration, status/favorite flag, gateway card ids, gateway customer ids, and holder/address info.
- The legacy standalone save endpoint validates card data and holder data, saves the card in the gateway vault, then persists local card rows.
- Deactivation is a soft status change and is blocked when the card is linked to an active subscription.
- Favorite card changes clear the previous favorite for the client and mark the selected card.

Implementation requirements:
- Use the phase 1 middleware contracts as the frontend-facing compatibility target so moving from legacy adapter to native platform-api does not require a frontend rewrite.
- Add or extend the platform-api payment/card domain following existing module patterns.
- Create migrations/entities/repositories for saved cards, gateway vault references, holder/address info, and gateway logs if equivalent tables do not already exist.
- Expose authenticated use cases for listing active client cards, saving a new card, favoriting a card, and deactivating a card.
- Persist no raw PAN or CVC. Store only masked metadata and gateway vault identifiers.
- Define the chosen tokenization strategy explicitly. Prefer provider/browser tokens; if any raw-card backend path is temporarily required, isolate it, validate it, and redact it everywhere.
- Validate cardholder name, buyer first/last name, CPF/CNPJ, expiration, security code presence, address fields, main-user email, and client phone/WhatsApp as canonical API validation.
- Decide and document whether address complement is required, because legacy frontend and service validation diverge.
- Implement log redaction for PAN, CVC, card tokens, authorization headers, payment method ids when sensitive, and gateway credentials.
- Include unit/integration tests for validation failures, persistence shape, favorite switching, inactive-card filtering, active-subscription deletion guard, and log redaction.
