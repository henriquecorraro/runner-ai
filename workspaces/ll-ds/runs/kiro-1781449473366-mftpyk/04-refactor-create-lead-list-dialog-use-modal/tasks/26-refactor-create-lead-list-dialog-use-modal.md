---
id: refactor-create-lead-list-dialog-use-modal
title: Refactor CreateLeadListDialog to use useModal hook
scope: ds-usemodal-refactor
status: open
repositories:
  - platform-front
validation:
  - npm run build passes
  - No internal useState for open/close in this dialog
  - "useModal('create-lead-list') used in component and call sites"
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

Refactor `CreateLeadListDialog` to use `useModal('create-lead-list')` hook instead of internal `useState`.

## Current Pattern

```typescript
const [open, setOpen] = useState(false)
// Uses trigger prop to render a button that opens the dialog
```

## Target Pattern

```typescript
const { isOpen, open, close } = useModal('create-lead-list')
// No trigger prop — parent calls open() directly
// Dialog.Root open={isOpen}
```

## Steps

1. In `src/components/Dialogs/CreateLeadListDialog/CreateLeadListDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `useState(false)` with `useModal('create-lead-list')`
   - Remove `trigger` prop
   - Use `isOpen` for Dialog.Root `open` prop, `close` for `onOpenChange(false)`
2. Update all parent call sites:
   - Use `useModal('create-lead-list').open()` where trigger was rendered
   - Render the dialog component without trigger prop
3. Keep all business logic unchanged

## Files

- `src/components/Dialogs/CreateLeadListDialog/CreateLeadListDialog.tsx`
- Find all usages: `grep -r "CreateLeadListDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
