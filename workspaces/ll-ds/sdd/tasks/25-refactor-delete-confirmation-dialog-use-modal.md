---
id: refactor-delete-confirmation-dialog-use-modal
title: Refactor DeleteConfirmationDialog to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No open/onOpenChange props on this component
  - "useModal('delete-confirmation') used in component and call sites"
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

Refactor `DeleteConfirmationDialog` to use `useModal('delete-confirmation')` hook instead of receiving `open`/`onOpenChange` props.

## Current Pattern

```typescript
type Props = { open: boolean, onOpenChange: (open: boolean) => void, title, description, onConfirm }
```

## Target Pattern

```typescript
type DeleteConfirmationData = { title: string, description: string, onConfirm: () => void }
const { isOpen, close, data } = useModal<DeleteConfirmationData>('delete-confirmation')
// Parent calls useModal('delete-confirmation').open({ title, description, onConfirm })
```

## Steps

1. In `src/components/Dialogs/DeleteConfirmationDialog/DeleteConfirmationDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Define `DeleteConfirmationData` type with `title`, `description`, `onConfirm`
   - Replace props with `useModal<DeleteConfirmationData>('delete-confirmation')`
   - Read `title`, `description`, `onConfirm` from `data`
2. Update all parent call sites:
   - Remove local state
   - Call `useModal('delete-confirmation').open({ title, description, onConfirm })`
   - Remove the component JSX props for open/onOpenChange/title/description/onConfirm
3. Keep behavior unchanged

## Files

- `src/components/Dialogs/DeleteConfirmationDialog/DeleteConfirmationDialog.tsx`
- Find all usages: `grep -r "DeleteConfirmationDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
