---
name: liguelead-platform-ecosystem
description: "Mandatory workflow for any code change or implementation question involving LigueLead's local platform ecosystem across /home/rick/projetos/platform-api, /home/rick/projetos/middleware, and /home/rick/projetos/platform-front. Use when working on features, bug fixes, refactors, route contracts, API/frontend integration, or cross-repository behavior. Enforce the SDD flow: create or update executable tasks in the centralized ecosystem SDD, follow the repo documentation rules, then implement and validate the code."
---

# LigueLead Platform Ecosystem

## Overview

Use this skill to plan and execute work that touches the three local platform repositories:

- `platform-api`: new backend in Node.js, TypeScript, Express, Zod, Sequelize.
- `middleware`: AWS Lambda/API Gateway middleware with route catalog, Zod contracts, auth, and proxying.
- `platform-front`: React/Vite frontend that consumes the middleware routes.

Prefer repo-local patterns and documentation over inventing new structure. For cross-repo work, keep the HTTP contract as the source of coordination.

Treat this skill as required whenever the request can change code, contracts, data flow, or user-visible behavior in any of the three repos.

## SDD First Rule

Follow SDD before code changes:

1. Identify every repo affected by the request.
2. Read the centralized ecosystem SDD in `/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead/sdd/README.md` before planning implementation.
3. When the work needs new tasks or task splitting, use the shared `ecosystem-task-factory` skill.
4. If the request is not already covered by an existing ecosystem task, create one or more new task files under `/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead/sdd/tasks`.
5. Register every new task as pending in the ecosystem `Task Status`.
6. Only start implementation after the central task files describe the intended scope.

Do not skip task creation for "small" code changes. Any change to behavior, contracts, validations, integrations, or UI flow must be represented in the centralized ecosystem SDD unless an existing task already covers it.

When the user asks a question that is purely exploratory and does not imply code changes, use the repo docs and code normally. The moment the request shifts into implementation or modification, return to the SDD flow above.

## Cross-Repo Workflow

Use this order for new or changed user-facing functionality:

1. Define the affected repos and create or update their centralized ecosystem tasks first.
2. Define the route or integration contract: method, path, auth strategy, request shape, response shape, errors, ownership rules, and frontend field mapping.
3. Implement or adjust `platform-api` behavior when backend logic or persistence changes.
4. Add or adjust `middleware` route definitions and Zod contracts when public API behavior or proxy rules change.
5. Add or adjust `platform-front` service types, API calls, query hooks, routes, and UI when the user-facing flow changes.
6. Update the human-facing docs required by each repo's rules.
7. Run targeted validation in every touched repo.
8. Mark ecosystem tasks complete only after code, docs, and validation are aligned.

For bug fixes, first locate the failing boundary:

- UI or data mapping problem: start in `platform-front`.
- Contract, auth, routing, proxy, or response validation problem: start in `middleware`.
- Business rule, persistence, ownership, or database shape problem: start in `platform-api`.

Even for bug fixes, create or update the corresponding ecosystem task before editing code unless an existing open task already captures the bug scope.

## Repo Documentation Rules

Apply the repo's own human-doc rules during implementation:

- `platform-api`:
  Keep implementation aligned with `docs/human`.
  New or changed backend work must update the affected file under `docs/human/modules` or create a new human doc when the feature needs its own operational surface.
- `middleware`:
  Keep route, auth, proxy, and validation behavior aligned with the human docs under `docs`.
  Route or contract changes must update `docs/contracts-and-routes/README.md` and `docs/domains/README.md` when public behavior changes.
- `platform-front`:
  Keep implementation aligned with `docs/features`.
  Every implemented frontend task must update at least one human-facing doc under `docs/features`.

## Validation Defaults

Use the repo's scripts unless local context shows a narrower command is safer:

- `platform-api`: `npm run typecheck`; run `npm test` for behavior changes.
- `middleware`: `npm test`.
- `platform-front`: `npm run lint` and `npm run build`.

If validation cannot run because of environment, network, Docker, database, or missing services, report exactly what was skipped and why.

## Operating Notes

- Inspect all affected repos before editing.
- Check `git status --short --branch` in each affected repo before changing code.
- Never revert unrelated user changes.
- Load only the docs and references needed for the request instead of bulk-loading everything.
