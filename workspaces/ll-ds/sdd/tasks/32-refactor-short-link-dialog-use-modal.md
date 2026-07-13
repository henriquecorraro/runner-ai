---
id: refactor-short-link-dialog-use-modal
title: Refactor ShortLinkDialog to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No trigger prop or internal useState for open
  - "useModal('short-link-dialog') used in component and call sites"
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

Refactor `ShortLinkDialog` to use `useModal('short-link-dialog')` hook instead of internal `useState` + trigger.

## Current Pattern

```typescript
type Props = { trigger, link? }
const [open, setOpen] = useState(false)
```

## Target Pattern

```typescript
type ShortLinkDialogData = { link?: ShortLink }
const { isOpen, close, data } = useModal<ShortLinkDialogData>('short-link-dialog')
// Parent calls useModal('short-link-dialog').open({ link })
```

## Steps

1. In `src/pages/LinkShortener/components/ShortLinkDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `useState(false)` + `trigger` with `useModal<ShortLinkDialogData>('short-link-dialog')`
   - Remove `trigger` prop
   - Read `link` from `data`
2. Update all parent call sites:
   - Use `useModal('short-link-dialog').open({ link })` to open
3. Keep behavior unchanged

## Files

- `src/pages/LinkShortener/components/ShortLinkDialog.tsx`
- Find all usages: `grep -r "ShortLinkDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
