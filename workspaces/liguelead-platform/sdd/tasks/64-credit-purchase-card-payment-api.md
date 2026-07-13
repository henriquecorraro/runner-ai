---
id: 64-credit-purchase-card-payment-api
title: Plan native credit purchase card-payment API migration
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
  - platform-front/docs/features/legacy-credit-card-payment-flow.md
depends_on:
  - 65-credit-payment-middleware-contracts
  - 63-credit-card-vault-and-management-api
---

Phase 2 task: implement the native platform-api flow that can eventually replace the phase 1 middleware-to-legacy adapter for credit-card credit purchases.

This is not required for the first production version of the new credit purchase screen. Phase 1 should create/charge payments by calling the legacy `areadocliente` endpoints through middleware.

Legacy flow to reproduce:
- The frontend first creates a pending credit request/order, equivalent to legacy `creditos/solicitar`.
- The frontend then charges a new card or selected saved card, equivalent to legacy `api/creditos/registrar-pagamento`.
- On gateway success (`approved` or `authorized` in the legacy service), the backend approves the credit request and releases credits/balances/units.

Implementation requirements:
- Keep request/response compatibility with the phase 1 middleware contracts so the frontend can move from legacy adapter to native platform-api without a rewrite.
- Add an authenticated create-credit-order use case for the selected credit packages/cart.
- Reuse the credit package pricing rules from the existing catalog: package range validation, custom package price handling, minimum purchase validation, and selected product quantities.
- Preserve residual-balance exchange guardrails if that feature is in scope for the new screen: only one balance source at a time and no multi-product exchange.
- Use cents as the canonical amount unit in API contracts and persistence. Avoid parsing formatted BRL strings in backend contracts.
- Add a charge-credit-order use case supporting a new tokenized card and, if product decides to support it, an existing saved/vault card.
- Resolve the legacy mismatch deliberately: saved cards are listed in the old UI but `Payment_service::processPayment` blocks non-subscription saved-card charges. The new API must either support saved-card credit purchases with tests or return a capability flag so the frontend hides saved cards.
- Persist gateway payment ids/statuses/responses safely, with redacted logs.
- Release credits only after a successful gateway outcome and make release idempotent so retries/webhooks cannot double-credit balances, credits, or units.
- Return frontend-friendly statuses for approved, authorized, pending, rejected, failed, and validation errors.
- Include tests for package validation, minimum purchase, order creation, new-card charge, saved-card decision behavior, duplicate submit/idempotency, and credit release.
