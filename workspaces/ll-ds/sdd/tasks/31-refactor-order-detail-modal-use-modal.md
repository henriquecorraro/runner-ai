---
id: refactor-order-detail-modal-use-modal
title: Refactor OrderDetailModal to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No orderId/onClose props
  - "useModal('order-detail') used in component and call sites"
---

## Reference

- Hook location: `src/hooks/useModal.tsx`
- Provider already mounted in `src/main.tsx` (wraps entire app)
- Working example: `src/components/AutoRechargeSection/AutoRechargeSection.tsx` uses `useModal('auto-recharge')`
- API: `const { isOpen, data, open, close, toggle } = useModal<DataType>('modal-id')`
- `open(payload?)` opens modal, optionally passing typed data
- `close()` closes modal, preserves data
- `data` is the typed payload passed via `open()`
- Dialog component reads state via hook internally; parent opens via same hook ID
- Do NOT pass `open`/`onClose`/`trigger` props — use hook exclusively
- `DeleteConfirmationDialog` used in `AutoRechargeSection` still uses old prop pattern — that is its own task, do NOT touch it in other tasks


## Objective

Refactor `OrderDetailModal` to use `useModal('order-detail')` hook instead of receiving `orderId`/`onClose` props.

## Current Pattern

```typescript
type Props = { orderId: string, onClose: () => void }
```

## Target Pattern

```typescript
type OrderDetailData = { orderId: string }
const { isOpen, close, data } = useModal<OrderDetailData>('order-detail')
// Parent calls useModal('order-detail').open({ orderId })
```

## Steps

1. In `src/pages/CreditHistory/components/OrderDetailModal.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `orderId`/`onClose` props with `useModal<OrderDetailData>('order-detail')`
   - Read `orderId` from `data`
   - Use `close` instead of `onClose`
2. Update all parent call sites:
   - Use `useModal('order-detail').open({ orderId })` to open
   - Remove local state for selected order
3. Keep behavior unchanged

## Files

- `src/pages/CreditHistory/components/OrderDetailModal.tsx`
- Find all usages: `grep -r "OrderDetailModal" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
