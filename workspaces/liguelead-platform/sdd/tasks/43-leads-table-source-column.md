---
id: leads-table-source-column
title: Replace blocklist column with source column on Leads table
scope: leads-table-improvements
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - platform-api: npm run typecheck
  - platform-api: npm test
  - platform-api: npm run build
  - platform-front: npm run build
---

## Goal

Replace the `blocklist` column with a `FONTE` (source) column on the Leads table, showing how the lead was added to the system.

## Source logic

- `from_platform = null` or empty → display "Upload manual"
- `from_platform = "manual"` → display "Manual"
- Any other value → display the value as-is

## Backend change (platform-api)

- When creating a lead via `POST /leads` (manual creation endpoint), set `from_platform = "manual"` if not explicitly provided.
- Upload processor keeps current behavior (does not set `from_platform`, remains null).

## Frontend change (platform-front)

- In `useLeadColumns`, remove the `blocklist` column.
- Add a `FONTE` column that reads `fromPlatform` and displays:
  - `null`/empty → "Upload manual"
  - `"manual"` → "Manual"
  - other → value as-is
- Keep column order logical (after phone/email).
