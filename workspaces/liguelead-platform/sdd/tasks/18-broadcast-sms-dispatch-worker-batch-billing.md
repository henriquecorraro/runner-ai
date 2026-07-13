---
id: broadcast-sms-dispatch-worker-batch-billing
title: Broadcast SMS dispatch worker with batch billing
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sms-dispatch.service.spec.ts tests/broadcast-sends.repository.spec.ts tests/broadcast-mailing-populator.service.spec.ts"
docs_targets:
  - platform-api:src/modules/broadcasts/services/broadcast-sms-dispatch.service.ts
  - platform-api:src/workers/broadcast-sms-dispatch.worker.ts
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/broadcast-legacy-flow.md
  - platform-api:README.md
depends_on:
  - move-sms-broadcast-mailing-population-to-async-worker-with-redis-progress
---

Implement a new platform-api SMS dispatch runtime for broadcast SMS/SMS Flash. The worker must select eligible scheduled actions only after the mailing table is populated and `processing_queue = 0`, atomically claim the action, charge credits directly batch by batch before invoking the Lambda, write SMS results for sent batches, mark unchargeable remaining recipients as `Sem Saldo`, mark batches processed, and finish the action. Keep dispatch isolated from the existing mailing-population worker and document how it replaces the legacy `Sms::send_sms_bulk` path.
