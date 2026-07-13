---
id: platform-front-opaque-session-login-logout
title: Keep Public ID Contract with Opaque Session Login and Logout
scope: platform-auth-session-migration
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - platform-front:docs/features/authentication.md
  - platform-front:docs/features/README.md
depends_on:
  - middleware-opaque-session-auth-contract
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4764036076
github_issue_number: 117
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/117
github_issue_node_id: I_kwDORqaAXc8AAAABG_Vr7A
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/117
github_project_item_id: 205889112
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxFnlg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205889112"
github_project_status: Done
---

## Ownership

| Area | Required change |
|---|---|
| `src/service/auth` | Keep `publicId` storage naming, accept the new opaque value, and add logout calls. |
| `src/service/api.ts` | Keep sending `public-id` and handle revoked/expired sessions. |
| `src/pages/Auth/Login` | Keep `/users/login-spa` and preserve existing localized feedback. |
| `src/components/UserUnitsDropdown` | Call backend logout before clearing local state. |
| `src/routes/route-guards.tsx` | Use opaque-session presence for client navigation only. |
| tests | Add storage, interceptor, login, logout, and failure behavior coverage. |

## Storage Contract

```ts
type StoredAuthSession = {
  publicId: string;
  login: string;
};
```

- Preserve the existing `liguelead:auth` storage shape.
- Treat missing or malformed `publicId` storage as unauthenticated.
- Never store the password.
- Never put the public-id token in URLs, analytics, alerts, logs, query cache keys, or error messages.
- Keep storage behind the auth-storage module; do not read localStorage directly from pages/components.

## Login

- Submit `{ login: trimmedEmail, password }` to `POST /users/login-spa`.
- Extract and persist `data.public_id` through the existing `publicId` storage field.
- Redirect successful login to the originally requested protected route when available; otherwise use the existing default authenticated route.
- Preserve localized `400`, `401`, `403`, `429`, and fallback feedback.
- Clear the password field after failed login.
- Prevent duplicate submissions while pending.

## Authenticated Requests

- Keep sending the opaque token through the `public-id` request header.
- On `401 INVALID_SESSION`, clear local auth state and redirect to `/auth/login`.
- Avoid redirect loops when login itself returns `401 INVALID_CREDENTIALS`.
- Preserve the existing `403 PHONE_NOT_VERIFIED` redirect behavior.
- Route guards must remain a UX optimization; backend validation remains authoritative.

## Logout

- On normal logout, call `POST /auth/logout` with the current `public-id` header.
- Clear local auth state in `finally` and redirect to `/auth/login` even when logout returns a network error or `401`.
- Add an auth-service operation for `POST /auth/logout-all`; do not add UI unless an existing account/security surface has an appropriate action.
- Prevent duplicate logout actions while pending.
- Do not use redirect-based logout or cookie sessions.
- Keep public-id extraction, types, helpers, and storage naming.

## Validation

- Test valid login persistence and redirect.
- Test invalid response rejection.
- Test `public-id` header injection.
- Test login `401` does not cause a redirect loop.
- Test API session `401` clears storage and redirects.
- Test normal logout calls the backend and clears storage.
- Test network-failed logout still clears storage.
- Test phone-verification redirect remains functional.
