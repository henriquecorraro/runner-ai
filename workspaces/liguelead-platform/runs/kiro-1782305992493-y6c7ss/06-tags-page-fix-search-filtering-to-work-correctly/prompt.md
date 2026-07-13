You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: tags-page-fix-search-filtering-to-work-correctly
Title: Tags page: fix search filtering to work correctly

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

### tags-page-fix-search-filtering-to-work-correctly
Task id: tags-page-fix-search-filtering-to-work-correctly
Task title: Tags page: fix search filtering to work correctly
Task status: open
Task scope: tags
Task validation: npm run lint (platform-front) ; npm run build (platform-front) ; npm run typecheck (platform-api)

```md
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
```
## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### tags-page-fix-search-filtering-to-work-correctly
Task id: tags-page-fix-search-filtering-to-work-correctly
Task title: Tags page: fix search filtering to work correctly
Task status: open
Task scope: tags
Task validation: npm run lint (platform-front) ; npm run build (platform-front) ; npm run typecheck (platform-api)

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/06-tags-page-fix-search-filtering-to-work-correctly/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: tags-page-fix-search-filtering-to-work-correctly
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
