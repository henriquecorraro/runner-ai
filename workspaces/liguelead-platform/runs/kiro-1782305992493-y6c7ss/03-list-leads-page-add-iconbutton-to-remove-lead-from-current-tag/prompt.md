You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: list-leads-page-add-iconbutton-to-remove-lead-from-current-tag
Title: List leads page: add IconButton to remove lead from current tag

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

### list-leads-page-add-iconbutton-to-remove-lead-from-current-tag
Task id: list-leads-page-add-iconbutton-to-remove-lead-from-current-tag
Task title: List leads page: add IconButton to remove lead from current tag
Task status: open
Task scope: leads
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/03-list-leads-page-add-iconbutton-to-remove-lead-from-current-tag/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: list-leads-page-add-iconbutton-to-remove-lead-from-current-tag
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
