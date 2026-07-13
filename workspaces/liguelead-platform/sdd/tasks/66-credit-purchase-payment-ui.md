---
id: 66-credit-purchase-payment-ui
title: Build credit purchase payment UI and card registration flow
scope: credit-card-payments
status: done
repositories:
  - platform-front
  - middleware
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
  - "cd /home/rick/projetos/middleware && npm run build"
docs_targets:
  - platform-front/docs/features/credit-purchase.md
  - platform-front/docs/features/legacy-credit-card-payment-flow.md
depends_on:
  - 65-credit-payment-middleware-contracts
---

Extend the new platform credit purchase screen with the payment-method and credit-card behavior mapped from the legacy areadocliente checkout.

Agent guardrails:
- Phase 1 consumes only the middleware legacy-payment adapter contracts from `65-credit-payment-middleware-contracts`.
- The frontend must not call `areadocliente` directly and must not depend on native platform-api payment routes from tasks `63-credit-card-vault-and-management-api` or `64-credit-purchase-card-payment-api`.
- Do not implement gateway calls, direct token creation against legacy routes, or card persistence in the frontend beyond the approved middleware contract.
- Ignore strange legacy typing when needed, but preserve the described screen flow and user-visible behavior.

Design and page consistency:
- Follow the existing platform-front page/card/title/subtitle styling patterns already used by the credit purchase page and neighboring modules.
- Use the same Title/subtitle pattern as adjacent pages.
- Keep card borders subtle and small.
- Remove decorative hover styles that are not used by neighboring cards.
- On hover, use the standard card `box-shadow` pattern used elsewhere and a light `translateY` transition.
- Keep payment controls compact enough to fit naturally with the package selection/cart layout on desktop, and responsive on mobile.

Services, hooks, and types:
- Add or extend a frontend service for the middleware credit-payment routes, for example `credit-payments-service`.
- Add query/mutation hooks following the repository's existing query patterns.
- Model API responses with frontend-owned types that match the middleware contract. If a legacy or generated type is odd, isolate it in the service mapping instead of leaking it into UI state.
- Never store raw card details in a global store, cache, URL, analytics event, or persisted browser storage.

Capability-driven payment methods:
- Load `GET /credit-payments/capabilities` before enabling checkout payment actions.
- Add payment method selection for the methods product decides to support in the new platform, starting with credit card.
- Do not infer payment method availability from the saved-card list.
- Do not hide the credit-card payment method just because the client has no saved card. A client with no saved cards must still be able to choose card and add a new card when new-card card payment is supported.
- If `supportsSavedCard=false`, hide or disable only saved-card selection with product-approved copy; keep new-card card payment available when `supportsNewCard=true`.
- If `supportsNewCard=false`, do not render a raw card form.

Explicit React state:
- Model checkout state explicitly: selected payment method, card entry mode, selected internal card id, selected gateway/vault card id, new-card form state, order id, charge status, idempotency keys, and errors.
- Avoid deriving critical payment behavior from uncontrolled DOM fields or hidden inputs. The legacy screen used hidden fields; the new screen should use explicit React state.
- Keep separate loading states for capabilities, saved cards, order creation, charge submission, card deletion, and card save/favorite operations.

Required UI states:
- Empty cart: payment action disabled and validation explains that at least one package is required.
- Cart ready and card capability enabled: card method visible even when saved-card list is empty.
- Capabilities loading: payment action disabled without losing the cart.
- Saved cards loading: show a local loading state inside the card area.
- No saved cards: default to new-card mode or show an empty saved-card state with a clear add-card action.
- Saved cards exist and saved-card purchase is supported: allow selecting one saved card, including favorite/last-four/expiration display when available.
- Saved cards exist but saved-card purchase is unsupported: do not offer saved-card charge for credit purchase; keep new-card mode available when supported.
- New-card form: render the fields required by the middleware contract.
- Submit in progress: prevent double submit while preserving retry-safe error handling through idempotency keys.
- Approved or authorized: show a success state and clear or lock the completed cart according to the existing screen behavior.
- Pending or in-process: show a non-final state with a safe support message.
- Rejected, failed, or adapter error: show a user-safe error and allow retry when the API says it is retryable.

New-card form fields:
- Cardholder name.
- Card number or hosted/tokenized field, depending on the middleware capability.
- Expiration month/year or `MM/YY`.
- CVC/security code.
- Buyer first name.
- Buyer surname.
- CPF/CNPJ.
- CEP/postal code.
- Street.
- Number.
- State/UF.
- City.
- District/neighborhood.
- Complement.

Validation requirements:
- Preserve legacy validation intent with modern UX: invalid cardholder name, missing card fields, invalid card number/token, invalid or expired date, missing CVC, missing document, required address fields, missing profile email/phone errors returned by API, minimum purchase, and empty cart.
- Use masks and helpers already present in the codebase when available.
- Send cents-based totals to middleware, not formatted BRL strings.
- Confirm that the payload item fields preserve `creditTypeId`, `packageId`, selected package label, quantity, unit price cents, total cents, and custom-package marker.

Two-step submit flow:
- Step 1: call `POST /credit-payments/orders` with cart items, totals, selected payment method, and an idempotency key.
- Step 2: call `POST /credit-payments/orders/:orderId/card-charge` with card mode, saved card selection or new-card data, total cents, one installment, and a charge idempotency key.
- Keep the order id from step 1 in component state for retries and support messaging.
- Do not call the charge endpoint if order creation fails.
- Do not create a second order when retrying a charge for the same checkout attempt.

Saved-card management:
- List saved cards through middleware and display last four digits, expiration, and favorite status when available.
- Allow deletion with confirmation only when the backend capability/route supports it, then refresh the list.
- Allow favorite selection only when supported by the middleware contract.
- If the backend returns `SAVED_CARD_UNSUPPORTED_FOR_CREDITS`, keep the card method visible but return the user to new-card mode.

Security and telemetry:
- Prefer provider tokenization or a hosted field strategy. If the phase 1 legacy adapter still requires raw card fields for the Getnet path, keep them ephemeral, submit only to middleware over the approved contract, and never log or persist them.
- Exclude PAN, CVC, tokens, authorization values, and customer payment identifiers from logs, analytics payloads, error reporting, React Query cache, and persisted state.
- API errors shown to the user must use normalized, user-safe messages from middleware.

Acceptance criteria:
- The payment method section follows the visual pattern of the existing credit purchase screen and neighboring pages.
- Credit card remains selectable for clients with no saved cards when new-card payment is supported.
- Saved-card selection is controlled by capabilities, not by card count alone.
- The new-card form validates the fields required by middleware and submits only through middleware.
- The checkout creates a legacy-backed order first and charges it second.
- Duplicate clicks do not create duplicate orders from the UI.
- Successful, pending, rejected, failed, and retryable error states are represented.
- Tests cover capability loading, no-card behavior, saved-card unsupported behavior, new-card validation, two-step submit, duplicate-click prevention, and normalized API errors.
