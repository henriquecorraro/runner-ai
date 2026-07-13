---
id: worker-orchestrator-infra-config
title: "Update Makefile, docker-compose, and package.json for orchestrator workers"
scope: worker-consolidation
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
depends_on:
  - worker-orchestrator-background
  - worker-orchestrator-broadcast
  - worker-orchestrator-interactive
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTfs
github_project_item_id: 200963820
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6duw
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200963820"
github_project_status: Todo
---

## Objective

Update package.json scripts, Makefile targets, and docker-compose services to use the 3 new orchestrator entry points. Keep standalone worker scripts/services as commented-out fallback.

## package.json changes

Add scripts:
```json
"worker:orchestrator-background": "tsx src/workers/orchestrator-background.worker.ts",
"worker:orchestrator-broadcast": "tsx src/workers/orchestrator-broadcast.worker.ts",
"worker:orchestrator-interactive": "tsx src/workers/orchestrator-interactive.worker.ts"
```

Do NOT remove existing standalone `worker:*` scripts.

## docker-compose.yml (dev)

Replace the 7 individual worker services with 3 orchestrator services:

```yaml
  platform-api-background-worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: platform-api-background-worker
    env_file:
      - .env
    volumes:
      - .:/app
      - /app/node_modules
      - lead_uploads_tmp:/tmp/lead-list-uploads
    command: npm run worker:orchestrator-background
    networks:
      - development

  platform-api-broadcast-worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: platform-api-broadcast-worker
    env_file:
      - .env
    volumes:
      - .:/app
      - /app/node_modules
      - lead_uploads_tmp:/tmp/lead-list-uploads
    command: npm run worker:orchestrator-broadcast
    networks:
      - development

  platform-api-interactive-worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: platform-api-interactive-worker
    env_file:
      - .env
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run worker:orchestrator-interactive
    networks:
      - development
```

Comment out (do NOT delete) the old individual worker services.

## docker-compose.homolog.yml

Same pattern — 3 orchestrator services replacing the individual ones:
- `platform-api-background-worker-homolog` → `NODE_ENV=homolog node dist/workers/orchestrator-background.worker.js`
- `platform-api-broadcast-worker-homolog` → `NODE_ENV=homolog node dist/workers/orchestrator-broadcast.worker.js`
- `platform-api-interactive-worker-homolog` → `NODE_ENV=homolog node dist/workers/orchestrator-interactive.worker.js`

Comment out old services.

## docker-compose.prod.yml

Same pattern — 3 orchestrator services:
- `platform-api-background-worker-prod` → `NODE_ENV=prod node dist/workers/orchestrator-background.worker.js`
- `platform-api-broadcast-worker-prod` → `NODE_ENV=prod node dist/workers/orchestrator-broadcast.worker.js`
- `platform-api-interactive-worker-prod` → `NODE_ENV=prod node dist/workers/orchestrator-interactive.worker.js`

Comment out old services. `background-worker` must mount `lead_uploads_tmp` volume (lead-lists needs it).

## Makefile changes

### Replace container name variables (top of file)

```makefile
PROD_BACKGROUND_WORKER_CONTAINER?=$(APP_NAME)-background-worker-prod
PROD_BROADCAST_WORKER_CONTAINER?=$(APP_NAME)-broadcast-worker-prod
PROD_INTERACTIVE_WORKER_CONTAINER?=$(APP_NAME)-interactive-worker-prod
```

Remove old per-worker container variables.

### Replace log targets

Replace all individual `*-worker-logs` targets (dev, homolog, prod) with:

```makefile
dev-worker-logs:
	$(COMPOSE) logs -f platform-api-background-worker platform-api-broadcast-worker platform-api-interactive-worker

dev-background-worker-logs:
	$(COMPOSE) logs -f platform-api-background-worker

dev-broadcast-worker-logs:
	$(COMPOSE) logs -f platform-api-broadcast-worker

dev-interactive-worker-logs:
	$(COMPOSE) logs -f platform-api-interactive-worker
```

Same pattern for `homolog-*` and `prod-*` targets. Keep the same general structure (individual + combined).

### Update .PHONY

Remove old worker-log phony entries, add new ones.

### Update help target

Replace per-worker help lines with 3 orchestrator-based lines per environment.

## Constraints

- Do NOT rename any source file — only infra/config files
- The `lead_uploads_tmp` volume must be mounted on `background-worker` (hosts lead-lists worker)
- Do NOT break `make prod-up`, `make dev-up`, `make homolog-up`
- Maintain the `networks` configuration identical to current setup per compose file
