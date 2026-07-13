---
id: interactive-voice-redis-interaction-queue-worker
title: Interactive Voice Redis Interaction Queue Worker
scope: broadcast-interactive-voice-runtime
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-interaction-queue-worker.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:README.md
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/broadcast-legacy-flow.md
  - platform-api:src/workers
  - platform-api:src/modules/broadcasts
depends_on:
  - document-interactive-voice-runtime-flow
---

## Goal

Add a `platform-api` worker that consumes interactive voice DTMF callbacks from Redis and persists them in batches to the legacy `areadocliente.dialer_interactions_queue` table, replacing the current TXT-drain responsibility of `DialerLigueLead::queue_interactions()` for the new dialer integration.

The external dialer will write Redis queue items using the same semicolon-delimited payload currently appended by the legacy endpoint to `uploads/dialer_interactions_queue.txt`:

```text
dialer_id;actions_id;dtmf_digit;number;action;sms_id;date;time
```

For LigueLead callbacks the expected values are:

- `dialer_id`: `2`
- `actions_id`: legacy `actions.id`; the old endpoint uses `campaign_id` when present, otherwise falls back to `dialer_campaign_id`
- `dtmf_digit`: digit pressed by the callee
- `number`: destination phone/MSISDN that becomes `dialer_interactions_queue.destination`
- `action`: legacy interaction action, for example `SMS`, `Blocklist`, `Blocklist`, or `Desligar`
- `sms_id`: nullable SMS template id for `SMS` interactions
- `date`: callback date in `YYYY-MM-DD`
- `time`: callback time in `HH:mm:ss`

## Legacy Behavior To Preserve

The current legacy flow is implemented in `/home/rick/projetos/areadocliente/application/controllers/DialerLigueLead.php`:

- `send_interaction()` appends one semicolon-delimited row to `./uploads/dialer_interactions_queue.txt` and `./uploads/dialer_interactions_logs.txt`.
- `queue_interactions()` reads the TXT queue, clears it, parses rows with `explode(';', ...)`, and inserts a batch into `areadocliente.dialer_interactions_queue` with fields:
  - `dialer_id`
  - `actions_id`
  - `dtmf_digit`
  - `destination`
  - `action`
  - `sms_id`
  - `date`
  - `time`
- `processing_queue_interactions()` remains the legacy executor: it consumes `dialer_interactions_queue`, joins `actions` and `sms`, deletes processed queue rows, applies `SMS` and `Blocklist` side effects, and inserts final rows into `interactive_voice_result`.

This task should migrate the queue ingestion from TXT to Redis, not reimplement final DTMF execution unless a later task explicitly migrates `processing_queue_interactions()` too.

## Requirements

- Define the Redis queue key/name in config/env with a clear default, for example `ci3:interactive_voice:interactions`.
- Add a worker command, package script, and process entrypoint for draining the Redis queue.
- Consume queue items in bounded batches so the worker can insert many callbacks efficiently without unbounded memory growth.
- Parse the same semicolon format listed above and insert valid rows into `areadocliente.dialer_interactions_queue` in batch.
- Preserve nullable `sms_id`: empty field or missing value must be stored as `NULL`.
- Validate row shape before insert. Malformed rows must not crash the worker loop; log concise diagnostics and move them to a dead-letter/error key or otherwise make them inspectable.
- Keep idempotency/duplication risk explicit. If Redis consumption uses pop semantics, document the at-least-once/at-most-once behavior. If a retry strategy can duplicate rows, add a deterministic guard or document why the legacy table cannot deduplicate yet.
- Do not perform SMS sending, blocklist insertion, credit subtraction, or `interactive_voice_result` insertion in this new worker. Those side effects are still owned by the legacy `processing_queue_interactions()` routine.
- Add operational logs that summarize batch size, inserted rows, skipped malformed rows, and failures without printing phone numbers in full.
- Update human docs to explain that new dialer integrations write DTMF callback rows to Redis, while this worker persists them into the same legacy DB queue consumed by `processing_queue_interactions()`.

## Implementation Notes

Prefer matching the existing worker style used by broadcast mailing workers in `platform-api`. Reuse existing Redis and database bootstrap patterns instead of introducing a new runtime stack.

If the existing platform API database layer does not yet expose a repository for `dialer_interactions_queue`, add a small focused repository/service under the broadcast or interactive-voice boundary. Keep the schema contract local and explicit.

## Acceptance Criteria

- Given Redis items like `2;1767445;1;5511999999999;SMS;1301633;2026-05-19;10:30:00`, the worker inserts rows into `areadocliente.dialer_interactions_queue` with the same field mapping used by `DialerLigueLead::queue_interactions()`.
- Empty `sms_id` values insert as `NULL`.
- Malformed Redis items are skipped and recorded for inspection without blocking later valid rows.
- The worker processes batches and exits/loops according to the project worker conventions.
- Tests cover parsing, batch insertion, nullable SMS id, malformed rows, and Redis drain behavior.
- Docs clearly distinguish Redis ingestion from legacy interaction execution.
