---
id: refactor-sms-dialog-use-modal
title: Refactor SmsDialog to use useModal hook
scope: ds-usemodal-refactor
status: open
repositories:
  - platform-front
validation:
  - npm run build passes
  - No trigger/open/onOpenChange props
  - "useModal('sms-dialog') used in component and call sites"
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

Refactor `SmsDialog` to use `useModal('sms-dialog')` hook instead of dual controlled/uncontrolled pattern.

## Current Pattern

```typescript
type Props = { trigger?, sms?, open?: boolean, onOpenChange?, onSaved? }
const open = controlledOpen ?? internalOpen
```

## Target Pattern

```typescript
type SmsDialogData = { sms?: Sms, onSaved?: () => void }
const { isOpen, close, data } = useModal<SmsDialogData>('sms-dialog')
// Parent calls useModal('sms-dialog').open({ sms, onSaved })
```

## Steps

1. In `src/pages/Sms/components/SmsDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace controlled/uncontrolled pattern with `useModal<SmsDialogData>('sms-dialog')`
   - Remove `trigger`, `open`, `onOpenChange` props
   - Read `sms`, `onSaved` from `data`
2. Update all parent call sites:
   - Use `useModal('sms-dialog').open({ sms, onSaved })` to open
3. Keep behavior unchanged

## Files

- `src/pages/Sms/components/SmsDialog.tsx`
- Find all usages: `grep -r "SmsDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
