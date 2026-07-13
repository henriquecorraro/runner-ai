---
id: implement-professional-auth-with-redis-sessions-and-sequelize
title: Implement professional auth with Redis sessions and Sequelize
scope: auth
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck --workspace backend
  - npm run build --workspace backend
  - npm run build --workspace frontend
  - docker compose up -d --build mysql redis backend
  - "docker compose exec -T mysql mysql -usaude -psaude_dev_password saude -e \"SHOW TABLES;\""
docs_targets:
  - docs/architecture.md
  - docs/database.md
  - docs/auth.md
---

Implement the authentication flow where every registered user is a healthcare professional. Add registration and login endpoints, persist professionals through Sequelize models, store password hashes with a backend hardcoded pepper/secret, and never store plaintext passwords. Use ioredis for session storage and TTL control. On login, create an encrypted session token returned to the frontend; the backend must decrypt/read the token, validate it against Redis, restore the professional id, and load the authenticated professional context for downstream clinical data access. Store the encrypted token or its secure lookup representation in Redis with expiration, support logout/session invalidation, and replace current development header-based professional context with authenticated session middleware. Update the frontend to provide register/login screens, persist the returned token client-side, attach it to API requests, and route authenticated users into the chat workflow. Update Docker/compose configuration to include Redis locally, add env configuration for Redis/session TTL/token encryption secret, migrate existing database access toward Sequelize models while preserving the current clinical workflow behavior. Document the auth/session model and operational commands.
