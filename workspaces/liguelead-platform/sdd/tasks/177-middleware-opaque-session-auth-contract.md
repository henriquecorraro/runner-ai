---
id: middleware-opaque-session-auth-contract
title: Expose Platform Opaque Session Authentication Through Middleware
scope: platform-auth-session-migration
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
docs_targets:
  - middleware:docs/context/README.md
  - middleware:docs/contracts-and-routes/README.md
  - middleware:docs/operations/README.md
depends_on:
  - platform-api-opaque-session-login-logout
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4764035121
github_issue_number: 67
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/67
github_issue_node_id: I_kwDOR6h3H88AAAABG_VoMQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/67
github_project_item_id: 205889058
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxFniI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205889058"
github_project_status: Done
---

## Ownership

| Area | Required change |
|---|---|
| `src/domains/users` or `src/domains/auth` | Route login and logout endpoints to `NEW_BACKEND_URL`. |
| `src/contracts/types.ts` | Replace session validation internals while preserving the external `public-id` contract. |
| `src/handler/helpers/auth.ts` | Validate opaque public-id sessions against the shared Redis contract. |
| `src/config` | Add validated Redis key/TTL assumptions only when required. |
| `src/tests` | Add routing, auth, header sanitization, and revocation tests. |
| `docs/public-api` | Regenerate OpenAPI artifacts. |

## Route Contract

| Method | Public path | Target path | Auth | Target |
|---|---|---|---|---|
| `POST` | `/users/login-spa` | `/auth/login` | public | `NEW_BACKEND_URL` |
| `POST` | `/auth/logout` | `/auth/logout` | platform session | `NEW_BACKEND_URL` |
| `POST` | `/auth/logout-all` | `/auth/logout-all` | platform session | `NEW_BACKEND_URL` |

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

## Authentication Strategy

- Read the opaque token from the existing `public-id` header.
- Reject missing or blank `public-id` with the existing middleware `401` envelope and code `INVALID_SESSION`.
- Compute `sha256(publicId)`.
- Read `platform:auth:sessions:{digest}` from Redis.
- Parse and validate `AuthSessionRecord.version`, `userId`, `clientId`, and `expiresAt`.
- Reject missing, malformed, revoked, or expired records with `401 INVALID_SESSION`.
- Remove any caller-provided `user-id` before authentication.
- Inject `user-id` from the validated Redis session record.
- Forward `public-id` to `platform-api` for current-session logout revocation; the API must not treat it as authentication.
- Never accept caller-provided `user-id` as authentication.
- Never log raw public-id tokens or raw Redis session records.
- Mask public-id values in diagnostics.
- Return `503 AUTH_SESSION_UNAVAILABLE` when Redis validation is unavailable.

## Authentication Boundary

- Preserve the existing external strategy name and `public-id` header contract.
- Replace public-id decryption and `ci3:logged_users` lookup with hashed opaque-session lookup.
- Keep every currently authenticated route using the session strategy without route-level contract churn.
- Keep `public-id` in CORS and OpenAPI authentication contracts.
- Keep explicitly public callbacks and health routes unchanged.
- Keep service-to-service `internal-token` auth unchanged.
- Do not read CI3 session keys.

## Proxy Safety

- Redact `public-id`, `authorization`, `cookie`, login password, and session material from logs.
- Preserve API `400`, `401`, `403`, `429`, and `503` status/code envelopes.
- Do not forward cookies from `/auth/login` as the session mechanism.
- Preserve CORS support for the `public-id` header.

## Validation

- Test login proxy request and response schemas.
- Test valid opaque `public-id` proxying.
- Test missing, malformed, expired, revoked, and malformed-Redis sessions.
- Test Redis failure response.
- Test forged `user-id` rejection.
- Test trusted `user-id` injection and `public-id` forwarding to `platform-api`.
- Test token redaction.
- Test existing internal-token routes remain functional.
- Test old deterministic/encrypted public-id values no longer authenticate without an opaque Redis session.
- Regenerate and verify OpenAPI authentication documentation.
