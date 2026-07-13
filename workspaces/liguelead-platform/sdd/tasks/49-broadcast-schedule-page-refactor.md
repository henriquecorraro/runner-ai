---
id: broadcast-schedule-page-refactor
title: Convert broadcast schedule wizard from modal to dedicated page
scope: broadcast-schedule-ux
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
---

## Goal

Convert the broadcast schedule wizard from a modal dialog into a dedicated full page, simplify the audience selection by removing the "remove lists" dropdown, and add a "Mesclar listas" button that opens the reusable `MergeListsDialog`. After creating a broadcast action, navigate directly to this new schedule page instead of opening a modal overlay.

## Current State

- `BroadcastScheduleWizard` renders a `ScheduleDialog` (styled `Dialog`/`Modal`) at route `/broadcasts/actions/:id/schedule`.
- The route uses `backgroundLocation` pattern to overlay the modal on top of the broadcasts page.
- The wizard has two audience dropdowns: "Listas de envio" (multi-select) and "Listas removidas" (multi-select).
- `BroadcastActionWizard` navigates to `/broadcasts/actions/${saved.id}/schedule` after saving, which triggers the modal overlay.

## Changes Required

### 1. Convert to a full page

- Replace the `ScheduleDialog` wrapper with a standard page layout (`PageContainer`, `PageHeader`, `PageWrapper` pattern matching other pages).
- Add a page header showing the broadcast info (title, type, description) as a summary section at the top.
- Keep all form fields (date, start time, limit time, campaign, lists, voice settings, blocklist checkbox).
- Action buttons at the bottom: "Cancelar" (navigates back to `/broadcasts`) and "Confirmar agendamento".

### 2. Remove "Listas removidas" dropdown

- Remove the `removedLeadLists` state and the "Listas removidas" `DropdownSelect`.
- Remove `removeLeadLists` from the `buildPayload()` audience object (send empty array).
- Keep the `removeBlocklist` checkbox as-is.

### 3. Add "Mesclar listas" button

- Next to the "Listas de envio" dropdown, add a "Mesclar listas" button that opens `MergeListsDialog`.
- On merge complete, invalidate lists query so the dropdown refreshes with the new merged list.

### 4. Fix navigation after broadcast creation

- In `BroadcastActionWizard`, the `navigate(`/broadcasts/actions/${saved.id}/schedule`)` call currently relies on `backgroundLocation` to open a modal. Change it to a direct navigation (no `state` with `backgroundLocation`).
- Remove the `backgroundLocation` route pattern for `/broadcasts/actions/:id/schedule` from `AppRoutes.tsx`.
- The route `/broadcasts/actions/:id/schedule` should render the new schedule page directly inside `PlatformLayout`, not as a modal overlay.

### 5. Clean up

- Remove `ScheduleDialog` styled component from `BroadcastScheduleWizard.styles.ts`.
- Remove the `backgroundLocation` conditional rendering block in `AppRoutes.tsx` that renders `BroadcastScheduleWizard` as a modal.
- The route `/broadcasts/actions/:id/schedule` already exists in the main routes — it currently renders `<Broadcasts />`. Change it to render the `BroadcastScheduleWizard` page component directly.

## Constraints

- Reuse existing styled-components patterns and design tokens.
- Import `MergeListsDialog` from `@/components/MergeListsDialog`.
- Keep all existing schedule logic (validation, payload building, mutation) unchanged except removing `removeLeadLists`.
- The page should work standalone (direct URL access, refresh).

## Validation

- `npm run lint`
- `npm run build`
