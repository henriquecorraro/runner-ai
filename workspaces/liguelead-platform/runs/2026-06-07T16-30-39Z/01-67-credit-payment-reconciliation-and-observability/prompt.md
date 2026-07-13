You are running one shared Ecosystem AI Runner stage for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Batch id: 67-credit-payment-reconciliation-and-observability
Batch label: Add legacy credit payment adapter safety and observability

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- The user conversation may be in Portuguese or another language; translate planning content to English before writing centralized SDD artifacts.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-operating-mode/SKILL.md
- Then read the specific execution skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-task-executor/SKILL.md
- If ecosystem-local skills exist, inspect them and follow any that apply:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute every task listed below in the same agent session.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Use the task repository ownership to decide where to edit code.
- Keep cross-repository contract changes aligned across all affected repositories.
- Keep execution summaries short and operational to control token cost.
- Update repo docs only when the implementation is stable enough to describe the real module behavior.
- If the result is partial or needs another pass, record gaps and rework instead of writing large final docs.
- Do not revert unrelated user changes.
- Run the narrowest useful validation in each touched repository.

Repositories and tasks in this batch:

## middleware
Repository label: Middleware API
Repository root: /home/rick/projetos/middleware

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/ updated when route contracts, auth strategies, backend targets, or operational behavior change.; Regenerate docs/public-api artifacts with npm run docs:openapi whenever route catalogs or Zod schemas change.
- Default validation: npm run build ; npm test ; npm run docs:openapi

Mandatory tasks for this repository in the current batch:
- 67-credit-payment-reconciliation-and-observability: Add legacy credit payment adapter safety and observability

### 67-credit-payment-reconciliation-and-observability
Task id: 67-credit-payment-reconciliation-and-observability
Task title: Add legacy credit payment adapter safety and observability
Task file: 67-credit-payment-reconciliation-and-observability.md
Task status: open
Task scope: credit-card-payments
Docs targets: middleware/docs/operations/README.md, platform-front/docs/features/legacy-credit-card-payment-flow.md
Task validation: cd /home/rick/projetos/middleware && npm run build ; cd /home/rick/projetos/middleware && npm test

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/2026-06-07T16-30-39Z/01-67-credit-payment-reconciliation-and-observability/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Batch: 67-credit-payment-reconciliation-and-observability
- Repositories:
- Tasks:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
