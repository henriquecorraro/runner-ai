---
id: notification-preferences-settings-ui
title: Add account notification channels to main-user settings
scope: user-notification-preferences
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/notification-preferences.md
  - platform-front:docs/features/account-user-management.md
depends_on:
  - notification-preferences-middleware-contracts
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4798727005
github_issue_number: 127
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/127
github_issue_node_id: I_kwDORqaAXc8AAAABHgbDXQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/127
github_project_item_id: 208030536
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxmS0g
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208030536"
github_project_status: Done
---

## Settings Access

- Keep the single authenticated route `/settings`.
- Keep the gear `Settings` dropdown action exclusive to `mainUser = true`.
- Keep `/settings` guarded by `canManageAccountUsers = true`.
- Render notification, `My data`, and account-user management sections only for the main user.
- Do not expose preference queries or mutations to secondary users.

## Service Layer

| Operation | Method | Path |
|---|---|---|
| load preferences | `GET` | `/notification-preferences` |
| save preferences | `PUT` | `/notification-preferences` |

- Add typed service functions, centralized query key, query hook, and mutation hook.
- Seed form state from server data.
- Update query cache from mutation response.
- Prevent concurrent duplicate saves.

## Notification Section

Render one settings card titled `Notifications`.

| Category | Label | Description |
|---|---|---|
| `sends` | `Sends` | send completion and failure updates |
| `balance` | `Balance` | credit, balance, and automatic recharge updates |

Render categories as two independent responsive cards in a two-column desktop layout and one-column mobile layout.

For each category render:

- enabled checkbox matching the automatic-recharge product selector control;
- delivery-channel radio group or segmented control;
- `Email`, `In platform`, `Email and platform` options;
- disabled channel control when category is disabled;
- current saved value after reload.

- Use one explicit `Save notification preferences` action for the section.
- Disable save when unchanged, invalid, or pending.
- Show global success/error feedback.
- Preserve unsaved form values after a failed save.
- Place section titles inside borderless section wrappers.
- Use the Design System `PageWrapper` with explicit padding for notification and user sections.
- Use the Design System `Table` for account users; do not render a raw HTML table.
- Use the existing system header/card spacing and responsive layout.
- Add loading, retry, and unavailable states without hiding other settings sections.

## Localization

- Add `pt-BR`, `en`, and `es-ES` labels for section, categories, descriptions, enabled state, channels, save action, success, load error, and save error.

## Tests

- Cover main-user settings access and secondary-user redirect.
- Cover main-only visibility of notifications, `My data`, and user management.
- Cover preference hydration, enable/disable behavior, all three channels, unchanged save disabling, PUT payload, cache update, pending state, retry, and failure state.
- Cover absence of sidebar entries.
