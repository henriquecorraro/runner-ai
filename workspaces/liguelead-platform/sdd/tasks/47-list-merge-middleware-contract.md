---
id: list-merge-middleware-contract
title: Expose list merge endpoints through middleware
scope: list-merge
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
depends_on:
  - list-merge-worker-api
---

## Goal

Expose the list merge endpoints through the middleware so the frontend can trigger merges and poll progress.

## Routes

### `POST /leads-lists/merge`

- Forward to platform-api `POST /leads-lists/merge`.
- Request schema (Zod):
  ```ts
  {
    name: z.string().min(1),
    addListIds: z.array(z.number()).min(1),
    removeListIds: z.array(z.number()).default([])
  }
  ```
- Response: `{ listId: number, progress: MergeProgress }`.

### `GET /leads-lists/:id/merge-progress`

- Forward to platform-api `GET /leads-lists/:id/merge-progress`.
- Response: `MergeProgress` object with `status`, `totalLists`, `processedLists`, `resultLeads`, `errorMessage`, `updatedAt`.

## Constraints

- Use existing auth middleware (session token validation).
- Follow existing route catalog patterns.
- Regenerate OpenAPI docs.

## Validation

- `npm run build`
- `npm test`
- `npm run docs:openapi`
