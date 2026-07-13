---
id: user-notification-preferences-and-delivery-core
title: Implement account notification preferences and channel delivery core
scope: user-notification-preferences
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/notifications.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4798721193
github_issue_number: 101
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/101
github_issue_node_id: I_kwDORpoJ688AAAABHgasqQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/101
github_project_item_id: 208030342
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxmSoY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208030342"
github_project_status: Done
---

## Migration

Create `migrations/026-create-client-notification-preferences.sql`.

```sql
CREATE TABLE client_notification_preferences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT NOT NULL,
  category ENUM('sends','balance') NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  delivery_channel ENUM('email','in_app','both') NOT NULL DEFAULT 'in_app',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uniq_client_notification_preference (client_id, category)
);
```

- Do not seed rows for existing clients.
- Return `enabled = true`, `delivery_channel = 'in_app'` defaults from backend code when rows are missing.
- Create rows only when the main user saves preferences.
- Do not read `clients_configurations` during migration or runtime.
- Make `client_notification_preferences` the exclusive runtime source of truth after migration.
- Do not write notification channels or enabled state back to `clients_configurations`.
- Do not implement runtime fallback reads from `clients_configurations`.
- Do not store notification preferences as JSON.
- Make migration idempotent.

## Preference API

| Method | Path | Result |
|---|---|---|
| `GET` | `/notification-preferences` | authenticated account preferences |
| `PUT` | `/notification-preferences` | atomically replace both categories |

```ts
type NotificationCategory = 'sends' | 'balance'
type NotificationDeliveryChannel = 'email' | 'in_app' | 'both'

type NotificationPreference = {
  category: NotificationCategory
  enabled: boolean
  deliveryChannel: NotificationDeliveryChannel
}

type NotificationPreferencesResponse = {
  preferences: [NotificationPreference, NotificationPreference]
}
```

- Derive `userId` and `clientId` exclusively from auth context.
- Load the authenticated user and require `main_user = 1`, `active = 1`, and matching `clients_id`.
- Return `403 NOTIFICATION_PREFERENCES_FORBIDDEN` for secondary users.
- Require exactly one `sends` and one `balance` item on PUT.
- Reject duplicates, missing categories, unknown categories, and unknown channels with `400 VALIDATION_ERROR`.
- Upsert by `(client_id, category)`.
- Return defaults for missing rows without mutating on GET.
- Read and write only `client_notification_preferences` in API and dispatcher runtime paths.

## Account-scoped Inbox

- Preserve existing list, unread count, mark read, mark all read, delete, and clear behavior scoped by `client_id`.
- Preserve shared read and deleted state for all users in the account.
- Do not require `user_id` on `client_notifications`.

## Delivery Core

Create a single notification dispatcher.

```ts
type DispatchUserNotificationInput = {
  clientId: number
  category: 'sends' | 'balance'
  type: string
  severity: 'info' | 'warning' | 'danger'
  title: string
  message: string
  actionLabel?: string | null
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
  eventKey: string
}
```

- Load the account preference and active main user for `clientId`.
- Skip delivery when the category is disabled.
- `in_app`: create one account-scoped `client_notifications` row with `user_id = NULL`.
- `email`: send only to the active main user's normalized `users.email` through `src/infra/email/send-email.ts`.
- `both`: execute both deliveries independently.
- Render email through `renderEmailTemplate`; include title, escaped message, and optional escaped action URL.
- Never send email when `EMAIL_ENABLED = false`; preserve current transport behavior.
- Isolate channel failures with `Promise.allSettled`; one channel failure must not block the other.
- Log client, main user, category, type, event key, channel, and sanitized error; do not log message body or email address.
- Add idempotent delivery persistence keyed by `(event_key, channel)`; retry failed deliveries and never duplicate successful deliveries.
- Do not let notification delivery roll back the originating business transaction.

## Tests

- Cover missing-row defaults without persistence, exact PUT category validation, main-user authorization, and cross-tenant isolation.
- Assert runtime GET, PUT, and dispatch paths never read or write `clients_configurations`.
- Cover preserved account-scoped inbox behavior.
- Cover disabled, email-only, in-app-only, and both channel routing.
- Cover SES-disabled behavior, HTML escaping, channel failure isolation, main-user email resolution, and idempotent retries.
- Cover existing account-scoped notification route regressions.
