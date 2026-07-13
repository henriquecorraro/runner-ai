---
id: upload-enrich-duplicate-leads-from-csv
title: Enrich duplicate leads with missing fields from CSV upload
scope: lead-list-upload-enrichment
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

## Goal

When a CSV upload contains leads that already exist in the database, enrich the existing lead with any non-null fields from the CSV row that are currently null/empty on the lead record.

## Current behavior

In `flushBatch()`, duplicate leads are only attached to the list. Fields like `email`, `name`, `surname` from the CSV row are discarded.

## Required behavior

For each duplicate lead, if the CSV row provides a non-null/non-empty value for `email`, `name`, or `surname`, overwrite the existing lead's field with the CSV value regardless of whether the lead already had a value.

- `email`: update if CSV provides a non-empty email
- `name`: update if CSV provides a non-null name
- `surname`: update if CSV provides a non-null surname

Overwriting existing values is intentional — the CSV is the source of truth for enrichment.

## Implementation notes

- In the `fileUniqueLeads.forEach` loop, collect leads that need enrichment: `{ id, fieldsToUpdate }`.
- After the loop, batch-update using a single query per field or a bulk approach (e.g. CASE WHEN per lead, or group by identical update shape).
- Simplest approach: collect all IDs+updates into an array, then do individual `LeadModel.update()` calls batched, or use a raw query with CASE expressions.
- Prefer a `bulkEnrich(updates: Array<{ id: string; email?: string; name?: string; surname?: string }>)` method on `LeadsRepository` that only sets non-undefined fields.
- Keep it efficient: skip leads where the CSV row adds no new information.
