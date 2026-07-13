You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: worker-orchestrator-infra-config
Title: Update Makefile, docker-compose, and package.json for orchestrator workers

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### worker-orchestrator-infra-config
Task id: worker-orchestrator-infra-config
Task title: Update Makefile, docker-compose, and package.json for orchestrator workers
Task status: open
Task scope: worker-consolidation
Task validation: npm run typecheck ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781617535959-qd4074/01-worker-orchestrator-infra-config/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: worker-orchestrator-infra-config
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
