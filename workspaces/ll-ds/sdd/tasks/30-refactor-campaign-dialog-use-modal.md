---
id: refactor-campaign-dialog-use-modal
title: Refactor CampaignDialog to use useModal hook
scope: ds-usemodal-refactor
status: done
repositories:
  - platform-front
validation:
  - npm run build passes
  - No trigger/open/onOpenChange props
  - "useModal('campaign-dialog') used in component and call sites"
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

Refactor `CampaignDialog` to use `useModal('campaign-dialog')` hook instead of controlled/uncontrolled pattern.

## Current Pattern

```typescript
type Props = { trigger?, campaign?, open?: boolean, onOpenChange?, onSaved? }
```

## Target Pattern

```typescript
type CampaignDialogData = { campaign?: Campaign, onSaved?: () => void }
const { isOpen, close, data } = useModal<CampaignDialogData>('campaign-dialog')
// Parent calls useModal('campaign-dialog').open({ campaign, onSaved })
```

## Steps

1. In `src/pages/Campaigns/components/CampaignDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace controlled/uncontrolled pattern with `useModal<CampaignDialogData>('campaign-dialog')`
   - Remove `trigger`, `open`, `onOpenChange` props
   - Read `campaign`, `onSaved` from `data`
2. Update all parent call sites:
   - Use `useModal('campaign-dialog').open({ campaign, onSaved })` to open
3. Keep behavior unchanged

## Files

- `src/pages/Campaigns/components/CampaignDialog.tsx`
- Find all usages: `grep -r "CampaignDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
