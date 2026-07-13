---
id: create-list-from-leads-filter
title: Create or populate list from active leads filter
scope: lead-platforms
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

# Goal

Allow users to create a new list or add to an existing list from the current leads filter results. A button on the Leads toolbar opens a modal showing active filters summary and lets the user either pick an existing list or create a new one (name + color). The backend processes the filtered leads and links them to the target list.

# Implementation

## platform-api

- Add `POST /lead-lists/from-filter` endpoint.
- Input: `{ slug: string, color?: string, description?: string, existingListId?: string, filters: { search?, leadListIds?, createdWithinDays?, fromPlatformId? } }`.
- If `existingListId` is provided, use that list. Otherwise create a new list with slug/color.
- Query all lead IDs matching the filters (paginated internally in batches).
- Bulk attach leads to the target list via `addLeadsToList`.
- Return the list entity + count of leads added.

## middleware

- Add `POST /lead-lists/from-filter` route with input/output schemas.

## platform-front

- Add a button "Criar lista do filtro" in the Leads toolbar (visible when any filter is active).
- Button opens a modal showing:
  - Summary of active filters (tag, fonte, período).
  - Option toggle: "Criar nova lista" or "Adicionar a lista existente".
  - If new: name (slug) + color picker fields.
  - If existing: dropdown to select list.
  - Confirm button.
- On confirm, POST to `/lead-lists/from-filter` with filters + list info.
- On success, invalidate leads and lists queries, show toast.

# Constraints

- Process leads in batches of 5000 IDs to avoid memory issues with large filters.
- The endpoint uses the same filter logic as `listItems` (reuse `buildBaseWhere`).
- Do not re-add leads already in the target list (use `ignoreDuplicates`).
