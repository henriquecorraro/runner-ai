---
id: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
title: "Leads page: add delete (soft-delete) IconButton per lead row"
scope: leads
status: done
repositories:
  - platform-front
  - platform-api
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731274393
github_issue_number: 104
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/104
github_issue_node_id: I_kwDORqaAXc8AAAABGgGEmQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/104
  - https://github.com/ligue-lead-tech/platform-api/issues/73
github_project_item_id: 204076691
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp9pM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204076691"
github_project_status: Done
---

## Goal

Add a trash IconButton to each row in the general leads table (`LeadsContent`). Clicking it opens a confirmation dialog (via `useModal` hook pattern). On confirm, call `DELETE /leads/:id` (soft-delete already exists in API).

## Frontend

### File: `src/hooks/tables/useLeadColumns.tsx`

Add an `actions` column at the end of the columns array:

```tsx
{
  header: '',
  id: 'actions',
  enableSorting: false,
  enableColumnFilter: false,
  cell: ({ row }) => (
    <IconButton size="sm" variant="outline" color="danger200" onClick={() => onDelete(row.original)}>
      <TrashIcon size={14} weight="bold" />
    </IconButton>
  ),
}
```

- Add `onDelete?: (lead: TLeadItem) => void` to `TUseLeadColumnsOptions`
- Only render the actions column when `onDelete` is provided
- Import `IconButton` from `@liguelead/design-system`, `TrashIcon` from `@phosphor-icons/react`

### File: `src/pages/Leads/components/LeadsContent.tsx`

- Add service call: `DELETE /leads/:id` — use `api.delete(\`/leads/\${id}\`)`
- Add `useMutation` for delete with `onSuccess` invalidating `leadsQueryKey`
- Use `useModal<DeleteConfirmationData>('delete-confirmation')` to open confirmation dialog
- Pass `onDelete` callback to `useLeadColumns`
- Render `<DeleteConfirmationDialog isSubmitting={...} />` in the component
- On confirm callback: call mutation, invalidate, close dialog, show success alert

### File: `src/service/leads/leads-service.ts`

Add export:
```ts
export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`${prefix}/${id}`)
}
```

## API (already exists)

Route: `DELETE /leads/:id` — `leadsController.softDelete`  
Sets `deleted_at = NOW()` on the lead row. No API changes needed.

## Validation

- `npm run lint` passes
- `npm run build` passes
- Clicking trash icon opens confirmation Dialog
- Confirming calls DELETE and removes lead from list
