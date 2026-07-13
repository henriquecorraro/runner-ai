---
id: account-user-management-frontend
title: Build account user management page
scope: account-user-management
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/account-user-management.md
depends_on:
  - account-user-management-middleware-contracts
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4798012981
github_issue_number: 126
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/126
github_issue_node_id: I_kwDORqaAXc8AAAABHfveNQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/126
github_project_item_id: 207988870
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxlqIY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207988870"
github_project_status: Done
---

## Navigation And Route

- Add the single authenticated settings route `/settings`.
- Build one settings page composed of independent sections.
- Add the `Users` section to the settings page.
- Render a distinct duotone icon beside each settings section title.
- Use a shield-check icon for two-factor authentication, a ringing-bell icon for notifications, and a users icon for account users.
- Use the shared system page-title and header-card pattern.
- Render a larger duotone gear icon beside the localized settings page title.
- Add a `My data` header action for the main user.
- Open the existing client registration editor in a modal without leaving `/settings`.
- Render client-registration loading, retry, cancel, and success-close states inside the modal.
- Permit client-data mutation only after an explicit click on the final address-step submit button.
- Ignore form submit events emitted while navigating earlier stepper stages.
- Add a full-width settings action with a duotone gear icon and localized label below the balance section.
- Replace the dropdown trigger with a circular initials avatar.
- Render a larger initials avatar, user name, and email in the dropdown header.
- Do not render a plan tag in the user dropdown.
- Use the platform light theme, compact white surface, rounded border, integrated balance section, and isolated logout footer.
- Render the dropdown settings action for every authenticated user.
- Rotate the icon slowly during hover and disable motion under `prefers-reduced-motion`.
- Navigate the dropdown settings action to `/settings`.
- Remove the authenticated language selector from the global header.
- Render the current-language flag and native label below the balance section.
- Expand an inline submenu containing only the other supported languages.
- Change the active i18n language without closing the user dropdown.
- Keep the standalone language selector in authentication layouts.
- Render the balance section below the identity header without a nested border, background card, or uppercase heading.
- Do not render a separator border before logout.
- Render a duotone sign-out icon beside the localized logout label.
- Reuse the product duotone icons and color themes for voice, SMS, and SMS Flash balance rows.
- Localize the settings label, balance heading, product labels, and number formatting for `pt-BR`, `en`, and `es-ES`.
- Do not render the settings action in the dropdown footer or global header.
- Do not add settings or users entries to the sidebar.
- Allow every authenticated user to open `/settings`.
- Render `Change password` for main and secondary users.
- Render client data, phone change, notification preferences, and account-user management only for the main user.
- Add the settings navigation-trail label.

## Service Layer

Implement typed service functions and TanStack Query hooks for:

| Operation | Method | Path |
|---|---|---|
| list | `GET` | `/users` |
| detail | `GET` | `/users/:userId` |
| create | `POST` | `/users` |
| update | `PATCH` | `/users/:userId` |
| status | `PATCH` | `/users/:userId/status` |
| delete | `DELETE` | `/users/:userId` |

- Use centralized query keys.
- Invalidate the list after create, update, status change, or deletion.
- Map structured API error codes to localized feedback.

## Page

- Build a responsive account-user table using existing design-system components.
- Render columns: name, email, main/secondary account role, list-download permission, status, actions.
- Render active-user usage as `activeUsers / 10`.
- Disable `Add user` and inactive-user activation controls when the active-user limit is reached.
- Keep main-user rows visible and non-actionable.
- Provide loading, empty, error, and forbidden states.

## Create And Edit

```ts
type AccountUserFormValues = {
  name: string
  email: string
  canDownloadLists: boolean
}
```

- Use one accessible modal or drawer for create and edit.
- Require trimmed name with 2-100 characters.
- Require valid email with maximum 255 characters on create.
- Disable email editing for existing users.
- Label `canDownloadLists` as permission to download lead lists and reports.
- Explain that a new user receives an email to define the password.
- Prevent duplicate submissions.
- Close on success and show existing global success/error alert feedback.

## Status And Delete

- Require confirmation before deactivation, activation, and deletion.
- State that deactivation ends active sessions.
- State that deletion permanently removes the user.
- Preserve row state while mutations execute.
- Handle `ACCOUNT_USER_LIMIT_REACHED`, `ACCOUNT_USER_EMAIL_ALREADY_EXISTS`, `ACCOUNT_USER_NOT_FOUND`, and `ACCOUNT_USER_MANAGEMENT_FORBIDDEN` without generic-only messaging.

## Localization And Documentation

- Add `pt-BR`, `en`, and `es-ES` namespace resources.
- Add dropdown, settings-section, `My data`, navigation-trail, table, form, confirmation, fixed-limit, empty-state, and error strings.
- Do not add sidebar localization entries.
- Document route, dropdown entry, settings sections, client-data editor link, API contracts, permission model, fixed 10-active-user limit, password setup flow, and user-facing states.

## Tests

- Cover table rendering and main-user action suppression.
- Cover gear-item visibility for main and secondary users.
- Cover authenticated `/settings` access for main and secondary users.
- Cover main-user-only administrative sections and secondary-user password action.
- Cover the standard header and main-user-only `My data` action.
- Cover absence of a sidebar entry.
- Cover create and edit payloads.
- Cover limit-driven create and activation disabling.
- Cover status and delete confirmations.
- Cover cache invalidation and structured-error feedback.
- Cover forbidden and fixed-limit states.

## Account Security

- Add `Change password` to the settings header.
- Add main-user-only `Change phone` with request-code and confirm-code states.
- Apply the `(00) 00000-0000` mask while entering the new phone; send digits only.
- Render the primary phone as read-only in `My data`.
