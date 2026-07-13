---
id: credit-packages-catalog-middleware
title: Expose credit packages and registration status through middleware
scope: credit-purchase
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
docs_targets:
  - middleware:docs/contracts-and-routes/README.md
depends_on:
  - credit-packages-catalog-api
---

## Goal

Expose the credit packages catalog and registration validation endpoints through the middleware, proxying to `NEW_BACKEND_URL`.

## Endpoints to expose

### GET /clients/registration-status

- Auth: required, strategy: session
- Target: NEW_BACKEND_URL
- Input: headers (session), empty params/query/body
- Output schema:
  ```
  {
    complete: boolean,
    missingFields: string[] (optional, present when complete=false)
  }
  ```

### GET /credit-packages

- Auth: required, strategy: session
- Target: NEW_BACKEND_URL
- Input: headers (session), query `{ creditTypeId: z.coerce.number().int().positive() }`
- Output schema:
  ```
  {
    packages: Array<{
      id: number | string,
      name: string,
      creditTypeId: number,
      rangeStart: number,
      rangeEnd: number,
      unitaryValue: number,
      order: number
    }>
  }
  ```

## Implementation Constraints

- Create `src/domains/credit-packages/routes.ts` and `src/domains/credit-packages/contracts.ts`.
- Add registration-status route to a new `src/domains/clients/routes.ts` and `src/domains/clients/contracts.ts` (or existing if one is already present).
- Register both route sets in `src/contracts/routes.ts`.
- Follow existing middleware patterns: Zod schemas for input/output, RouteDefinition array export.

## Docs Alignment

Update `docs/contracts-and-routes/README.md` to list the new routes.
