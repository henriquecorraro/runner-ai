---
id: credit-charge-retry-button
title: Retry button for failed credit card charges
scope: credit-payments
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
---

## Goal

Add a retry mechanism to the credit purchase charge result screen. When a card charge fails, display a button allowing the client to retry with the same card or choose a different one.

## Trigger

HTTP 402 response from `POST /credit-payments/orders/:orderId/card-charge`.

## UI Behavior

### On Charge Failure

Display in the charge result area:
- Error message from API response (`response.message`)
- "Tentar novamente" primary button
- "Usar outro cartão" secondary/link button

### "Tentar novamente" (same card)

- Re-submits `POST /credit-payments/orders/:orderId/card-charge` with same card data
- Generates new `idempotencyKey` (e.g., `crypto.randomUUID()`)
- Shows loading state during request

### "Usar outro cartão" 

- Returns user to card selection/input step
- Preserves the same `orderId` (does NOT create a new order)
- User selects saved card or enters new card data
- Submits charge with new card + new `idempotencyKey`

### After 5 Failed Attempts

- Backend returns 422 `MAX_RETRY_EXCEEDED`
- Disable retry buttons
- Show message: "Número máximo de tentativas excedido. Crie uma nova compra."
- Show button to restart purchase flow (new order)

### On Success

- Normal success flow (show confirmation, redirect to credits page)

## State Management

```ts
// Track attempts per orderId in component state
const [attempts, setAttempts] = useState(0)
const MAX_ATTEMPTS = 5

// After each failed charge:
setAttempts(prev => prev + 1)

// Disable retry when:
attempts >= MAX_ATTEMPTS || response.code === "MAX_RETRY_EXCEEDED"
```

## API Calls

| action | method | path |
|--------|--------|------|
| charge | POST | /credit-payments/orders/:orderId/card-charge |

Body requires new `idempotencyKey` for each attempt. Same `orderId` reused.

## Files to Modify

Look at the existing `CreditPurchase` page (`src/pages/CreditPurchase/CreditPurchase.tsx`) for the charge result component. Add retry logic there or in a child component like `ChargeResult` / `PaymentResult`.

## Constraints

- Never create a new order for retries — reuse the same `orderId`.
- Each retry MUST have a unique `idempotencyKey`.
- Preserve card form data between retries when using "Tentar novamente".
- Clear card form data when using "Usar outro cartão".
- Accessible: retry button must have clear aria-label, loading state announced to screen readers.
