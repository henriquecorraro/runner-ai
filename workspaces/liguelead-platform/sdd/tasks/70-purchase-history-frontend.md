---
id: purchase-history-frontend
title: Purchase history page in the frontend SPA
scope: credit-payments
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
dependsOn:
  - purchase-history-api
  - purchase-history-order-detail
---

## Goal

Create `/credits/history` page showing paginated credit purchase history with filters and order detail modal.

## Existing Structure

- Route `/credits` → `pages/Credits/Credits.tsx` (balance overview)
- Route `/credits/buy` → `pages/CreditPurchase/CreditPurchase.tsx` (purchase flow)
- Router: `src/routes/AppRoutes.tsx` — lazy loaded inside `PlatformLayout` + `RequireAuth`

## New Files

- `src/pages/CreditHistory/CreditHistory.tsx` — page component
- `src/pages/CreditHistory/components/HistoryFilters.tsx` — filter bar
- `src/pages/CreditHistory/components/OrderDetailModal.tsx` — detail modal
- Add lazy import + route in `AppRoutes.tsx`

## Route Registration

In `AppRoutes.tsx`, add inside the authenticated PlatformLayout routes block:
```tsx
const CreditHistory = lazy(() => import('@/pages/CreditHistory/CreditHistory'))
// ...
<Route path="/credits/history" element={withPageFallback(<CreditHistory />)} />
```

## API Endpoints

| action | method | path | auth |
|--------|--------|------|------|
| list | GET | /credit-payments/history | public-id header |
| detail | GET | /credit-payments/orders/:orderId | public-id header |

Query params for list: `page`, `pageSize`, `startDate`, `endDate`, `status`.

## Page Layout

```
┌─────────────────────────────────────────────┐
│ Histórico de Compras                        │
├─────────────────────────────────────────────┤
│ [Data início] [Data fim] [Status ▼] [Filtrar] [Limpar] │
├─────────────────────────────────────────────┤
│ Total: R$ XX.XXX,XX  •  XX compras          │
├─────────────────────────────────────────────┤
│ ID │ Valor    │ Data       │ Tipo       │ Status    │ Ações │
│ 38 │ R$ 50,00 │ 09/06/2026 │ Nova Compra│ ●Aprovado │ [Ver] │
│ ...│          │            │            │           │       │
├─────────────────────────────────────────────┤
│ ◀ 1 2 3 ... ▶   Mostrando 20 por página    │
└─────────────────────────────────────────────┘
```

## Component Specs

### HistoryFilters

Props: `onFilter(filters)`, `onClear()`
State: startDate, endDate, status
- Status options: `[{value: "", label: "Todos"}, {value: "pending", label: "Pendente"}, {value: "approved", label: "Aprovado"}, {value: "declined", label: "Reprovado"}]`
- Sync with URL search params (`useSearchParams`)

### Data Table

Columns:
| key | label | format |
|-----|-------|--------|
| id | ID | raw string |
| valueCents | Valor | `(v / 100).toLocaleString("pt-BR", {style: "currency", currency: "BRL"})` |
| createdAt | Data | `new Date(v).toLocaleDateString("pt-BR") + " " + new Date(v).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})` |
| paymentType | Tipo | raw string or "—" if null |
| status | Status | badge component |
| actions | Ações | "Ver detalhes" button |

Status badges:
- `"pending"` → variant: warning, label: "Pendente"
- `"approved"` → variant: success, label: "Aprovado"
- `"declined"` → variant: error, label: "Reprovado"

### OrderDetailModal

Trigger: row action button click → fetches `GET /credit-payments/orders/:orderId`
Content: table of items with columns:
| key | label | format |
|-----|-------|--------|
| creditType | Tipo de Crédito | string |
| packageName | Pacote | string or "Avulso" |
| quantity | Quantidade | number formatted with locale |
| unitValueCents | Valor Unitário | BRL currency |
| totalCents | Valor Total | BRL currency |

Footer: bold total value.

### States

- Loading: skeleton rows (use existing Loading/Skeleton component pattern)
- Empty: "Nenhuma compra encontrada" + illustration if available
- Error: toast/alert with retry action

## Constraints

- Use existing design system components (buttons, inputs, badges, modals, tables) — check `@/components` and imports from design system packages.
- Pagination state in URL params for bookmarkability.
- Currency formatting always pt-BR with `R$`.
- Accessible: table with proper `thead`/`th`, modal with focus trap + escape close, badges with aria-label.
- No admin-only features: no seller column, no approve/reject actions, no chargebacks.
