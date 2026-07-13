You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
Title: Leads page: add delete (soft-delete) IconButton per lead row

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### leads-page-add-delete-soft-delete-iconbutton-per-lead-row
Task id: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
Task title: Leads page: add delete (soft-delete) IconButton per lead row
Task status: open
Task scope: leads
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
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
```
## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### leads-page-add-delete-soft-delete-iconbutton-per-lead-row
Task id: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
Task title: Leads page: add delete (soft-delete) IconButton per lead row
Task status: open
Task scope: leads
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/02-leads-page-add-delete-soft-delete-iconbutton-per-lead-row/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
