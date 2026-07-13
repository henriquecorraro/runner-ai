---
id: purchase-history-order-detail
title: Purchase history order detail endpoint
scope: credit-payments
status: done
repositories:
  - platform-api
  - middleware
validation:
  - npm run typecheck
  - npm test
dependsOn:
  - purchase-history-api
---

## Goal

Expose `GET /credit-orders/:orderId` on platform-api and `GET /credit-payments/orders/:orderId` on middleware to return a single order with its items.

## platform-api

### Route

`GET /credit-orders/:orderId` — tenant-scoped.

### Param Schema

- `orderId`: string, regex `^\d+$`

### SQL

```sql
SELECT p.id, p.value, p.approved, p.payment_type, p.created_at, p.approved_at,
       pt.type as payment_type_name
FROM payments p
LEFT JOIN payment_types pt ON pt.id = p.payment_type
WHERE p.id = :orderId AND p.clients_id = :clientId

SELECT pi.credits_types_id, pi.quantity, pi.value, pi.unity_value, pi.packages_id,
       pkg.package as package_name
FROM payment_items pi
LEFT JOIN packages pkg ON pkg.id = pi.packages_id
WHERE pi.payments_id = :orderId
```

### Response (200)

Same single-order shape from task `purchase-history-api`:
```ts
{
  id: string
  valueCents: number
  status: "pending" | "approved" | "declined"
  paymentType: string | null
  createdAt: string
  approvedAt: string | null
  items: Array<{
    creditType: string
    creditTypeId: number
    packageName: string | null
    quantity: number
    unitValueCents: number
    totalCents: number
  }>
}
```

### Errors

- 404 `ORDER_NOT_FOUND`: order does not exist OR `clients_id != clientId`
- 400: orderId fails regex validation

### Implementation

- Extract shared helper `mapPaymentToOrderResponse(payment, items)` reusable by both this endpoint and the history list.
- Use same `CREDIT_TYPE_LABELS` map and value conversion (BRL decimal → cents) from task 68.
- Register route in `credit-orders.routes.ts`.
- Add to `tests/contracts/route-contract.registry.ts` or `routeExclusions`.

## middleware

### Route Definition

Add to `src/domains/credit-payments/routes.ts`:
```ts
{
  method: "GET",
  path: "/credit-payments/orders/:orderId",
  auth: { required: true, strategy: "session" },
  target: "NEW_BACKEND_URL",
  inputSchema: creditPaymentOrderDetailInputSchema,
  outputSchema: creditPaymentOrderDetailOutputSchema
}
```

### Schemas

- Input: headers (requestHeadersSchema), params (`{ orderId: z.string().min(1).max(128) }`), query (empty), body (null)
- Output: single order object (same shape as each element in history `orders` array)

## Constraints

- MUST verify `clients_id = :clientId` — never expose another client's order.
- Return 404 (not 403) for ownership mismatch to avoid leaking order existence.
- Run `npm run docs:openapi` after middleware changes.
