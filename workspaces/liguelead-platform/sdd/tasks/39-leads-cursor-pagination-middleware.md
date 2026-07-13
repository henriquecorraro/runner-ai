---
id: leads-cursor-pagination-middleware
title: Expose cursor-paginated leads listing through middleware
scope: leads-pagination
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
depends_on:
  - leads-cursor-pagination-api
---

## Goal

Expose the cursor-paginated leads listing through the middleware so the frontend can consume it.

## Implementation

- Update `GET /leads` route in `src/domains/leads/` to accept `pageSize` and `cursor` query params.
- Update `listLeadsInputSchema` query to include optional `pageSize` (number, 1-100) and `cursor` (string or number).
- Update `listLeadsOutputSchema` to include `meta: { pageSize, nextCursor, hasMore }` alongside `items`.
- Keep session auth strategy unchanged.
- Proxy params and response as-is from backend — no transformation needed.
