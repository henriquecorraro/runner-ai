---
id: worker-orchestrator-prod-scripts
title: Add production entry-point scripts for orchestrator workers
scope: worker-consolidation
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoXoE
github_project_item_id: 201065949
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv8Bd0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201065949"
github_project_status: Testing
---

## Objective

Add `package.json` scripts for running the 3 orchestrator workers in production using the compiled `dist/` output (no tsx, no ts-node).

## Context

- Dev scripts use `tsx` for on-the-fly transpilation
- Production (EKS) must use pre-built JS from `dist/` via `node`
- `NODE_ENV=prod` must be set for production runtime configuration

## Changes

### File: `package.json`

Add 3 production scripts:

```json
"worker:orchestrator-background:prod": "NODE_ENV=prod node dist/workers/orchestrator-background.worker.js",
"worker:orchestrator-broadcast:prod": "NODE_ENV=prod node dist/workers/orchestrator-broadcast.worker.js",
"worker:orchestrator-interactive:prod": "NODE_ENV=prod node dist/workers/orchestrator-interactive.worker.js"
```

## EKS Deployment Usage

Each Kubernetes Deployment runs one of these commands as its container entrypoint:

| Deployment | Command |
|---|---|
| `platform-api-background-worker` | `npm run worker:orchestrator-background:prod` |
| `platform-api-broadcast-worker` | `npm run worker:orchestrator-broadcast:prod` |
| `platform-api-interactive-worker` | `npm run worker:orchestrator-interactive:prod` |

Alternative direct invocation (without npm overhead):
```bash
NODE_ENV=prod node dist/workers/orchestrator-background.worker.js
NODE_ENV=prod node dist/workers/orchestrator-broadcast.worker.js
NODE_ENV=prod node dist/workers/orchestrator-interactive.worker.js
```

## Workers per orchestrator

| Orchestrator | Workers |
|---|---|
| background | audit-events, auto-recharges, mercadopago-payments, lead-lists |
| broadcast | broadcast-mailing, broadcast-sms-dispatch, broadcast-voice-close |
| interactive | interactive-voice-interactions, interactive-voice-sms-dispatch |

## Prerequisites

- `npm run build` must complete before running prod scripts
- All workers compile to `dist/workers/` via `tsc` (tsconfig.json includes `src/**/*.ts`)

## Constraints

- Do NOT use tsx in production — only `node` with compiled JS
- `NODE_ENV=prod` is required for database connection strings, Redis config, and logging behavior
