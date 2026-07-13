---
id: move-sms-broadcast-mailing-population-to-async-worker-with-redis-progress
title: Move SMS broadcast mailing population to async worker with Redis progress
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sends.repository.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-mailing-populator.service.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - /home/rick/projetos/platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts
  - /home/rick/projetos/platform-api/src/modules/broadcasts/services
  - /home/rick/projetos/platform-api/src/workers
  - /home/rick/projetos/platform-api/package.json
  - /home/rick/projetos/platform-api/README.md
  - /home/rick/projetos/platform-api/docs/human/modules/broadcasts.md
  - /home/rick/projetos/platform-api/docs/human/modules/broadcast-legacy-flow.md
  - /home/rick/projetos/platform-api/tests/broadcast-sends.repository.spec.ts
  - /home/rick/projetos/platform-api/tests/broadcast-mailing-populator.service.spec.ts
depends_on:
  - materialize-sms-broadcast-mailing-table-on-schedule
---

Refactor SMS/SMS Flash schedule materialization to follow the same asynchronous queue-loading pattern used by voice broadcasts.

Context:
- Voice schedules create runtime metadata/table and enqueue a Redis job processed by `src/workers/broadcast-mailing.worker.ts`.
- The worker populates `dialer_mailings.dialer_numbers_<dialer_campaign_id>` in batches and persists progress in Redis under `ci3:broadcast_mailings:progress:<actions.id>`.
- The current SMS implementation creates and populates `sms_mailings.sms_numbers_<actions.id>` synchronously during `POST /broadcasts/actions/:id/schedules`.
- For large SMS audiences this blocks the scheduling request and does not match the existing voice architecture or the upcoming schedules-progress UI.

Implementation expectations:
- Keep schedule creation synchronous only for cheap metadata:
  - create/recreate `sms_mailings.sms_numbers_<actions.id>` or create enough runtime setup for the worker to do so safely;
  - set `actions.mailing_sms = '1'`;
  - save initial Redis progress for the schedule;
  - enqueue a Redis job for SMS mailing population.
- Move recipient resolution, deduplication, message materialization, batch assignment, and row inserts for SMS/SMS Flash into an async worker path.
- Reuse existing queue/progress infrastructure where it makes sense, or create a channel-aware broadcast mailing job shape that supports both `voice` and `sms` without breaking existing voice jobs.
- Progress for SMS must use the same semantics required by the schedules screen: `queued`, `processing`, `completed`, `failed`, `totalRecipients`, `loadedRecipients`, `errorMessage`, `updatedAt`.
- Update the worker command/process model so local/dev/homolog/prod can run the SMS population worker. Prefer extending the existing `worker:broadcast-mailing` if one worker can safely process both voice and SMS jobs; otherwise add a clearly named `worker:broadcast-sms-mailing` command and docs.
- Ensure the worker counts/saves progress after each inserted batch, just like voice.
- Keep actual SMS dispatch out of this worker. The legacy SMS runtime still consumes `sms_mailings.sms_numbers_<actions.id>` later.
- Maintain cleanup/error behavior: failed population should update Redis progress to `failed` and avoid leaving misleading partial state where possible.
- Add focused tests for:
  - scheduling SMS creates setup, saves progress, and enqueues instead of inserting all rows inline;
  - worker populates `sms_mailings.sms_numbers_<actions.id>` with variable/non-variable message behavior based on `sms.variable`;
  - worker updates Redis progress by batch and on completion/failure;
  - voice worker behavior remains unchanged.
- Update docs in `docs/human/modules/broadcasts.md`, `docs/human/modules/broadcast-legacy-flow.md`, README/Makefile worker docs if relevant, and centralized task references if the schedules screen depends on this behavior.

Important correction:
- Do not populate the SMS dynamic table synchronously in the HTTP schedule request. SMS must follow the same async loading pattern as call mailing population.
