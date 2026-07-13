---
id: leads-cursor-pagination-api
title: Add cursor-based pagination to leads listing endpoint
scope: leads-pagination
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - platform-api:docs/human/modules/leads.md
---

## Goal

Replace the current fixed-20 leads listing with cursor-based pagination using `id_pk` as the cursor column.

## Current state

- `GET /leads` returns max 20 leads ordered by `id_pk DESC`, no pagination params accepted.
- `LeadsRepository.list()` uses `LIMIT 20` with no offset/cursor.
- Table has ~880k rows. Largest client has 621k leads.
- Index `idx_leads_client_del_ddi_idpk` covers `(client_id, deleted_at, ddi, id_pk)`.
- Sequelize paranoid mode adds `deleted_at IS NULL` automatically.

## Implementation

- Accept optional query params: `pageSize` (default 20, max 100), `cursor` (id_pk value, optional).
- When `cursor` is provided, filter `id_pk < cursor` (descending order) to fetch the next page.
- When `search` is provided alongside cursor, apply the existing OR search filter combined with the cursor condition.
- Return response shape: `{ items, meta: { pageSize, nextCursor, hasMore } }` where `nextCursor` is the `id_pk` of the last item returned (null if no more).
- `hasMore`: fetch `pageSize + 1` rows, return `pageSize` rows, set `hasMore = true` if extra row existed.
- Keep backward compatibility: if no cursor/pageSize sent, behave as today (20 items, no pagination meta beyond current shape).
- Update `listLeadsQuerySchema` to accept `pageSize` and `cursor` params.
- Update `ListLeadsInput` contract.
- Update `LeadsRepository.list()` to use cursor filtering.
- Update controller response to include pagination meta.
- Update route contract test registry if response shape changes.
- The `id_pk` column is `BIGINT UNSIGNED`, auto-increment, unique-indexed — ideal for stable cursor ordering without offset performance degradation.
