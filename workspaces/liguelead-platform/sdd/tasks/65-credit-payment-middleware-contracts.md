---
id: 65-credit-payment-middleware-contracts
title: Expose legacy credit payment and card routes through middleware adapter
scope: credit-card-payments
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware/docs/contracts-and-routes/README.md
  - middleware/docs/domains/README.md
  - middleware/docs/public-api/openapi.json
  - platform-front/docs/features/legacy-credit-card-payment-flow.md
---

Phase 1 task: expose stable middleware contracts for the platform frontend while reusing the legacy `areadocliente` payment implementation underneath.

Target architecture:

`platform-front -> middleware legacy-payment adapter -> areadocliente -> payment gateways`

The frontend must never call legacy endpoints directly and must never know legacy route names, `FormData` quirks, hidden-field conventions, or gateway-specific payload details.

Agent guardrails:
- Implement only the phase 1 middleware-to-legacy adapter.
- Do not implement the native platform-api card vault or native gateway orchestration from tasks `63-credit-card-vault-and-management-api` and `64-credit-purchase-card-payment-api`.
- Do not call payment gateways directly from middleware unless the legacy endpoint already expects the adapter to pass through a gateway token or card payload.
- Keep all SDD and OpenAPI content in English.

Middleware architecture requirements:
- The existing middleware route catalog mostly proxies one upstream route. This task needs a supported adapter/custom-handler path because the credit purchase flow transforms payloads and calls more than one legacy endpoint.
- Add the smallest reusable middleware mechanism needed for a domain route to execute adapter logic while still using the existing auth, validation, tracing, error handling, route registry, and OpenAPI generation patterns.
- Keep frontend-facing route names consistent with existing middleware style. Do not leak legacy names such as `creditos/solicitar`, `registrar-pagamento`, or `cartao-cliente` to the frontend.
- Prefer cents as the frontend/middleware amount unit. The adapter may convert to formatted BRL strings or legacy decimal values only at the boundary.

Suggested public middleware routes:
- `GET /credit-payments/capabilities`
- `GET /credit-payments/cards`
- `POST /credit-payments/cards`
- `PUT /credit-payments/cards/:cardId/favorite`
- `DELETE /credit-payments/cards/:cardId`
- `POST /credit-payments/orders`
- `POST /credit-payments/orders/:orderId/card-charge`

Capability contract:
- Return explicit payment method support so the frontend does not infer behavior from saved-card count.
- Include at least:

```json
{
  "methods": {
    "card": {
      "enabled": true,
      "supportsNewCard": true,
      "supportsSavedCard": false,
      "unsupportedReason": "LEGACY_SAVED_CARD_CREDIT_PAYMENT_UNSUPPORTED"
    },
    "pix": { "enabled": false },
    "paymentLink": { "enabled": false },
    "bankTransfer": { "enabled": false }
  },
  "minimumPurchaseCents": null
}
```

- Set `supportsSavedCard` from verified backend behavior, not from the presence of cards. Legacy UI lists saved cards, but the inspected legacy credit-card payment service path appears to reject saved-card credit purchases unless the order description is `subscriptions`. Verify this before enabling saved-card purchases for credits.

Saved-card contracts:
- Wrap legacy `GET api/creditos/cartao-cliente`, `PUT api/creditos/desativar-cartao`, `POST api/ClientCreditCard/saveNewCard`, and `PUT api/ClientCreditCard/favoriteCreditCard` when the frontend needs saved-card management.
- Normalize legacy card records from fields such as `id`, `card_id`, `last_four_digits`, and `expiration_date`.
- Return a stable response shape:

```json
{
  "cards": [
    {
      "id": "123",
      "gatewayCardId": "gateway-card-id",
      "lastFourDigits": "4242",
      "expirationDate": "12/29",
      "isFavorite": false
    }
  ]
}
```

- `DELETE /credit-payments/cards/:cardId` should map to legacy deactivate using `{ "cardId": "..." }`, not hard deletion.
- Never expose full PAN, CVC, gateway credentials, or raw gateway response payloads.

Create-order contract:
- Accept authenticated requests with an idempotency key and a cents-based cart payload:

```json
{
  "idempotencyKey": "uuid-or-stable-checkout-key",
  "paymentMethod": "credit_card",
  "items": [
    {
      "productId": "voice",
      "creditTypeId": 1,
      "packageId": 10,
      "packageName": "1000 minutes",
      "quantity": 1000,
      "unitPriceCents": 1200,
      "totalCents": 120000,
      "isCustom": false
    }
  ],
  "totals": {
    "subtotalCents": 120000,
    "payableCents": 120000
  },
  "coupon": null
}
```

- Do not trust arbitrary `clientId` from the browser. Resolve the client/user from middleware auth and only allow explicit internal overrides for service-to-service callers.
- Translate to legacy `POST creditos/solicitar` using `FormData`, because the legacy controller expects the old checkout shape.
- Build the legacy `credits` JSON rows for standard credit packages as:

