---
id: purchase-history-api
title: Purchase history API endpoint for credit payments
scope: credit-payments
status: done
repositories:
  - platform-api
  - middleware
validation:
  - npm run typecheck
  - npm test
---

## Goal

Expose `GET /credit-orders/history` on platform-api and `GET /credit-payments/history` on middleware for paginated, filterable listing of a client's credit purchases.

## platform-api

### Route

`GET /credit-orders/history` — tenant-scoped (auth resolves `clientId` from session).

### Query Schema

| param | type | default | constraints |
|-------|------|---------|-------------|
| page | int | 1 | min 1 |
| pageSize | int | 20 | min 1, max 100 |
| startDate | string | null | ISO date YYYY-MM-DD |
| endDate | string | null | ISO date YYYY-MM-DD |
| status | string | null | enum: "pending", "approved", "declined" |

### SQL

```sql
-- Main query (paginated)
SELECT p.id, p.value, p.approved, p.payment_type, p.created_at, p.approved_at,
       pt.type as payment_type_name
FROM payments p
LEFT JOIN payment_types pt ON pt.id = p.payment_type
WHERE p.clients_id = :clientId
  [AND p.created_at >= ':startDate 00:00:00']
  [AND p.created_at <= ':endDate 23:59:59']
  [AND p.approved = :statusCode]
ORDER BY p.created_at DESC
LIMIT :pageSize OFFSET (:page - 1) * :pageSize

-- Items eager-load
SELECT pi.payments_id, pi.credits_types_id, pi.quantity, pi.value, pi.unity_value,
       pi.packages_id, pkg.package as package_name
FROM payment_items pi
LEFT JOIN packages pkg ON pkg.id = pi.packages_id
WHERE pi.payments_id IN (:fetchedOrderIds)

-- Totals (same WHERE, no LIMIT)
SELECT COUNT(*) as total, SUM(p.value) as totalValue
FROM payments p WHERE p.clients_id = :clientId [+ same filters]
```

### Status Mapping

DB `payments.approved` (CHAR) → API response:
- `'0'` → `"pending"`
- `'1'` → `"approved"`
- `'2'` → `"declined"`

Reverse (query filter → DB): `"pending"` → `'0'`, `"approved"` → `'1'`, `"declined"` → `'2'`

### Credit Type Labels (static map, do NOT query credits_types table)

```ts
const CREDIT_TYPE_LABELS: Record<number, string> = {
  1: "SMS", 2: "Voz", 3: "SMS Flash", 4: "WhatsApp Voice",
  5: "WhatsApp Oficial", 6: "WhatsApp Não-Oficial",
  7: "Instância WhatsApp", 8: "Email", 9: "RCS Basic", 10: "RCS Single"
}
```

### Value Conversion

`payments.value` and `payment_items.value` are DECIMAL(10,2) in BRL. Convert: `Math.round(dbValue * 100)` → cents.
`payment_items.unity_value` is DECIMAL(10,3). Same conversion.

### Response Shape

```ts
{
  orders: Array<{
    id: string
    valueCents: number
    status: "pending" | "approved" | "declined"
    paymentType: string | null
    createdAt: string // ISO
    approvedAt: string | null // ISO
    items: Array<{
      creditType: string
      creditTypeId: number
      packageName: string | null
      quantity: number
      unitValueCents: number
      totalCents: number
    }>
  }>
  totals: { valueCents: number; itemCount: number }
  pagination: { page: number; pageSize: number; total: number }
}
```

### File Locations

- Schema: `src/modules/credit-orders/schemas/credit-orders.schemas.ts`
- Use-case: `src/modules/credit-orders/use-cases/credit-orders.use-cases.ts`
- Controller: `src/modules/credit-orders/controllers/credit-orders.controller.ts`
- Route: `src/modules/credit-orders/routes/credit-orders.routes.ts`
- Add to `tests/contracts/route-contract.registry.ts` (either as contract entry or exclusion with reason)

## middleware

### Route Definition

Add to `src/domains/credit-payments/routes.ts`:
```ts
{
  method: "GET",
  path: "/credit-payments/history",
  auth: { required: true, strategy: "session" },
  target: "NEW_BACKEND_URL",
  inputSchema: creditPaymentHistoryInputSchema,
  outputSchema: creditPaymentHistoryOutputSchema
}
```

### Schemas

Create in `src/domains/credit-payments/contracts.ts`:
- `creditPaymentHistoryInputSchema`: headers (requestHeadersSchema), params (empty), query (page, pageSize, startDate, endDate, status), body (null)
- `creditPaymentHistoryOutputSchema`: orders array + totals + pagination matching platform-api response shape

## Constraints

- Ordered by `created_at DESC` always.
- Never expose orders from other clients.
- Package name fallback to `null` when `packages_id` is NULL.
- Run `npm run docs:openapi` after middleware changes.
