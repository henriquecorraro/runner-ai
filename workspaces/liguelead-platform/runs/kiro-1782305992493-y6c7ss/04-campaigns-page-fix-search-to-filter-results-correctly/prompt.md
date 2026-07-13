You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: campaigns-page-fix-search-to-filter-results-correctly
Title: Campaigns page: fix search to filter results correctly

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

### campaigns-page-fix-search-to-filter-results-correctly
Task id: campaigns-page-fix-search-to-filter-results-correctly
Task title: Campaigns page: fix search to filter results correctly
Task status: open
Task scope: campaigns
Task validation: npm run lint (platform-front) ; npm run build (platform-front) ; npm run typecheck (platform-api)

```md
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
```
## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### campaigns-page-fix-search-to-filter-results-correctly
Task id: campaigns-page-fix-search-to-filter-results-correctly
Task title: Campaigns page: fix search to filter results correctly
Task status: open
Task scope: campaigns
Task validation: npm run lint (platform-front) ; npm run build (platform-front) ; npm run typecheck (platform-api)

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/04-campaigns-page-fix-search-to-filter-results-correctly/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: campaigns-page-fix-search-to-filter-results-correctly
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
