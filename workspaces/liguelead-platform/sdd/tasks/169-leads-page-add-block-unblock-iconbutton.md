---
id: leads-page-add-block-unblock-iconbutton
title: Leads page: add block/unblock IconButton per lead row
scope: leads
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4740322962
github_issue_number: 112
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/112
github_issue_node_id: I_kwDORqaAXc8AAAABGouWkg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/112
github_project_item_id: 204597879
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwx6nc
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204597879"
github_project_status: Done
---

## Goal

Add a block/unblock IconButton per lead row in the Leads table. Clicking it toggles the lead's `blocklist` status via `PUT /leads/:id { blocklist: true/false }`.

## Frontend

### File: `src/hooks/tables/useLeadColumns.tsx`

Add `onToggleBlocklist?: (lead: TLeadItem) => void` to column options.

When provided, render an IconButton in the actions cell (next to the delete button):
- If `lead.blocklist === false`: show `ProhibitIcon` (or `ShieldWarningIcon`) with neutral style
- If `lead.blocklist === true`: show `ProhibitIcon` filled with danger style

Clicking opens a confirmation dialog.

### File: `src/pages/Leads/components/LeadsContent.tsx`

- Add mutation: `api.put(\`/leads/${id}\`, { blocklist: !lead.blocklist })`
- On success: update cache optimistically with `queryClient.setQueriesData` toggling `lead.blocklist`
- Show success alert: "Lead adicionado à blocklist" or "Lead removido da blocklist"
- Pass `onToggleBlocklist` to `useLeadColumns`

### File: `src/service/leads/leads-service.ts`

Add:
```typescript
export const updateLead = async (id: string, data: { blocklist?: boolean }): Promise<void> => {
  await api.put(`${prefix}/${id}`, data)
}
```

## Constraints

- Use `ProhibitIcon` from `@phosphor-icons/react`
- Confirmation dialog must indicate the action clearly
- Optimistic cache update (no page reload)
- Works in both Leads page and ListLeads page

## Validation

- `npm run lint`
- `npm run build`
