---
id: 67-credit-payment-reconciliation-and-observability
title: Add legacy credit payment adapter safety and observability
scope: credit-card-payments
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
docs_targets:
  - middleware/docs/operations/README.md
  - platform-front/docs/features/legacy-credit-card-payment-flow.md
depends_on:
  - 65-credit-payment-middleware-contracts
---

Add the operational safety layer around the phase 1 middleware adapter that reuses legacy credit-card credit purchases.

Why this exists:
- The phase 1 implementation calls legacy endpoints that already talk to gateways and release credits.
- Middleware still needs retry protection, redacted logs, stable statuses, and support visibility.
- Native webhook/reconciliation may not be fully possible until gateway orchestration moves out of legacy.

Agent guardrails:
- Implement operational safety for the phase 1 middleware-to-legacy adapter only.
- Do not move gateway webhook ownership, card vaulting, payment tables, or gateway orchestration into middleware unless legacy already exposes a safe integration point.
- Do not implement tasks `63-credit-card-vault-and-management-api` or `64-credit-purchase-card-payment-api` as part of this task.

Idempotency and locking:
- Require an `idempotencyKey` for create-order and charge requests.
- Add adapter-level idempotency keys/locks around credit-order creation and charge requests so duplicate browser submits cannot call legacy twice for the same intended checkout.
- If middleware already has Redis available, prefer Redis for cross-process locks and short-lived checkout records. If another shared store is the repository standard, use that pattern.
- Suggested Redis keys:
  - `credit-payment:idempotency:{userId}:{operation}:{idempotencyKey}`
  - `credit-payment:checkout:{checkoutAttemptId}`
  - `credit-payment:legacy-payment:{legacyPaymentId}`
- Store a hash of the normalized request body with the idempotency record.
- Same idempotency key and same body should return the original/current response.
- Same idempotency key and different body should return `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`.
- An in-flight duplicate should not call legacy again. Return the current known status or `409 PAYMENT_ATTEMPT_IN_PROGRESS`, depending on existing middleware API conventions.
- Use a TTL long enough for browser retries and support inspection, for example 24 to 48 hours unless the repository has a stronger default.

Correlation records:
- Generate or accept a checkout correlation id that is safe to show to support.
- Tie together: authenticated user id, client id resolved by auth, frontend checkout attempt id, order id returned to the frontend, legacy payment id from `creditos/solicitar`, charge idempotency key, normalized status, created/updated timestamps, and last safe error code.
- Never store PAN, CVC, raw card token, authorization headers, gateway credentials, raw gateway payloads, or full document numbers in correlation records.
- Store totals in cents and a payload hash so support can compare duplicate attempts without seeing sensitive card data.

Status model:
- Normalize enough non-sensitive status metadata for support and UI behavior.
- Use a stable status enum, at least:
  - `created`
  - `order_creating`
  - `legacy_order_created`
  - `charge_submitting`
  - `approved`
  - `authorized`
  - `pending`
  - `in_process`
  - `rejected`
  - `failed`
  - `adapter_error`
  - `unknown`
- Map legacy success where status is `approved` or `authorized` to a successful credit purchase, because legacy approves/releases credits on those statuses.
- Map known gateway declines to `rejected`, legacy validation or customer data problems to `failed` with user-safe codes, and transport/timeouts to retryable adapter errors when safe.

Redaction:
- Redact gateway logs and middleware application logs for PAN, CVC, token, authorization, gateway credentials, sensitive customer payment identifiers, cardholder document, and address details beyond what support truly needs.
- Review existing middleware request body logging and extend redaction centrally where possible so card fields are protected even on validation errors.
- Redaction tests should include nested fields and legacy names: `card`, `cardNumber`, `securityCode`, `cvc`, `cvv`, `iuguToken`, `token`, `authorization`, `cardGatewayId`, `purchaseCpf`, and address fields.

Metrics and structured logs:
- Add metrics or structured logs for adapter failures, legacy endpoint failures, gateway-declined responses surfaced by legacy, duplicate-submit prevention, successful approvals, session-bridge failures, and unsupported saved-card attempts.
- Every adapter log should include correlation id, operation, normalized status, and safe error code.
- No metric label should include unbounded or sensitive values such as card digits, document numbers, customer names, gateway tokens, or raw error strings.

Reconciliation:
- If legacy exposes a safe status-check endpoint for credit payments, add a reconciliation/status-check mechanism for orders left in `pending`, `authorized`, `in_process`, or `unknown` states.
- If legacy does not expose safe status checks or webhooks, document the operational limitation and point to the phase 2 native platform-api tasks.
- Do not implement native gateway webhooks in middleware unless the selected legacy/gateway integration can support them without bypassing legacy state.
- If no automated reconciliation is possible, expose enough correlation metadata for support to look up the payment in legacy by legacy payment id.

Operational documentation:
- Document the support procedure for duplicate-click reports, stuck payments, gateway declines, legacy session failures, and manual reconciliation in legacy.
- Document which statuses are final, which are retryable, and which require support review.
- Document the saved-card credit purchase limitation if verified during task `65-credit-payment-middleware-contracts`.
- Document how to inspect logs safely without exposing payment data.

Acceptance criteria:
- Duplicate create-order and charge requests cannot create duplicate legacy payments or duplicate gateway charges.
- Idempotency keys are scoped by authenticated user/client and operation.
- Reused idempotency keys with different payloads return a conflict.
- Correlation records tie frontend attempts to legacy payment ids using only non-sensitive data.
- Middleware logs and tests prove sensitive payment fields are redacted.
- UI-facing statuses and errors are normalized and stable.
- Operational docs explain reconciliation limits while the gateways remain owned by legacy.
- Tests cover duplicate submit, in-flight duplicate behavior, payload-hash conflicts, redaction, legacy failure mapping, status metadata, and documented reconciliation limitations.
