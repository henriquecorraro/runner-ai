---
id: notification-preferences-middleware-contracts
title: Expose account notification preference contracts
scope: user-notification-preferences
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
  - user-notification-preferences-and-delivery-core
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4798725326
github_issue_number: 75
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/75
github_issue_node_id: I_kwDOR6h3H88AAAABHga8zg
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/75
github_project_item_id: 208030459
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxmSvs
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208030459"
github_project_status: Done
---

## Routes

Register session-authenticated `NEW_BACKEND_URL` routes without transformation.

| Method | Path |
|---|---|
| `GET` | `/notification-preferences` |
| `PUT` | `/notification-preferences` |

Preserve existing `/notifications` routes and aliases.

## Contracts

```ts
type NotificationPreference = {
  category: 'sends' | 'balance'
  enabled: boolean
  deliveryChannel: 'email' | 'in_app' | 'both'
}

type NotificationPreferencesResponse = {
  preferences: NotificationPreference[]
}
```

- Define strict request and response Zod schemas.
- Require session auth for both routes.
- Require PUT body `{ preferences: [...] }`.
- Require exactly two items, one per category.
- Reject tenant IDs, user IDs, email addresses, and unknown fields.
- Keep existing inbox response contracts unchanged.

## Tests And Documentation

- Cover route resolution, `NEW_BACKEND_URL`, session auth, valid channel enumeration, missing/duplicate categories, unknown fields, and output validation.
- Regenerate `docs/public-api/openapi.json`.
- Document main-user authorization, account ownership, category mapping, enabled behavior, channel semantics, and structured errors.