```json
[
  "credit type label",
  "package label",
  "quantity",
  "unit value formatted for legacy",
  "",
  "creditTypeId",
  "packageId",
  "total value decimal",
  "unit value formatted for legacy"
]
```

- Preserve the legacy controller index meanings: item `[6]` package id, `[2]` quantity, `[5]` credit type id, `[8]` unit value, `[0]` product type label, and `[7]` total value.
- Verify and pin custom-package sentinel behavior before implementation. The inspected legacy code references both `1000` and `10000` in different places; add tests that lock the chosen mapping.
- Populate legacy fields with safe defaults when the new UI does not support them yet: `is_swap=0`, balance usage flags and values as false/zero, empty seller/commission/reason/coupon unless provided, `payment_type_external=credit-card` for card flow, and `paymentGatewayId` when required by legacy gateway selection.
- Return the legacy payment id from `creditos/solicitar` as a normalized `orderId` or `legacyPaymentId` for the charge step.

Card-charge contract:
- Accept the created order id, idempotency key, selected mode, total cents, and one installment:

```json
{
  "idempotencyKey": "uuid-or-stable-charge-key",
  "mode": "new-card",
  "totalCents": 120000,
  "installments": 1,
  "newCard": {
    "cardHolderName": "Customer Name",
    "cardNumber": "4111111111111111",
    "expiration": "12/29",
    "securityCode": "123",
    "iuguToken": null,
    "purchaserName": "Customer",
    "purchaserSurname": "Name",
    "purchaseCpf": "00000000000",
    "address": {
      "postalCode": "01001000",
      "street": "Rua Exemplo",
      "number": "100",
      "state": "SP",
      "city": "Sao Paulo",
      "district": "Centro",
      "complement": null
    }
  }
}
```

- Map new-card requests to legacy `POST api/creditos/registrar-pagamento` using the legacy JSON fields:
  `paymentId`, `clientId`, `card`, `cardHolderName`, `expiration`, `securityCode`, `installments`, `totalAmount`, `cardHolderAddressPostalCode`, `cardHolderAddressStreet`, `cardHolderAddressNumber`, `cardHolderAddressState`, `cardHolderAddressCity`, `cardHolderAddressDistrict`, `cardHolderAddressComplement`, `purchaserName`, `purchaseSurname`, `purchaseCpf`, `cardGatewayId`, and `iuguToken`.
- Convert `totalCents` to the decimal amount expected by legacy `totalAmount`.
- If a provider-tokenized flow is available, prefer passing the token required by legacy. If raw fields are still required for phase 1, keep them ephemeral, redact them in all logs, and never persist them.
- Only enable saved-card charge mode if the verified legacy path supports saved-card credit purchases. If it does not, return `supportsSavedCard=false` in capabilities and reject saved-card charge attempts with a stable error code.

Legacy auth/session bridge:
- Current middleware auth commonly resolves the user and injects `user-id` to upstream APIs. Legacy CodeIgniter endpoints expect a logged-in legacy session/cookie context.
- Implement and document a safe bridge before calling credit payment endpoints. Acceptable approaches include forwarding an approved legacy session cookie when present, or adding a backend-to-legacy service/session bridge agreed with the backend team.
- Tests must prove legacy adapter calls are made with the required auth/session material and that frontend-provided client ids cannot impersonate another client.

Error mapping:
- Normalize legacy and gateway failures into stable frontend codes and user-safe messages.
- Cover at least: `ERROR_CLIENT`, `ERROR_CLIENT_DATA`, `ERROR_PAYMENT`, `ERROR_CLIENT_PURCHASE_VALUE`, `GATEWAY_DECLINED`, `GATEWAY_TIMEOUT`, `LEGACY_VALIDATION_ERROR`, `SAVED_CARD_UNSUPPORTED_FOR_CREDITS`, `DUPLICATE_PAYMENT_ATTEMPT`, and `LEGACY_SESSION_REQUIRED`.
- Preserve enough internal metadata for support without exposing gateway payloads, credentials, PAN, CVC, tokens, or authorization headers.

Acceptance criteria:
- Middleware exposes the documented routes with request/response Zod schemas and regenerated OpenAPI docs.
- The create-order adapter builds a legacy-compatible `creditos/solicitar` request from the new cart model.
- The card-charge adapter builds a legacy-compatible `api/creditos/registrar-pagamento` request and returns normalized statuses.
- Capabilities explicitly describe new-card and saved-card support.
- Saved-card listing/deactivation/favorite/save are normalized behind middleware routes.
- Duplicate browser retries do not create duplicate legacy payments or duplicate gateway charges.
- Sensitive payment data is redacted from all middleware logs and test snapshots.
- Contract tests cover validation, auth/session bridging, legacy payload translation, error mapping, idempotency, redaction, and OpenAPI generation.
