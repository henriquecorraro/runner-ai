---
id: platform-front-alert-feedback-credit-purchase-page
title: Add alert feedback to Credit Purchase page
scope: platform-front-alert-feedback
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - platform-front/docs/features/feedback-alerts.md
depends_on:
  - platform-front-alert-feedback-foundation
---

## Files

```text
src/pages/CreditPurchase/CreditPurchase.tsx
src/components/CardPaymentModal/CardPaymentModal.tsx
src/components/CardPaymentModal/CardPaymentModal.styles.ts
```

## Requirements

- Use `useAppAlert()` for credit purchase operations.
- Show success alert for payment-link creation, card order creation, approved card payment, saved card creation, favorite-card update, and card delete operations when present.
- Show warning/info alert for pending payment states when user action requires feedback.
- Show danger alert for order creation failure, card charge failure, payment-link popup blocked, saved-card mutation failure, capabilities failure when action is blocked, and network errors.
- Preserve existing rich checkout feedback UI.
- Do not replace `CardPaymentModal` success/error modal states with global alerts.
- Do not replace `CheckoutStatusBox` payment-link states when they represent persistent checkout state visible on the purchase page.
- Use global alerts only for transient operation feedback around the existing rich UI.
- Do not duplicate modal state panel and global alert for the same event unless one is persistent checkout state and one is transient operation feedback.
- Do not use browser alerts.

## Existing Feedback UI

```text
src/components/CardPaymentModal/CardPaymentModal.tsx
src/components/CardPaymentModal/CardPaymentModal.styles.ts
src/pages/CreditPurchase/CreditPurchase.tsx
src/pages/CreditPurchase/CreditPurchase.styles.ts
```

```ts
// CardPaymentModal local checkout state
type CardPaymentStatus = {
  type: 'form' | 'loading' | 'success' | 'error'
  message: string
}

// CreditPurchase payment-link state uses CheckoutStatusBox.
// Keep success/warning/error boxes when they are the current checkout state.
```

## Alert Placement Rules

| Event | Global alert | Existing UI |
|---|---:|---:|
| Payment link created and page shows checkout status | optional info/success | keep `CheckoutStatusBox` |
| Payment link popup blocked | danger or warning | keep `CheckoutStatusBox` with open-link action |
| Card payment approved in modal | no duplicate required | keep `CardPaymentModal` success screen |
| Card payment declined in modal | no duplicate required | keep `CardPaymentModal` error state |
| Saved card created/updated/deleted outside payment-state screen | success/danger | keep local card list state |
| Order creation failure before modal can show state | danger | no persistent checkout state |
