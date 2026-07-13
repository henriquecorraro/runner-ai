---
id: tags-page-fix-search-filtering-to-work-correctly
title: Tags page: fix search filtering to work correctly
scope: tags
status: done
repositories:
  - platform-front
  - platform-api
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
  - "npm run typecheck (platform-api)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731280369
github_issue_number: 108
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/108
github_issue_node_id: I_kwDORqaAXc8AAAABGgGb8Q
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/108
  - https://github.com/ligue-lead-tech/platform-api/issues/75
github_project_item_id: 204077171
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp-HM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204077171"
github_project_status: Done
---

## Goal

Fix the Tags page search to work correctly, same pattern as the Leads page. The `ListsContent` component passes `search` to `useListsQuery({ page, pageSize, search })`, which calls `GET /lead-lists?search=`. Verify the API applies the filter. If it does, verify the frontend debounce + query invalidation works end-to-end.

## Investigation

### File (API): `src/modules/lead-lists/repositories/lead-lists.repository.ts`

Verify the `findAll`/`getAll` method applies `WHERE slug LIKE '%search%'` when `search` param is provided.

### File (API): `src/modules/lead-lists/controllers/lead-lists.controller.ts`

Verify `search` query param is extracted and passed to the repository.

## Frontend

### File: `src/pages/Lists/components/ListsContent.tsx`

Current flow:
1. `handleQueryChange` receives `state.globalFilter` and sets `search` state
2. `useListsQuery({ page, pageSize, search })` passes search to API

Potential issue: if `page` is not reset to 1 when search changes, results may be empty. Verify logic in `handleQueryChange`:
```ts
const nextSearch = state.globalFilter
setPage(nextSearch === search ? state.pageIndex + 1 : 1)
```

This looks correct. If search still doesn't work, the issue is likely in the API not filtering by the `search` param.

## Fix

Apply whichever fix is needed:
- If API doesn't filter: add `WHERE slug ILIKE '%${search}%'` to the lists query
- If frontend timing issue: add debounce similar to Campaigns/Leads patterns

## Validation

- `npm run lint` passes (platform-front)
- `npm run build` passes (platform-front)
- `npm run typecheck` passes (platform-api)
- Typing in the Tags page search input correctly filters tags by name
