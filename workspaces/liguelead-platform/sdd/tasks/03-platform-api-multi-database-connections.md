---
id: platform-api-multi-database-connections
title: Platform API Multi Database Connection Bootstrap
scope: platform-api-multi-database
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
  - npm test
docs_targets:
  - platform-api:README.md
---

## Goal

Allow `platform-api` to bootstrap distinct MySQL connections for `areadocliente`, `dialer`, `dialer_mailings`, and `flow`, while preserving the current local-development workflow where the four databases share the same host and credentials.

## Affected Behavior

The application currently starts with a single Sequelize connection. It must expose four logical database connections so staging and production can use different hosts, credentials, and database names per backend.

In local development:

- the same host, port, user, and password may be reused for every connection
- the databases must still be addressed separately as `areadocliente`, `dialer`, `dialer_mailings`, and `flow`

## Implementation Constraints

- Keep `areadocliente` as the primary modeled connection used by the current repositories and Sequelize models.
- Add bootstrap-ready connections for `dialer`, `dialer_mailings`, and `flow` even if no module uses them yet.
- Preserve backward compatibility for the existing local `.env` values where possible.
- Authenticate every required connection during API and worker startup.
- Do not create business modules for `flow` yet; only provide the connection.

## Docs Alignment

Update the repository setup docs to describe the four database connections and the environment variables used to configure them locally and in higher environments.

## Validation Expectations

- TypeScript typecheck must pass.
- The project must build successfully.
- The existing automated test suite must keep passing with the new bootstrap configuration.
