---
id: account-user-management-middleware-contracts
title: Expose account user management through middleware contracts
scope: account-user-management
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware:docs/contracts-and-routes/README.md
depends_on:
  - account-user-management-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4798009959
github_issue_number: 74
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/74
github_issue_node_id: I_kwDOR6h3H88AAAABHfvSZw
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/74
github_project_item_id: 207988719
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxlp-8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207988719"
github_project_status: Done
---

## Routes

Register session-authenticated `NEW_BACKEND_URL` routes without payload transformation.

| Method | Public path | Target path |
|---|---|---|
| `GET` | `/users` | `/users` |
| `GET` | `/users/:userId` | `/users/:userId` |
| `POST` | `/users` | `/users` |
| `PATCH` | `/users/:userId` | `/users/:userId` |
| `PATCH` | `/users/:userId/status` | `/users/:userId/status` |
| `DELETE` | `/users/:userId` | `/users/:userId` |

## Zod Contracts

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

type CreateAccountUserInput = {
  name: string
  email: string
  canDownloadLists: boolean
}

type UpdateAccountUserInput = {
  name: string
  canDownloadLists: boolean
}

type UpdateAccountUserStatusInput = {
  active: boolean
}

type CurrentUserOutput = {
  name: string | null
  email: string | null
  mainUser: boolean
  canManageAccountUsers: boolean
}
```

- Define strict input schemas.
- Define output schemas for list, detail, create, update, status update, deletion, and structured errors.
- Represent list limits as `{ activeUsers: integer >= 0, maximumActiveUsers: z.literal(10) }`.
- Validate `userId` as a positive integer path parameter.
- Extend the `GET /users/me` output contract with `mainUser` and `canManageAccountUsers`.
- Preserve existing `GET /users/me` fields and authentication route contracts.
- Do not forward tenant, profile, main-user, active-on-create, or password-hash fields.

## Tests And Documentation

- Add registry/route-contract coverage for all methods, paths, auth strategy, backend target, input schemas, and output schemas.
- Cover invalid body and path parameters.
- Cover `204` deletion response.
- Cover the additive `GET /users/me` capability fields.
- Regenerate OpenAPI artifacts.
- Document route ownership, session requirement, error codes, and exact request/response shapes.
- Proxy strict authenticated `/users/me/password` and `/users/me/phone-change/*` contracts.
