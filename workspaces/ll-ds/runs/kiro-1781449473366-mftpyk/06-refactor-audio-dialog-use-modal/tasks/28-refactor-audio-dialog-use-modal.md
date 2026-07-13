---
id: refactor-audio-dialog-use-modal
title: Refactor AudioDialog to use useModal hook
scope: ds-usemodal-refactor
status: open
repositories:
  - platform-front
validation:
  - npm run build passes
  - No trigger/open/onOpenChange props
  - "useModal('audio-dialog') used in component and call sites"
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

Refactor `AudioDialog` to use `useModal('audio-dialog')` hook instead of internal state + controlled props.

## Current Pattern

```typescript
type Props = { trigger?, audio?, open?: boolean, onOpenChange?, onSaved? }
// Supports both uncontrolled (trigger) and controlled (open/onOpenChange) modes
const open = controlledOpen ?? internalOpen
```

## Target Pattern

```typescript
type AudioDialogData = { audio?: Audio, onSaved?: () => void }
const { isOpen, close, data } = useModal<AudioDialogData>('audio-dialog')
// Parent calls useModal('audio-dialog').open({ audio, onSaved })
```

## Steps

1. In `src/pages/Audios/components/AudioDialog.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace dual controlled/uncontrolled pattern with `useModal<AudioDialogData>('audio-dialog')`
   - Remove `trigger`, `open`, `onOpenChange` props
   - Read `audio`, `onSaved` from `data`
2. Update all parent call sites:
   - Use `useModal('audio-dialog').open({ audio, onSaved })` to open
   - Remove trigger JSX and local state
3. Keep behavior unchanged

## Files

- `src/pages/Audios/components/AudioDialog.tsx`
- Find all usages: `grep -r "AudioDialog" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
