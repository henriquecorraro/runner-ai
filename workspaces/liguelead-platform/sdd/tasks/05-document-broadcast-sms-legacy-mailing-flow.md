---
id: document-broadcast-sms-legacy-mailing-flow
title: Document Broadcast SMS Legacy Mailing Flow
scope: broadcast-docs
status: done
repositories:
  - platform-api
validation:
  - review docs diff
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - broadcast-schedule-submissions-analysis-status
---

## Goal

Document how the legacy SMS and SMS Flash broadcast dispatch flow works so the new platform implementation can mirror the right runtime contract.

## Legacy Findings To Capture

- SMS action types are `ActionType::SMS = 3` and `ActionType::SMS_FLASH = 4`.
- Modern legacy scheduling sets `actions.mailing_sms = 1`.
- SMS/SMS Flash mailing materialization uses the `sms_mailings` connection, not `dialer_mailings`.
- The dynamic SMS mailing table is named `sms_numbers_<actions.id>`.
- `Action_service::handleSmsAction()` creates and populates that table.
- `IntegratorSms::create_sms_table()` defines the dynamic table shape.
- `Sms::send_sms_bulk()` selects scheduled SMS actions and starts processing.
- `Sms::send_service()` reads from `sms_mailings.sms_numbers_<actionId>` when `mailing_sms = 1`; otherwise it falls back to the older `sms_send_queue` path.
- `prepareBatchToSendLambda()` and `sendToLambda()` split dynamic mailing rows by batch and invoke the SMS Lambda/gateway pipeline.
- Runtime dispatch is gated by `actions.status_id = 3`, so actions in analysis (`status_id = 2`) are materialized but not dispatched until approved/scheduled.

## Documentation Updates

Update the human docs in `platform-api` to make this SMS flow explicit and to contrast it with the voice `dialer_mailings` flow.

## Validation

Review the docs diff for clarity and accuracy against the legacy source files.
