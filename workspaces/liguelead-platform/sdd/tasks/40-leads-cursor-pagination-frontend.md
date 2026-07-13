---
id: leads-cursor-pagination-frontend
title: Implement cursor-based pagination on Leads table
scope: leads-pagination
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - leads-cursor-pagination-middleware
---

## Goal

Implement infinite-scroll or load-more pagination on the Leads table using cursor-based backend response.

## Implementation

- Update `leadsService.getLeads()` to accept and forward `pageSize` and `cursor` params.
- Update `TGetLeadResponse` to include `meta.nextCursor` and `meta.hasMore`.
- Use `useInfiniteQuery` from TanStack Query (or append pattern with `useQuery` + manual cursor tracking) to load pages.
- Table shows accumulated rows as user scrolls or clicks "load more".
- Pass `nextCursor` from previous response as `cursor` param for next page.
- Search resets pagination (clears accumulated items, starts fresh cursor).
- Footer text shows total loaded count.
- Keep existing search debounce behavior.
- Show loading indicator at bottom while fetching next page.
- Disable load-more when `hasMore = false`.
