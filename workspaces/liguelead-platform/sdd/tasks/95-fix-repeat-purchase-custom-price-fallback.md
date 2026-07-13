---
id: fix-repeat-purchase-custom-price-fallback
title: Fix CUSTOM_PRICE_NOT_FOUND on repeat purchase by falling back to package range pricing
scope: credit-orders
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

## Problem

`POST /credit-orders` with `isCustom: true` throws `CUSTOM_PRICE_NOT_FOUND` when the client has no `customized_packages` entry. This breaks the "repeat last purchase" flow because the frontend always sends `isCustom: true` for repeated items.

## Root Cause

`validateOrderPricing()` in `src/modules/credit-orders/services/validate-order-pricing.service.ts` calls `resolveCustomPrice()` when `item.isCustom === true`. If no row exists in `customized_packages`, it throws immediately with no fallback.

## Required Change

Modify `validateOrderPricing()` to use the same fallback strategy already implemented in `validateAutoRechargePricing()`:

1. When `item.isCustom === true`: first attempt `findCustomPrice(clientId, creditTypeId)`
2. If null → fallback to `findPackageByQuantity(creditTypeId, quantity)`
3. If both null → throw `PACKAGE_NOT_FOUND`

### Implementation

File: `src/modules/credit-orders/services/validate-order-pricing.service.ts`

Replace the pricing resolution block inside `validateOrderPricing()`:

```typescript
// BEFORE:
const unitValueBrl = item.isCustom
  ? await resolveCustomPrice(clientId, item.creditTypeId)
  : await resolvePackagePrice(item.packageId);

// AFTER:
let unitValueBrl: number;
let resolvedPackagesId: number | null;

if (item.isCustom) {
  const customPrice = await findCustomPrice(clientId, item.creditTypeId);
  if (customPrice) {
    unitValueBrl = customPrice.unitValueBrl;
    resolvedPackagesId = customPrice.packagesId;
  } else {
    const packagePrice = await findPackageByQuantity(item.creditTypeId, item.quantity);
    if (!packagePrice) {
      throw new BadRequestError(
        `Pacote não encontrado para o tipo ${item.creditTypeId} e quantidade ${item.quantity}`,
        "PACKAGE_NOT_FOUND",
      );
    }
    unitValueBrl = packagePrice.unitValueBrl;
    resolvedPackagesId = packagePrice.packagesId;
  }
} else {
  unitValueBrl = await resolvePackagePrice(item.packageId);
  resolvedPackagesId = typeof item.packageId === "number" ? item.packageId : null;
}
```

Update the `validated.push()` call to use `resolvedPackagesId` instead of the current inline expression:

```typescript
validated.push({
  creditTypeId: item.creditTypeId,
  quantity: item.quantity,
  unitValueBrl,
  totalValueBrl,
  packagesId: resolvedPackagesId,
});
```

## Constraints

- Do NOT change `validateAutoRechargePricing` — it already works correctly.
- Do NOT change `resolveCustomPrice` function signature — it is only used inline, but keep it as private helper if still needed elsewhere. If dead after refactor, remove it.
- Do NOT modify the frontend.
- Do NOT change the `OrderItem` input type shape.
- `findCustomPrice` and `findPackageByQuantity` already exist and are correct — reuse them.

## Test Cases

Add/update tests covering:

| Scenario | isCustom | customized_packages exists | packages range match | Expected |
|----------|----------|---------------------------|---------------------|----------|
| Custom tariff exists | true | yes | irrelevant | Use custom price, packagesId=1000 |
| No custom, package range exists | true | no | yes | Use package range price and id |
| No custom, no package range | true | no | no | Throw PACKAGE_NOT_FOUND |
| Standard package | false | irrelevant | irrelevant | Use resolvePackagePrice as-is |
