---
id: broadcast-sms-mailings-db-config
title: Configure dedicated sms_mailings database connection
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sends.repository.spec.ts"
docs_targets:
  - /home/rick/projetos/platform-api/.env_example
  - /home/rick/projetos/platform-api/.env.development
  - /home/rick/projetos/platform-api/src/infra/config/env.ts
  - /home/rick/projetos/platform-api/src/infra/database/sequelize.ts
  - /home/rick/projetos/platform-api/docs/human/modules/broadcasts.md
---

Add first-class configuration for the legacy SMS mailing database used by broadcast SMS/SMS Flash runtime materialization.

Context:
- The local `ac-db` container now has a `sms_mailings` database.
- `platform-api` currently has a dedicated Sequelize connection for `dialer_mailings`, exposed as `dialerMailingsSequelize` / `mailingSequelize`.
- There is no dedicated `sms_mailings` configuration in `.env.development`, `.env_example`, Zod env parsing, or `src/infra/database/sequelize.ts`.

Implementation expectations:
- Add optional env vars for a dedicated SMS mailing database, for example `DB_SMS_MAILINGS_HOST`, `DB_SMS_MAILINGS_USER`, `DB_SMS_MAILINGS_PORT`, `DB_SMS_MAILINGS_PASSWORD`, and `DB_SMS_MAILINGS_NAME`.
- Default the SMS mailing database name to `sms_mailings` when explicit vars are not provided, while reusing the base DB host/user/port/password fallback pattern already used by the project.
- Update Zod env schema and parsed env mapping in `src/infra/config/env.ts`.
- Add `smsMailings` to `env.databases`.
- Add and export `smsMailingsSequelize` from `src/infra/database/sequelize.ts` and include it in `databaseConnections` so authentication checks cover it.
- Keep the existing `mailingSequelize`/`dialerMailingsSequelize` behavior unchanged for voice dialer mailing tables.
- Update `.env_example` with documented optional SMS mailing env vars.
- Update `.env.development` for the local Docker setup with `DB_SMS_MAILINGS_NAME=sms_mailings` and matching local credentials.
- Update repository-local docs if needed to clarify that voice uses `dialer_mailings` and SMS/SMS Flash uses `sms_mailings`.
