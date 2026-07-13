---
id: document-interactive-voice-runtime-flow
title: Document Interactive Voice Runtime Flow
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
  - document-broadcast-sms-legacy-mailing-flow
---

## Goal

Document the legacy runtime flow for interactive voice broadcasts after the new platform has already materialized the dialer mailing and `dialer_numbers_action` mappings.

## Legacy Findings To Capture

- `types_id = 2` stores interaction setup in both `areadocliente.actions_has_interactions` and `dialer.dialer_numbers_action`.
- `Action_service::handleCallAction()` writes `key`, `audio_id`, `destination`, `sms_id`, and `actions_id` to `actions_has_interactions`, and mirrors DTMF behavior into `dialer_numbers_action` for the dialer.
- The external dialer posts interaction callbacks to `DialerLigueLead::send_interaction()`.
- `send_interaction()` appends semicolon-delimited rows to `./uploads/dialer_interactions_queue.txt` and `./uploads/dialer_interactions_logs.txt`.
- Row format is `dialer_id;actions_id;dtmf_digit;number;action;sms_id;date;time`.
- `DialerLigueLead::queue_interactions()` drains `dialer_interactions_queue.txt`, clears the file, parses rows, and inserts them into `dialer_interactions_queue`.
- `DialerLigueLead::processing_queue_interactions()` consumes `dialer_interactions_queue` by action, joins `actions` and `sms`, deletes processed queue rows, and writes final rows to `interactive_voice_result`.
- For `action = SMS`, processing updates SMS totals, subtracts SMS credits, and invokes `sendMultipleSMS()` to send through the SMS Lambda/gateway path.
- For `action = Blocklist`, processing adds the phone to lead/global blocklist with the legacy reason.
- Reports and billing totals read `interactive_voice_result` joined to `actions_has_interactions`.
- The project contains endpoints but no local cron definition was found; scheduling likely lives in server crontab/infra.

## Documentation Updates

Expand `platform-api` human docs to make this runtime explicit and to define what the new platform should and should not own. The new platform owns schedule-time materialization; the legacy/external runtime owns callback ingestion and interaction execution unless a future task migrates it.

## Validation

Review the docs diff for clarity and accuracy against the legacy files.
