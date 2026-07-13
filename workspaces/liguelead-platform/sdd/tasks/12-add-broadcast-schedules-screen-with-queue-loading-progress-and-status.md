---
id: add-broadcast-schedules-screen-with-queue-loading-progress-and-status
title: Add broadcast schedules screen with queue loading progress and status
scope: broadcast-schedules
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sends.repository.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - /home/rick/projetos/platform-api/src/modules/broadcasts
  - /home/rick/projetos/platform-api/docs/human/modules/broadcasts.md
  - /home/rick/projetos/middleware/src
  - /home/rick/projetos/middleware/docs
  - /home/rick/projetos/platform-front/src/service/broadcasts/broadcasts-service.ts
  - /home/rick/projetos/platform-front/src/service/broadcasts/broadcasts-service.types.ts
  - /home/rick/projetos/platform-front/src/hooks/queries/broadcasts.queries.ts
  - /home/rick/projetos/platform-front/src/pages/Broadcasts
  - /home/rick/projetos/platform-front/src/routes/AppRoutes.tsx
  - /home/rick/projetos/platform-front/docs/features/broadcasts.md
depends_on:
  - move-sms-broadcast-mailing-population-to-async-worker-with-redis-progress
---

Create the new broadcast schedules experience, separate from the existing saved broadcast definitions list.

Context:
- Today `/broadcasts` in `platform-front` lists saved broadcast definitions (`broadcast_actions`), not scheduled send instances.
- Scheduled sends live in legacy `actions`, linked by `actions.broadcast_action_id` and exposed in `platform-api` as `BroadcastSendModel`.
- The frontend talks to `platform-api` through `middleware`, so the new schedules endpoint must also be exposed/proxied through the middleware public contract before the frontend consumes it.
- Voice schedules populate `dialer_mailings.dialer_numbers_<dialer_campaign_id>` asynchronously through the broadcast mailing worker.
- The worker saves progress in Redis key `ci3:broadcast_mailings:progress:<actions.id>` with fields `{ status, actionId, dialerCampaignId, totalRecipients, loadedRecipients, errorMessage, updatedAt }`.
- SMS/SMS Flash schedules must follow the same async population/progress pattern as voice after task `move-sms-broadcast-mailing-population-to-async-worker-with-redis-progress`.

Backend/API expectations:
- Add a schedules listing endpoint under the existing broadcast module, for example `GET /broadcasts/schedules`.
- Return only schedules for the authenticated client.
- Include schedule identity and action definition summary: legacy `actions.id`, `broadcastActionId`, title, description, `typeId`, `date`, `startTime`, `limitTime`, `statusId`, `createdAt`, `updatedAt`, `totalShipping`, `costPrediction`, `dialerCampaignId`, and `smsId` where relevant.
- Expose a human-friendly status label derived from legacy `actions.status_id` while keeping the numeric id for compatibility.
- Include queue/loading information per schedule:
  - For voice schedules with Redis progress present, use Redis `loadedRecipients`, `totalRecipients`, `status`, `errorMessage`, `updatedAt`, and mark `isLoadingAudience` while status is `queued` or `processing`.
  - For voice schedules without active Redis progress, fall back to counting rows in `dialer_mailings.dialer_numbers_<dialer_campaign_id>` when the table exists; if the table is absent and the action is still schedulable/loading, return `loadedRecipients = 0` and a clear loading/unknown state.
  - For SMS/SMS Flash schedules, prefer Redis progress while the async SMS population worker is queued/processing; fall back to counting rows in `sms_mailings.sms_numbers_<actions.id>` when the dynamic table exists; after legacy completion drops the table, avoid failing the endpoint and return a sensible completed/unknown loaded count based on `actions.total_sms`, `actions.total_send_sms`, or `total_shipping` if available.
- Avoid one query per schedule when possible. Batch Redis progress reads with `mget`, and batch or carefully bound dynamic-table checks/counts. If dynamic table counts must be per schedule, keep the implementation explicit and documented because table names are dynamic.
- Add route contracts/types/mappers and focused tests for Redis progress, table count fallback, missing dynamic tables, SMS table counts, status labels, and tenant scoping.
- Update `docs/human/modules/broadcasts.md` with the schedules endpoint and progress semantics.

Middleware expectations:
- Expose/proxy the new schedules listing route through the same authenticated API path family the frontend already uses for broadcast actions.
- Preserve auth/session propagation and tenant scoping headers/context exactly like the existing broadcast action routes.
- Add or update route schemas/types so the middleware response contract matches `platform-api` for schedule rows and queue progress fields.
- Regenerate/update OpenAPI/public docs if route catalogs or schemas are generated in this repository.
- Add focused middleware tests for successful proxying, auth propagation, API error forwarding, and response shape for schedule progress fields.

Frontend expectations:
- Add a dedicated schedules screen/route, for example `/broadcasts/schedules`, reachable from the existing Broadcasts area/sidebar/header without replacing the saved broadcast definitions list.
- Keep `/broadcasts` as the saved broadcast definitions list.
- Add service types and queries for `GET /broadcasts/schedules`, with query keys separate from `['broadcasts', 'actions']`.
- Render a dense operational table/list of scheduled sends with: broadcast title, type, schedule date/window, status, total audience, loaded audience, loading/progress state, and last progress update.
- For schedules still loading leads from Redis progress, poll/refetch periodically while any item has `isLoadingAudience = true` or progress status `queued`/`processing`. Stop polling when none are loading.
- Show progress as counts and percentage when total is known; handle unknown total gracefully.
- Keep visual style aligned with the existing Broadcasts module, using compact operational UI rather than a marketing/landing layout.
- Update `docs/features/broadcasts.md` to document the new schedules screen and polling behavior.

Important product behavior:
- A user should be able to distinguish saved broadcast definitions from scheduled sends.
- The schedules screen should make it obvious when a schedule is still loading its mailing audience versus ready/scheduled versus started/finished/failed by legacy status.
- The loaded lead count should come from the dynamic queue table whenever possible, and from Redis while the async voice worker is still loading batches.
