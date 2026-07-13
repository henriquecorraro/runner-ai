---
id: list-leads-page-add-iconbutton-to-remove-lead-from-current-tag
title: List leads page: add IconButton to remove lead from current tag
scope: leads
status: done
repositories:
  - platform-front
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
depends_on:
  - leads-page-add-delete-soft-delete-iconbutton-per-lead-row
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731275437
github_issue_number: 105
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/105
github_issue_node_id: I_kwDORqaAXc8AAAABGgGIrQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/105
github_project_item_id: 204076784
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp9vA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204076784"
github_project_status: Done
---

## Goal

Add a trash IconButton to each row in the list-specific leads table (`ListLeadsContent`). Clicking it opens a confirmation dialog (via `useModal` hook). On confirm, call `DELETE /lead-lists/:listId/leads/:leadId` to remove the lead from that tag only (not soft-delete the lead).

## Frontend

### File: `src/hooks/tables/useLeadColumns.tsx`

The `onDelete` option already added in the sibling task makes this work. `ListLeadsContent` passes its own `onDelete` handler that removes the lead from the list rather than soft-deleting.

### File: `src/pages/ListLeads/components/ListLeadsContent.tsx`

- Add `useMutation` for remove-from-list: `api.delete(\`/lead-lists/\${listId}/leads/\${leadId}\`)`
- Use `useModal<DeleteConfirmationData>('delete-confirmation')` to open confirmation
- Pass `onDelete` to `useLeadColumns({ onDelete: handleRemoveFromList })`
- Render `<DeleteConfirmationDialog isSubmitting={...} />`
- On confirm: call mutation, invalidate `listLeadsQueryKey(listId)`, close dialog, show success alert
- Dialog description must clarify lead is being REMOVED FROM THIS TAG, not deleted entirely

### File: `src/service/leads_lists/leads-lists-service.ts`

Add export:
```ts
export const removeLeadFromList = async (listId: string, leadId: string): Promise<void> => {
  await api.delete(`${prefix}/${listId}/leads/${leadId}`)
}
```

## API (already exists)

Route: `DELETE /lead-lists/:id/leads/:leadId` — `leadListsController.removeLeadFromList`  
Removes the lead-list association. No API changes needed.

## Constraints

- Do NOT soft-delete the lead; only remove from current list
- Depends on task `leads-page-add-delete-soft-delete-iconbutton-per-lead-row` for the `onDelete` column option in `useLeadColumns`

## Validation

- `npm run lint` passes
- `npm run build` passes
