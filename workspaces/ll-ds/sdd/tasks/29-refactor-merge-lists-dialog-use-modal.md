---
id: refactor-merge-lists-dialog-use-modal
title: Refactor MergeListsDialog to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No open/onClose props on this component
  - "useModal('merge-lists') used in component and call sites"
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

Refactor `MergeListsDialog` to use `useModal('merge-lists')` hook instead of receiving `open`/`onClose` props.

## Current Pattern

```typescript
type Props = { open: boolean, onClose: () => void, onMergeComplete: () => void }
```

## Target Pattern

```typescript
type MergeListsData = { onMergeComplete: () => void }
const { isOpen, close, data } = useModal<MergeListsData>('merge-lists')
// Parent calls useModal('merge-lists').open({ onMergeComplete })
```

## Steps

1. In `src/components/Dialogs/MergeListsDialog/MergeListsDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `open`/`onClose` props with `useModal<MergeListsData>('merge-lists')`
   - Read `onMergeComplete` from `data`
2. Update all parent call sites:
   - Remove local state
   - Call `useModal('merge-lists').open({ onMergeComplete })` to open
3. Keep behavior unchanged

## Files

- `src/components/Dialogs/MergeListsDialog/MergeListsDialog.tsx`
- Find all usages: `grep -r "MergeListsDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
