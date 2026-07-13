---
id: upload-blocklist-mark-duplicate-leads
title: Mark duplicate leads as blocklist during blocklist list upload
scope: lead-list-upload-blocklist
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

## Goal

When uploading a list marked as blocklist (`job.isBlocklist = true`), duplicate leads (already in the database) must be updated to `blocklist = true`.

## Current behavior

In `lead-list-upload-processor.service.ts` `flushBatch()`, when a lead already exists:
- It attaches the lead to the list
- Increments `totalDuplicate`
- Counts existing blocklist links for summary
- Does NOT update the lead's `blocklist` field

New leads correctly receive `blocklist: job.isBlocklist`.

## Required fix

In the duplicate-lead branch (line ~653), when `job.isBlocklist === true` and `existingLead.blocklist !== true`:
- Update the lead's `blocklist` to `true` in the database
- Increment the general list (`GENERAL_LEAD_LIST_ID`) `totalBlocklistDelta` by the number of leads newly marked as blocklist
- Count these newly-blocklisted leads in `batchNewBlocklistLinks` for the upload list summary

## Implementation notes

- Add a collection of lead IDs to mark as blocklist during the batch loop.
- After the loop, bulk-update those leads with `blocklist = true` (single query, e.g. `UPDATE leads SET blocklist = 1 WHERE id IN (...)`).
- Use `LeadsRepository` or add a `bulkMarkBlocklist(ids: string[])` method.
- Adjust `totalBlocklistDelta` on `GENERAL_LEAD_LIST_ID` summary to include the newly-blocklisted duplicates.
- Adjust `batchNewBlocklistLinks` to count duplicates that were not previously blocklisted but are now.
