---
id: middleware-internal-redis-token-auth
title: Add Middleware Internal Redis Token Authentication
scope: middleware-auth
status: done
repositories:
  - middleware
validation:
  - middleware: npm run build
  - middleware: npm test
  - middleware: npm run docs:openapi
docs_targets:
  - middleware/docs
  - middleware/docs/public-api
---

Add a new middleware authentication strategy for internal service-to-service calls that use exposed HTTP endpoints but must not rely on end-user session authentication.

Current context:
- The middleware currently supports `session` and `header` auth strategies in `src/contracts/types.ts` and `src/handler/helpers/auth.ts`.
- `session` validates `public-id` through Redis logged-user state and injects `user-id`.
- `header` forwards a caller-provided header value to the backend without validating it against Redis.
- Routes declare auth per endpoint through `RouteDefinition.auth`.

Required behavior:
- Introduce a new internal authentication strategy for routes intended to be called by trusted internal tools/services through public middleware endpoints.
- Internal callers must send a configured token header, for example `x-internal-token` unless implementation chooses a better project convention.
- The middleware must validate the received token against Redis before proxying or running the route.
- Redis storage must support daily token rotation while allowing the previous token to remain valid for a short grace period after rotation.
- The implementation must document the exact Redis key contract so token publishers and internal services can use the same source of truth.
- The strategy must reject missing or unknown tokens with the existing `401` middleware auth shape.
- The token must not be logged in plain text; use the existing masking conventions where auth values are surfaced in diagnostics.

Rotation requirements:
- Support an active token and at least one previous token during a configurable grace window.
- Prefer a design where the rotation writer can atomically publish the new active token and keep the previous token alive with a TTL, or otherwise make the race behavior explicit in docs.
- Middleware validation must accept both the active token and still-live previous token during the grace window.
- After the grace TTL expires, the previous token must no longer authenticate.
- The grace window should be configurable via environment variable with a conservative default documented in operations docs.

Implementation notes:
- Extend the `RouteAuth` union with a dedicated internal Redis token strategy rather than overloading `header`.
- Keep the route-level declaration explicit so only selected endpoints can use this internal auth.
- Reuse `src/config/redis.ts`/`connectRedis()` instead of creating a separate Redis client.
- Use constant-time comparison where practical after reading candidate token values from Redis.
- Decide whether the backend should receive no internal token header, the original token header, or a sanitized internal identity header; document and test that forwarding behavior.
- Update generated OpenAPI docs when route auth descriptions or route catalogs change.

Acceptance criteria:
- A route can declare the new internal Redis token auth strategy in `RouteDefinition.auth`.
- Requests with the active Redis token are accepted.
- Requests with the previous Redis token are accepted only while its Redis TTL/grace window is still valid.
- Missing, expired, or invalid internal tokens are rejected with `401`.
- Existing `session` and `header` auth behavior remains unchanged.
- Unit or route-contract tests cover active token, previous-token grace, expired/missing token, and unchanged existing auth strategies.
- Human docs describe the internal auth strategy, Redis keys, rotation procedure, grace window, and operational responsibilities.
