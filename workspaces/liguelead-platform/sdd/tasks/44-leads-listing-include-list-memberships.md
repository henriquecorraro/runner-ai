---
id: leads-listing-include-list-memberships
title: Include lead list memberships in leads listing response
scope: leads-table-improvements
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - platform-api: npm run typecheck
  - platform-api: npm test
  - platform-api: npm run build
  - middleware: npm run build
  - middleware: npm test
  - platform-front: npm run build
---

## Goal

Include lead list memberships in the leads listing response so the frontend can display which lists each lead belongs to.

## Implementation

### platform-api

- After fetching the page of leads in `listLeadsUseCase`, query `leads_lists_map` JOIN `leads_lists` for the returned lead IDs.
- Query: `SELECT m.lead_id, ll.id, ll.slug, ll.color FROM leads_lists_map m JOIN leads_lists ll ON ll.id = m.lead_list_id WHERE m.lead_id IN (...)`
- Uses index `unique_lead_list (lead_id, lead_list_id)` — index-only scan, ~20 rows for a page of 20 leads.
- Group results by `lead_id` and attach as `leadLists: Array<{ id, slug, color }>` to each lead in the response.
- Add to `leadResponseMapper` or build in the controller after mapping.

### middleware

- Update `leadSchema` output to include `leadLists` array field.

### platform-front

- Update `TLeadItem` type to include `leadLists?: Array<{ id: string; slug: string; color: string }>`.
- Add a "Listas" column in `useLeadColumns` that renders list chips using the same visual pattern as `ScheduleListChip` in `Broadcasts.styles.ts`: border-left 4px colored bar with list slug text. Reuse or extract the styled component to a shared location.
- Each chip must be a clickable link/button that navigates to the list's internal page (`/lists/:id/leads` or equivalent route). Use `react-router` navigation.
