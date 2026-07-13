---
id: email-two-factor-authentication-middleware-contracts
title: Expose email two-factor authentication contracts
scope: account-security
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware:docs/authentication.md
depends_on:
  - email-two-factor-authentication-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4807407060
github_issue_number: 78
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/78
github_issue_node_id: I_kwDOR6h3H88AAAABHos11A
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/78
github_project_item_id: 208529555
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxt6JM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208529555"
github_project_status: Done
---

## Routes

| Method | Public path | Backend path | Auth |
|---|---|---|---|
| `GET` | `/users/me/two-factor` | same | session |
| `PATCH` | `/users/me/two-factor` | same | session |
| `POST` | `/auth/two-factor/confirm` | same | public |
| `POST` | `/auth/two-factor/resend` | same | public |

- Extend `/users/login-spa` output with the two-factor-required response union.
- Preserve the existing successful login output.

## Schemas

```ts
type TwoFactorPreference = {
  enabled: boolean
  channel: "email"
  email: string
}

type UpdateTwoFactorPreferenceBody = {
  enabled: boolean
}

type TwoFactorRequiredLogin = {
  status: 202
  response: string
  data: {
    requiresTwoFactor: true
    challengeId: string
    maskedEmail: string
    expiresInSeconds: number
  }
}

type ConfirmTwoFactorBody = {
  challengeId: string
  code: string
}

type ResendTwoFactorBody = {
  challengeId: string
}
```

- Require six numeric digits for `code`.
- Require non-empty challenge ids with maximum 256 characters.
- Forward structured backend errors unchanged.
- Regenerate OpenAPI artifacts.

## Tests

- Cover login response union validation.
- Cover session-protected preference routes.
- Cover public confirm and resend routes.
- Cover invalid challenge/code request schemas.
