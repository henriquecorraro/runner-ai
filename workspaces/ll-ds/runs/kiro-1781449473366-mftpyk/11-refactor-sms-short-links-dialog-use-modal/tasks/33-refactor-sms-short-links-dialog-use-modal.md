---
id: refactor-sms-short-links-dialog-use-modal
title: Refactor SmsShortLinksDialog to use useModal hook
scope: ds-usemodal-refactor
status: open
repositories:
  - platform-front
validation:
  - npm run build passes
  - No trigger prop or internal useState for open
  - "useModal('sms-short-links') used in component and call sites"
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

Refactor `SmsShortLinksDialog` to use `useModal('sms-short-links')` hook instead of internal `useState` + trigger.

## Current Pattern

```typescript
type Props = { trigger }
const [open, setOpen] = useState(false)
```

## Target Pattern

```typescript
const { isOpen, close } = useModal('sms-short-links')
// Parent calls useModal('sms-short-links').open()
```

## Steps

1. In `src/pages/Sms/components/SmsShortLinksDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `useState(false)` + `trigger` with `useModal('sms-short-links')`
   - Remove `trigger` prop
2. Update all parent call sites:
   - Use `useModal('sms-short-links').open()` to open
3. Keep behavior unchanged

## Files

- `src/pages/Sms/components/SmsShortLinksDialog.tsx`
- Find all usages: `grep -r "SmsShortLinksDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
