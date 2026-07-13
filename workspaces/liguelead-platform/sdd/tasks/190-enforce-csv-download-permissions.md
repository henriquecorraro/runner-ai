---
id: enforce-csv-download-permissions
title: Enforce CSV download permissions
scope: account-user-management
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-api:docs/human/modules/users.md
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/modules/lead-lists.md
  - middleware:docs/
  - platform-front:docs/features/account-user-management.md
  - platform-front:docs/features/broadcasts.md
depends_on:
  - account-user-management-api
  - account-user-management-middleware-contracts
  - account-user-management-frontend
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4804761338
github_issue_number: 103
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/103
github_issue_node_id: I_kwDORpoJ688AAAABHmLW-g
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/103
  - https://github.com/ligue-lead-tech/middleware/issues/76
  - https://github.com/ligue-lead-tech/platform-front/issues/129
github_project_item_id: 208388019
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxrv7M
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208388019"
github_project_status: Done
---

## Authorization

- Allow CSV downloads when the authenticated user satisfies `mainUser = true OR canDownloadLists = true`.
- Return HTTP `403` with code `DOWNLOAD_PERMISSION_REQUIRED` otherwise.
- Enforce authorization before loading S3 objects.
- Do not rely on frontend visibility for security.

## Protected Routes

| Route | Resource |
|---|---|
| `GET /broadcasts/schedules/:id/report/download` | Broadcast report CSV |
| `GET /lead-lists/uploads/:fileId/download` | Lead-list upload CSV |

## Session

```typescript
type AuthSessionContext = {
  userId: number
  clientId: number
  planId: number | null
  phoneVerifiedAt: string | null
  mainUser: boolean
  canDownloadLists: boolean
}
```

- Populate both permission fields from the active `users` row.
- Reject cached auth contexts missing either permission field and refresh them.
- Keep `mainUser` authorized regardless of the legacy `download_list` value.
- Invalidate the edited account user's auth-context cache after permission changes.

## Profile Contract

- Add effective `canDownloadLists` to `GET /users/me` in API, middleware, and frontend types.
- Return `true` for every main user.

## Frontend

- Hide or disable broadcast report and upload CSV download actions when `canDownloadLists = false`.
- Keep backend `403` handling as the final authority.

## Tests

- Cover main user with `download_list = 0` allowed.
- Cover secondary user with `download_list = 1` allowed.
- Cover secondary user with `download_list = 0` denied before file access.
- Cover auth-context cache parsing and profile effective permission.
- Cover middleware contract and frontend build.
