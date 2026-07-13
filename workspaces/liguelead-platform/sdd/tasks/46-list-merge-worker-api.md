---
id: list-merge-worker-api
title: List merge async worker with Redis progress
scope: list-merge
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/lead-lists.md
---

## Goal

Create an async worker that merges lead lists by combining (sum) selected lists and removing leads from other selected lists, with real-time progress reported via Redis.

## Context

- The broadcast schedule screen currently handles list merging inline during schedule creation. This responsibility must move to a dedicated feature accessible from the Lists screen.
- Follow the same worker pattern as `leads-upload.worker.ts`: queue service for enqueue/dequeue, processor service for logic, Redis progress tracking.
- The upload worker uses `LeadListUploadQueueService` and `LeadListUploadProcessorService` as reference architecture.

## Implementation

### API Route

- Add `POST /leads-lists/merge` accepting:
  ```ts
  {
    name: string              // name for the resulting merged list
    addListIds: number[]      // lists to sum (union of leads)
    removeListIds: number[]   // lists whose leads should be removed from the result
  }
  ```
- Validate that all list IDs belong to the authenticated customer account.
- Create the target list record immediately (empty, status `processing`).
- Save initial Redis progress: `{ status: 'queued', totalLists: N, processedLists: 0, resultLeads: 0, updatedAt }`.
- Enqueue a Redis job with the merge parameters and the new list ID.
- Return the new list ID and initial progress.

### Redis Progress

- Key pattern: `ci3:list_merge:progress:<listId>`.
- Statuses: `queued` → `processing` → `completed` | `failed`.
- Fields: `status`, `totalLists`, `processedLists`, `resultLeads`, `errorMessage`, `updatedAt`.

### Add `GET /leads-lists/:id/merge-progress` 

- Returns current Redis progress for the given list merge job.

### Worker

- File: `src/workers/list-merge.worker.ts`
- Same loop pattern as leads-upload worker.
- Processing steps:
  1. Collect all lead IDs from `addListIds` (union, deduplicated).
  2. Collect all lead IDs from `removeListIds`.
  3. Subtract removal set from union set.
  4. Insert resulting leads into the target list in batches.
  5. Update Redis progress after each batch.
  6. On completion: update list status to `active`, set progress to `completed` with final `resultLeads` count.
  7. On failure: set progress to `failed` with `errorMessage`.
- Add `worker:list-merge` script to `package.json`.

### Queue Service

- `ListMergeQueueService` — enqueue/dequeue using Redis list (same pattern as upload queue).

### Processor Service

- `ListMergeProcessorService` — batch logic, progress updates.

## Validation

- `npm run typecheck`
- `npm run build`
- Unit tests for processor service covering: basic merge, removal, deduplication, empty lists, failure handling.

## Docs

- Update `docs/human/modules/lead-lists.md` with the merge worker architecture.
