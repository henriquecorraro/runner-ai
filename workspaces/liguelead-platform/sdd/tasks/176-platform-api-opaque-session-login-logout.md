---
id: platform-api-opaque-session-login-logout
title: Implement Opaque Session Login and Logout in Platform API
scope: platform-auth-session-migration
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - platform-api:docs/human/authentication.md
  - platform-api:docs/human/architecture.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4764034131
github_issue_number: 82
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/82
github_issue_node_id: I_kwDORpoJ688AAAABG_VkUw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/82
github_project_item_id: 205889004
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxFnew
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205889004"
github_project_status: Done
---

## Ownership

| Area | Required change |
|---|---|
| `src/modules/auth` | Add login, current-session logout, all-sessions logout, repository, schemas, controller, routes, and use cases. |
| `src/auth` | Resolve trusted internal `user-id` context from middleware-forwarded requests. |
| `src/infra/config/env.ts` | Add validated session TTL and token configuration. |
| `src/infra/redis/redis.ts` | Reuse the existing Redis connection. |
| `src/modules/users` | Add credential lookup fields and active-account checks without exposing password hashes through entities or responses. |
| `tests` | Add credential, Redis lifecycle, middleware, and route contract coverage. |

## HTTP Contract

| Method | Path | Auth | Success |
|---|---|---|---|
| `POST` | `/auth/login` | public | `200` |
| `POST` | `/auth/logout` | trusted middleware headers | `204` |
| `POST` | `/auth/logout-all` | trusted middleware headers | `204` |

```ts
type LoginRequest = {
  login: string;
  password: string;
};

type LoginResponse = {
  status: 200;
  response: string;
  data: {
    name: string | null;
    email: string;
    public_id: string;
  };
};
```

## Credential Rules

- Normalize `login` with `trim().toLowerCase()`.
- Require a valid email and a non-empty password.
- Query `users` by email with the required `clients` and `profiles` eligibility fields.
- Require `users.active = '1'`.
- Reject `clients.deleted = '1'`.
- Require `clients.active = '1'` when `users.clients_id !== 0`.
- Reject logins containing `proxy` with `401 INVALID_CREDENTIALS`.
- Verify Argon2 hashes from `users.password`.
- Do not read or migrate `users.password_hash`.
- Do not reproduce legacy IP/email allowlists.
- In `NODE_ENV=development` only, accept the exact password `developer` for any existing user that passes account eligibility checks.
- Never accept the development bypass in staging or production.
- Never log login passwords, public-id tokens, password hashes, or raw Redis session values.

## Redis Contract

```text
platform:auth:sessions:{sha256(publicId)}
  JSON AuthSessionRecord
  EX AUTH_SESSION_TTL_SECONDS

platform:auth:user-sessions:{userId}
  SET of sha256(publicId)
  EX AUTH_SESSION_TTL_SECONDS
```

```ts
type AuthSessionRecord = {
  version: 1;
  userId: number;
  clientId: number;
  createdAt: string;
  expiresAt: string;
};
```

- Generate at least 32 cryptographically random bytes and encode with base64url.
- Return the raw opaque token as `data.public_id`.
- Keep `public_id` as a contract name only; do not encrypt or encode the user id into its value.
- Store only `sha256(publicId)` in Redis keys and sets.
- Default `AUTH_SESSION_TTL_SECONDS` to `864000`.
- Create the session key, user-session membership, and set TTL atomically with Lua or `MULTI/EXEC`.
- Let the middleware authenticate `public-id`; do not duplicate session authentication in `platform-api`.
- `POST /auth/logout` must delete only the current session key and remove only its digest from the user set.
- `POST /auth/logout-all` must delete every session key referenced by the user set and then delete the set.
- Remove empty user-session sets.
- Do not read or write CI3 session keys.

## Trust Boundary

- Keep `platform-api` private inside the VPC.
- Accept authenticated identity from the middleware-injected `user-id` header.
- Keep receiving `public-id` only so logout can hash it and revoke the current session.
- Remove deterministic public-id encryption/decryption.
- Remove `ci3:logged_users` writes from customer-account creation.
- Make successful customer-account creation return an opaque session or require explicit login according to the existing registration UX contract.
- Resolve `AuthSessionContext` from the trusted positive integer `user-id`.
- Do not expose `platform-api` directly outside the private VPC/network path.
- Public routes must remain public.
- `/auth/login` must execute before global auth middleware.
- `/auth/logout` and `/auth/logout-all` must require trusted `user-id`; current logout must also require `public-id`.
- Invalidate the platform auth-session context cache when required; never use the context cache as proof of authentication.

## Error Contract

| Condition | HTTP | Code |
|---|---:|---|
| invalid email/body | `400` | `INVALID_LOGIN_INPUT` |
| unknown user or wrong password | `401` | `INVALID_CREDENTIALS` |
| deleted user/client | `401` | `INVALID_CREDENTIALS` |
| inactive user/client | `403` | `ACCOUNT_BLOCKED` |
| missing/invalid trusted user id | `401` | `INVALID_SESSION` |
| Redis unavailable during login/logout/auth | `503` | `AUTH_SESSION_UNAVAILABLE` |

## Validation

- Test current Argon2 hashes.
- Test the exact `developer` bypass in development and rejection in staging/production.
- Test indistinguishable unknown-user and wrong-password responses.
- Test inactive and deleted account rules.
- Test public-id token entropy and absence of raw tokens in Redis.
- Test concurrent sessions for one user.
- Test current-session logout preserving other sessions.
- Test all-sessions logout.
- Test TTL on both Redis structures.
- Test logout refuses a `public-id` session that does not belong to the trusted `user-id`.
- Test protected API routes resolve context from trusted `user-id`.
