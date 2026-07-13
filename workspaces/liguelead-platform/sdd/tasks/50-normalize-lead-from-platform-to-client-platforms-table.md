---
id: normalize-lead-from-platform-to-client-platforms-table
title: Normalize lead from_platform field into client_platforms lookup table
scope: lead-platforms
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

# Goal

Replace the free-text `leads.from_platform CHAR(36)` column with a normalized FK reference to a new `client_platforms` table. Every lead must point to a `client_platforms` record (including a "manual" entry per client), enabling efficient integer-indexed filtering instead of string comparison across millions of rows.

# Implementation

## 1. New table `client_platforms`

```sql
CREATE TABLE client_platforms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  slug VARCHAR(50) NOT NULL,
  label VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_client_platform (client_id, slug)
);
```

## 2. New column on `leads`

- Add `from_platform_id INT UNSIGNED NULL` to `leads`.
- Add index `idx_leads_client_platform (client_id, from_platform_id)`.
- Backfill: for each distinct `(client_id, from_platform)` pair, create a `client_platforms` row and update leads accordingly. Leads with `NULL` or empty from_platform get a "manual" platform record.
- After backfill, make `from_platform_id NOT NULL`.
- Drop old `from_platform` column.

## 3. platform-api changes

- Create `ClientPlatformModel` (sequelize model) and register in `areadoclienteModels`.
- Create `ClientPlatformEntity` type.
- Create `ClientPlatformsRepository` with CRUD + findOrCreate by (clientId, slug).
- Update `LeadModel` to replace `fromPlatform: string` with `fromPlatformId: number` and add a `BelongsTo` association.
- Update `LeadEntity`, `LeadsRepository`, leads use-cases, schemas, contracts, and mappers to use `fromPlatformId` (number) instead of `fromPlatform` (string).
- On lead creation: resolve the platform slug to an ID via `findOrCreate`, then store the ID.
- On lead listing: include platform slug/label via join or separate lookup.
- Expose a route to list client platforms (GET /clients/:clientId/platforms).

## Constraints

- The "manual" platform record must be auto-created per client on first lead creation if it doesn't exist.
- Slugs are lowercase, alphanumeric + hyphens only.
- Keep backward compatibility in the API response by mapping `fromPlatformId` back to the slug string in the lead response mapper until front-end is updated.
