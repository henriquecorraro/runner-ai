---
id: leads-list-and-date-filters
title: Add list membership and date range filters to leads listing
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

Add list filter and date range filter to the leads listing endpoint and UI.

## List filter

- Accept optional query param `leadListIds` (comma-separated UUIDs or array).
- When provided, JOIN `leads_lists_map` to filter leads belonging to any of the specified lists.
- When absent or empty, return all leads (current behavior — equivalent to "TODAS").
- COUNT must also respect the list filter.
- Cache key for count must include the list filter to avoid stale results.

## Date range filter

- Accept optional query param `createdWithinDays` (enum: 7, 30, 60, 90).
- When provided, add `WHERE created_at >= NOW() - INTERVAL N DAY`.
- When absent, no date filter (current behavior).
- COUNT must also respect the date filter.
- Cache key for count must include the date filter.

## Backend (platform-api)

- Update `listLeadsQuerySchema` to accept `leadListIds` (string, comma-separated) and `createdWithinDays` (number, one of 7/30/60/90).
- Update `ListLeadsInput` contract.
- Update `LeadsRepository.listItems()` to apply list JOIN and date WHERE when provided.
- Update `LeadsRepository.count()` to apply same filters.
- Update `getLeadsCountCacheKey` to include filter params in the key.

## Middleware

- Update `listLeadsInputSchema` query to accept `leadListIds` and `createdWithinDays`.

## Frontend (platform-front)

- Add a list dropdown filter above the table (default "Todas") populated from `GET /lead-lists`.
- Add a date range dropdown filter (options: "Todos", "Últimos 7 dias", "Últimos 30 dias", "Últimos 60 dias", "Últimos 90 dias").
- When filters change, reset to page 1 and pass params to the query.
- Filters should be placed in the table toolbar area alongside the search input.
