---
id: list-merge-frontend-modal
title: Reusable list merge modal with progress feedback
scope: list-merge
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
depends_on:
  - list-merge-middleware-contract
---

## Goal

Create a reusable `MergeListsDialog` modal component that allows users to select lists to add (sum) and lists to remove (subtract), trigger the merge, and display real-time progress feedback from Redis via polling.

## Context

- The broadcast schedule screen currently has inline list selection for audience building. This modal replaces that responsibility and lives as a shared component reusable from multiple entry points.
- Initial entry point: the Lists page (button "Mesclar Listas").
- The modal should be designed for reuse (e.g., could be opened from broadcast scheduling in the future).

## Implementation

### Modal Component: `MergeListsDialog`

Location: `src/components/MergeListsDialog/`

**UI Structure:**
1. Header: "Mesclar Listas"
2. Input: name for the resulting list.
3. Two sections with multi-select list pickers:
   - "Listas para somar" — lists whose leads will be combined (union).
   - "Listas para retirar" — lists whose leads will be subtracted from the result.
4. Action button: "Mesclar" — triggers the merge.
5. Progress feedback area:
   - Shows status (`queued` / `processing` / `completed` / `failed`).
   - Progress bar or indicator based on `processedLists / totalLists`.
   - Final count of `resultLeads` on completion.
   - Error message on failure.
6. Close/dismiss when completed or cancelled.

**Props:**
```ts
{
  open: boolean
  onClose: () => void
  onMergeComplete?: (listId: number) => void
}
```

### Service Layer

- `src/service/leads_lists/leads-lists-service.ts`:
  - Add `mergeLists(payload: { name: string, addListIds: number[], removeListIds: number[] })` — calls `POST /leads-lists/merge`.
  - Add `getMergeProgress(listId: number)` — calls `GET /leads-lists/:id/merge-progress`.

### Progress Polling

- After triggering merge, poll `getMergeProgress` every 2 seconds.
- Stop polling when status is `completed` or `failed`.
- Use a React Query mutation for the merge trigger and a query with `refetchInterval` for progress.

### Lists Page Integration

- Add a "Mesclar Listas" button to the Lists page toolbar/header area.
- Opens `MergeListsDialog`.
- On merge complete, invalidate lists query to refresh the table.

## Constraints

- Follow existing styled-components patterns and design tokens from `@liguelead/foundation`.
- Use existing `Modal` atomic component as the dialog base.
- Use existing `DropdownSelect` or a multi-select variant for list picking.
- Match the dark theme and spacing conventions of the sidebar/platform layout.

## Validation

- `npm run lint`
- `npm run build`
