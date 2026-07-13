---
id: refactor-lead-list-upload-dialog-use-modal
title: Refactor LeadListUploadDialog to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No internal useState for open/close
  - "useModal('lead-list-upload') used in component and call sites"
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

Refactor `LeadListUploadDialog` to use `useModal('lead-list-upload')` hook instead of internal `useState`.

## Current Pattern

```typescript
const [open, setOpen] = useState(false)
// Uses trigger prop to render a button that opens the dialog
```

## Target Pattern

```typescript
const { isOpen, open, close } = useModal('lead-list-upload')
// No trigger prop — parent calls open() directly
```

## Steps

1. In `src/components/Dialogs/LeadListUploadDialog/LeadListUploadDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `useState(false)` with `useModal('lead-list-upload')`
   - Remove `trigger` prop
   - Use `isOpen` for Dialog.Root `open` prop
2. Update all parent call sites:
   - Use `useModal('lead-list-upload').open()` where trigger was rendered
   - Render dialog component without trigger prop
3. Keep all business logic unchanged

## Files

- `src/components/Dialogs/LeadListUploadDialog/LeadListUploadDialog.tsx`
- Find all usages: `grep -r "LeadListUploadDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
