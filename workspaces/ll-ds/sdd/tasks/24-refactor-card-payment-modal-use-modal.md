---
id: refactor-card-payment-modal-use-modal
title: Refactor CardPaymentModal to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No open/close state managed by parent for this modal
  - "useModal('card-payment') used in component and call sites"
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

Refactor `CardPaymentModal` to use `useModal('card-payment')` hook instead of receiving `onClose` prop.

## Current Pattern

```typescript
type CardPaymentModalProps = { ..., onClose: () => void }
// Parent manages open state, passes onClose
```

## Target Pattern

```typescript
// CardPaymentModal internally uses:
const { isOpen, close } = useModal('card-payment')
// Renders only when isOpen is true
// Parent opens via: useModal('card-payment').open(data)
```

## Steps

1. In `src/components/Dialogs/CardPaymentModal/CardPaymentModal.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Use `useModal<CardPaymentModalData>('card-payment')` to get `isOpen`, `close`, `data`
   - Remove `onClose` prop — use `close` from hook
   - Wrap render in `if (!isOpen) return null` or use `open` prop from Dialog.Root tied to `isOpen`
2. Update all parent call sites:
   - Remove local `useState` controlling this modal
   - Use `useModal('card-payment')` to call `.open({ ...data })` where the modal was previously shown
   - Remove `onClose` callbacks that set state to false
3. Keep all business logic and behavior unchanged

## Files

- `src/components/Dialogs/CardPaymentModal/CardPaymentModal.tsx`
- Find all usages: `grep -r "CardPaymentModal" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
