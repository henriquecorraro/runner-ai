---
id: credit-packages-catalog-frontend
title: Credit packages catalog screen with registration guard
scope: credit-purchase
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - platform-front:docs/features/credit-purchase.md
depends_on:
  - credit-packages-catalog-middleware
---

## Goal

Build the "Buy Credits" screen where authenticated clients can browse available credit packages grouped by type. Access to this screen is guarded by registration completeness — if the client's registration is incomplete, they are redirected to complete their profile instead.

## UX Flow

1. User navigates to the credits purchase route (e.g., `/credits/buy` or sidebar link).
2. Frontend calls `GET /clients/registration-status`.
   - If `complete: false` → show a modal/alert with title "Você está quase lá!" listing the missing fields, and a CTA button "Completar Cadastro" that navigates to the profile edit screen. Block access to the purchase page.
   - If `complete: true` → render the packages catalog.
3. The catalog screen shows credit type selector (SMS, Voz, SMS Flash — matching the legacy credit types available to the customer profile).
4. When a type is selected, call `GET /credit-packages?creditTypeId=:id`.
5. Display packages as selectable cards or list items showing: package name, quantity range, unitary value.
6. User selects a package and quantity (within `rangeStart`–`rangeEnd`) → item is added to a cart summary.
7. Cart displays total cost and items. At this stage, the "Finalizar" button is visible but **disabled** (actual checkout/payment will be built in a future task).

## Screens and Components

### Registration Guard
- Reusable hook or wrapper: `useRegistrationGuard()` that calls the registration-status endpoint and returns `{ complete, missingFields, isLoading }`.
- If incomplete: render a blocking overlay/modal. Do NOT render the purchase UI underneath.

### Credit Type Selector
- Horizontal toggle/tabs for credit types: "Mensagem de Texto" (id=1), "Ligação" (id=2), "SMS Flash" (id=3).
- Selecting a type fetches packages.

### Packages List
- Each package shows: name, quantity info, price per unit (formatted as BRL currency).
- If a customized package exists (id="custom"), show it distinctly (e.g., with a "Personalizado" badge).
- Clicking a package opens a quantity input if the package supports a range (rangeStart ≠ rangeEnd). If it's a fixed-quantity package (rangeStart = rangeEnd), auto-set the quantity.

### Cart Summary
- List of selected items: credit type, package name, quantity, subtotal.
- Remove item button.
- Total amount displayed.
- "Finalizar compra" button (disabled for now — placeholder for payment flow).

## Implementation Constraints

- Add a new route in the SPA router for the purchase screen.
- Create service layer: `src/service/credit-packages/` with types and API calls.
- Create service layer: `src/service/registration/` for the registration-status call.
- Use the project's existing UI patterns (styled-components, design-system components if available).
- Format currency with BRL locale (`pt-BR`, `R$`).
- The registration guard should be reusable — it will be needed again in the future for plan subscription.
- Add a sidebar link "Comprar Créditos" that triggers the guard before navigating.

## Docs Alignment

Create `docs/features/credit-purchase.md` documenting:
- Route path
- Registration guard behavior
- Credit type IDs and labels
- Cart state management approach
