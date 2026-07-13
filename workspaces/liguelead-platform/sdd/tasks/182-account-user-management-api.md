---
id: account-user-management-api
title: Implement tenant-safe account user management API
scope: account-user-management
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/users.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4798008222
github_issue_number: 100
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/100
github_issue_node_id: I_kwDORpoJ688AAAABHfvLng
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/100
github_project_item_id: 207988612
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxlp4Q
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207988612"
github_project_status: Done
---

## Routes

| Method | Path | Actor | Result |
|---|---|---|---|
| `GET` | `/users` | active main user | list account users |
| `GET` | `/users/:userId` | active main user | get one account user |
| `POST` | `/users` | active main user | create secondary account user and send password setup email |
| `PATCH` | `/users/:userId` | active main user | update mutable user fields |
| `PATCH` | `/users/:userId/status` | active main user | activate or deactivate secondary user |
| `DELETE` | `/users/:userId` | active main user | delete secondary user |

## Authorization

- Derive `actorUserId` and `clientId` exclusively from authenticated request context.
- Load actor from `users`; require `main_user = 1`, `active = 1`, and matching `clients_id`.
- Scope every target read and mutation by both `users.id = :userId` and `users.clients_id = :clientId`.
- Reject management of any `main_user = 1` target.
- Return `403 ACCOUNT_USER_MANAGEMENT_FORBIDDEN` for a non-main actor.
- Return `404 ACCOUNT_USER_NOT_FOUND` for an absent or cross-tenant target.
- Do not accept `clientsId`, `profilesId`, `mainUser`, `active`, or password hashes from request bodies.

## Contracts

```ts
type AccountUser = {
  id: number
  name: string
  email: string
  active: boolean
  mainUser: boolean
  canDownloadLists: boolean
  createdAt: string | null
  updatedAt: string | null
}

type CreateAccountUserRequest = {
  name: string
  email: string
  canDownloadLists: boolean
}

type UpdateAccountUserRequest = {
  name: string
  canDownloadLists: boolean
}

type UpdateAccountUserStatusRequest = {
  active: boolean
}

type AccountUserListResponse = {
  data: AccountUser[]
  limits: {
    activeUsers: number
    maximumActiveUsers: 10
  }
}

type CurrentUserResponse = {
  name: string | null
  email: string | null
  mainUser: boolean
  canManageAccountUsers: boolean
}
```

## Persistence

- Use legacy `users` columns: `id`, `profiles_id`, `clients_id`, `name`, `email`, `password`, `active`, `main_user`, `download_list`, `created_at`, `updated_at`.
- Create users with `profiles_id = 3`, authenticated `clients_id`, `main_user = 0`, `active = 1`, normalized lowercase trimmed email, and `download_list` mapped from `canDownloadLists`.
- Keep email immutable after creation.
- Enforce global case-insensitive email uniqueness.
- Return `409 ACCOUNT_USER_EMAIL_ALREADY_EXISTS` on duplicate email.
- Count all active users for the account, including the main user.
- Set the active-user limit to the constant `10`.
- Do not query `plans`, `functionalities`, or `plan_functionalities` for user limits.
- Reject creation and inactive-to-active transitions at the limit with `409 ACCOUNT_USER_LIMIT_REACHED`.
- Do not apply the limit to updates, deactivation, or deletion.
- Execute user creation and password setup token creation atomically.
- Reuse the current password recovery token hashing, expiration, invalidation, URL, and email delivery infrastructure.
- Send password setup email after commit; record delivery failure without deleting the created user or exposing internal mail errors.
- Invalidate `auth_session_context:{userId}` cache and revoke all sessions after deactivation or deletion.

## Validation

| Field | Rule | Error |
|---|---|---|
| `name` | trimmed, 2-100 characters | `400 VALIDATION_ERROR` |
| `email` | valid email, normalized, maximum 255 characters | `400 VALIDATION_ERROR` |
| `canDownloadLists` | boolean | `400 VALIDATION_ERROR` |
| `active` | boolean | `400 VALIDATION_ERROR` |

## Response Rules

- Return `201` for creation.
- Return `200` for reads and updates.
- Return `204` for deletion.
- Never return `password`, `password_hash`, recovery token hashes, `profiles_id`, or unrelated legacy user fields.
- Extend `GET /users/me` with `mainUser` and `canManageAccountUsers`.
- Set `canManageAccountUsers = mainUser`.
- Preserve existing `GET /users/me` fields and behavior.

## Tests

- Cover main-user authorization and secondary-user denial.
- Cover same-tenant reads and every cross-tenant mutation attempt.
- Cover main-user mutation rejection.
- Cover global normalized email uniqueness.
- Cover the fixed active-user limit of `10` for create and activation.
- Assert that user-management flows never query plan-functionality tables.
- Cover deactivation session revocation and auth-context cache invalidation.
- Cover password setup token creation and email dispatch integration.
- Cover response field allowlists and additive `GET /users/me` capability fields.

## Account Security

- Add authenticated `PATCH /users/me/password` with current-password verification.
- Add main-user-only `POST /users/me/phone-change/request` and `/confirm`.
- Persist a new primary phone only after SMS confirmation.
- Reuse `sms_verification_tokens`; isolate account verification and phone change with `purpose`.
- Reject verified primary-phone changes through generic client registration.
