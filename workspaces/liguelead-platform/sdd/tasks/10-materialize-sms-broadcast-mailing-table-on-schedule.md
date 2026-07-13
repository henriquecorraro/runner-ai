---
id: materialize-sms-broadcast-mailing-table-on-schedule
title: Materialize SMS broadcast mailing table on schedule
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sends.repository.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-mailing-populator.service.spec.ts"
docs_targets:
  - /home/rick/projetos/platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts
  - /home/rick/projetos/platform-api/src/modules/broadcasts/services
  - /home/rick/projetos/platform-api/tests/broadcast-sends.repository.spec.ts
  - /home/rick/projetos/platform-api/docs/human/modules/broadcasts.md
  - /home/rick/projetos/platform-api/docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - broadcast-sms-mailings-db-config
---

Implement the SMS/SMS Flash runtime materialization for scheduled broadcast actions.

Context:
- Broadcast SMS/SMS Flash uses legacy action types `3` and `4`.
- The saved broadcast definition already requires `smsId` for `typeId = 3` or `typeId = 4`.
- Scheduling currently creates the legacy `actions` row and audience links, but only voice broadcasts materialize runtime artifacts.
- Legacy SMS runtime expects `actions.mailing_sms = 1` and a dynamic table `sms_mailings.sms_numbers_<actions.id>` populated before the legacy SMS cron starts the action.
- The legacy cron only dispatches SMS/SMS Flash actions with `status_id = 3`; actions created as `status_id = 2` for client review may have mailing prepared but must not send until approved.

Implementation expectations:
- Add a dedicated service/repository path for SMS mailing materialization, using the new `smsMailingsSequelize` connection from task 25.
- During `POST /broadcasts/actions/:id/schedules`, when `action.typeId` is `3` or `4`, create or recreate `sms_mailings.sms_numbers_<actions.id>`.
- Set `actions.mailing_sms = 1` for SMS/SMS Flash schedules.
- Populate rows with the legacy-compatible shape documented for `sms_numbers_<actions.id>`: `destination`, `actions_id`, `sms_id`, `message`, `credits`, `batch`, `processed`, and any required id/timestamp columns confirmed from legacy schema behavior.
- Resolve recipients from both legacy `audience.lists` and lead-manager `audience.leadLists`, applying `audience.removeLists`, `audience.removeLeadLists`, `audience.removeBlocklist`, `audience.isInternational`, and deduplication rules consistently with the broadcast audience estimate.
- Materialize the SMS message per recipient, replacing the supported name variable placeholder from the stored SMS content.
- Use the SMS template's persisted `credits` value when writing per-row credits.
- Assign batches using the legacy batch size documented from `SmsService::DB_BATCH_SIZE` or a locally documented equivalent if the constant is not directly available.
- Keep direct SMS dispatch out of `platform-api`; this task should prepare the queue for the existing legacy SMS runtime only.
- Add cleanup on failure so partial dynamic SMS mailing tables do not survive a failed schedule transaction/materialization path.
- Add focused tests for table creation SQL, action update, recipient population/deduplication, message variable replacement, and the status gate expectation for clients in analysis.
- Update `docs/human/modules/broadcasts.md` and `docs/human/modules/broadcast-legacy-flow.md` with the implemented behavior and any confirmed local schema details.
