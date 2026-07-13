---
id: implement-interactive-voice-sms-dispatch-and-billing-in-platform-api
title: Implement interactive voice SMS dispatch and billing in platform-api
scope: broadcasts
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-interaction-queue-worker.spec.ts tests/broadcast-sms-dispatch.service.spec.ts
  - npm run typecheck
docs_targets:
  - platform-api/docs/human/modules/broadcasts.md
  - platform-api/docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - corrigir-url-audio-em-intera-es-de-voz-interativa-no-platform-api
---

Implement the runtime that processes DTMF interactions whose final destination is SMS, matching the legacy areadocliente behavior while moving the responsibility into platform-api.

Current context:
- platform-api already materializes interactive voice configuration into `actions_has_interactions` and `dialer.dialer_numbers_action` during scheduling.
- The `interactive-voice-interactions` worker currently only consumes Redis payloads in the legacy format `dialer_id;actions_id;dtmf_digit;number;action;sms_id;date;time` and inserts valid rows into `areadocliente.dialer_interactions_queue`.
- In the legacy runtime, `DialerLigueLead::processing_queue_interactions` reads `dialer_interactions_queue`, joins SMS templates, charges SMS credits, invokes the SMS Lambda, updates action totals, writes `sms_result`, and inserts `interactive_voice_result`.
- platform-api should dispatch interaction SMS correctly without depending on the legacy runtime, while keeping database/report compatibility.

Expected implementation:
- Add a service/worker in platform-api to process `dialer_interactions_queue` rows grouped by `actions_id`, starting with the `SMS` interaction case.
- For each SMS interaction, load the SMS template by `sms_id`, using `sms.message` and `sms.credits` for dispatch and billing.
- Reuse or adapt the existing SMS Lambda invoker (`AwsLambdaSmsGatewayInvoker`) where possible, including active gateway resolution and compatible payload shape.
- Charge SMS credits before dispatch using the current unit/batch billing path where possible, or document any required compatibility bridge with legacy tables/services.
- Update `actions.total_sms` and `actions.total_send_sms` in a way that remains compatible with legacy reports.
- Insert `sms_result` rows with status `Enviada` for interaction SMS sends.
- Insert `interactive_voice_result` rows with the final reporting fields (`actions_id`, option/DTMF, phone, date, time), dropping runtime-only queue fields as the legacy flow does.
- Handle `Blocklist` and `Desligar` outside the first implementation slice if needed, but make that boundary explicit in tests and docs.
- Provide reasonable idempotency so simple retries do not duplicate SMS sends; document the chosen processing semantics.
- Update `docs/human/modules/broadcasts.md` and `docs/human/modules/broadcast-legacy-flow.md` to reflect the new runtime boundary.

Important notes:
- An interaction can play a continuation audio and then send SMS; continuation audio is independent from the final interaction destination.
- The `sms_id` mirrored into `dialer_numbers_action` and sent back in the callback is the SMS template to dispatch.
- Interaction SMS must consume SMS credits, not voice credits.
- Do not mark this task as done until the user validates the behavior.
