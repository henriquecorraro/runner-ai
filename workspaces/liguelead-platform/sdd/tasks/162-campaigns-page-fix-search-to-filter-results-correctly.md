---
id: campaigns-page-fix-search-to-filter-results-correctly
title: Campaigns page: fix search to filter results correctly
scope: campaigns
status: done
repositories:
  - platform-front
  - platform-api
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
  - "npm run typecheck (platform-api)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731276771
github_issue_number: 106
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/106
github_issue_node_id: I_kwDORqaAXc8AAAABGgGN4w
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/106
  - https://github.com/ligue-lead-tech/platform-api/issues/74
github_project_item_id: 204076897
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp92E
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204076897"
github_project_status: Done
---

## Goal

Fix the search functionality in the Campaigns page. Currently the search debounce updates `debouncedSearch` and passes it to `useCampaignsQuery({ search: debouncedSearch })`, but the Table uses `mode="server"` which means the globalFilter from `onQueryChange` is the source of truth for search. The issue: `handleQueryChange` only sets `search` state but the query uses `debouncedSearch` — the debounce logic works. However the API `GET /campaigns?search=` must actually filter results server-side.

## Investigation

Check if `GET /campaigns` endpoint actually applies the `search` query param to filter campaigns in the database. The `campaigns-service.ts` already sends `search` param. Verify `campaigns.controller.ts` and `campaigns.repository.ts` handle it.

## Fix (API if needed)

### File: `src/modules/campaigns/controllers/campaigns.controller.ts`

Verify the controller passes `search` from query params to the use-case/repository.

### File: `src/modules/campaigns/repositories/campaigns.repository.ts`

Ensure the `findAll` / `getAll` method applies a `WHERE title LIKE '%search%' OR description LIKE '%search%'` clause when `search` param is present.

## Fix (Frontend if needed)

### File: `src/pages/Campaigns/components/CampaignsContent.tsx`

The Table currently uses `mode="server"` but `pageCount={1}` and renders all data at once. If API returns all campaigns unfiltered, ensure the `search` param is correctly passed and the server-side filtering works end-to-end.

If the API does not support search filtering: either add it to the API, or switch the table to client-side filtering (`mode="client"`).

## Validation

- `npm run lint` passes (platform-front)
- `npm run build` passes (platform-front)
- `npm run typecheck` passes (platform-api)
- Typing in the search input filters campaigns by title/description
