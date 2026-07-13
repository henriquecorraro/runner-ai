---
id: reduce-platform-api-auth-session-context-cache-ttl
title: Reduce platform-api auth session context cache TTL
scope: auth-session-cache
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/users.use-cases.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
---

Reduce the Redis TTL used by platform-api when caching authenticated session context from one hour to five minutes.

Context:
- `platform-api/src/modules/users/use-cases/users.use-cases.ts` caches `AuthSessionContext` under `ci3:auth_session_context:<userId>`.
- The cached context includes `userId`, `clientId`, and `planId`.
- Current TTL is `60 * 60` seconds.

Requirements:
- Change the TTL to five minutes (`5 * 60` seconds or an equivalent named constant).
- Preserve the existing cache key and cached payload shape.
- Keep authentication behavior unchanged apart from the shorter cache lifetime.
- Add or update focused coverage if a test already asserts the TTL.

Validation:
- Run the narrowest relevant user/auth use-case tests if present.
- Run the repository build or typecheck.
