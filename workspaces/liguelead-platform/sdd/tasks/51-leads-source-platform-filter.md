---
id: leads-source-platform-filter
title: Add source platform filter to Leads listing screen
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
depends_on:
  - normalize-lead-from-platform-to-client-platforms-table
---

# Goal

Add a "Fonte" (source/platform) filter dropdown to the Leads screen, allowing users to filter leads by their originating platform using the normalized `from_platform_id` column and `client_platforms` table.

# Implementation

## platform-api

- Add `fromPlatformId?: number` to `ListLeadFilters`, `CountLeadFilters`, `ListLeadsInput`, and `CountLeadsInput`.
- In `buildBaseWhere`, add: if `fromPlatformId` is set, include `where.fromPlatformId = filters.fromPlatformId`.
- Add `fromPlatformId` to `listLeadsQuerySchema` as `z.coerce.number().int().min(1).optional()`.
- Pass `fromPlatformId` from the controller through the use-case into the repository.

## middleware

- Add `fromPlatformId` as optional query param in `listLeadsInputSchema`.
- Ensure it's forwarded to the backend in the proxy query string.

## platform-front

- In `LeadsContent`, add state for selected platform filter.
- Fetch available platforms from `GET /client-platforms` (new query hook).
- Render a `DropdownSelect` for "Fonte" next to the existing tag and date dropdowns.
- Pass `fromPlatformId` query param when fetching leads.
- The dropdown options come from the `GET /client-platforms` response (id + label).

# Constraints

- The filter uses the integer `from_platform_id` for the query (indexed), not the string slug.
- Keep backward compatibility: if no platform filter is selected, return all leads as before.
- The `GET /client-platforms` route already exists and returns `[{id, slug, label, createdAt}]`.
