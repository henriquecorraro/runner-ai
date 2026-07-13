---
id: worker-orchestrator-infra
title: Worker orchestrator infrastructure
scope: worker-consolidation
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTb0
github_project_item_id: 200961558
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6bhY
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200961558"
github_project_status: Todo
---

## Objective

Create a generic worker orchestrator that runs multiple worker loops in a single Node.js process sharing DB and Redis connections.

## Implementation

### File: `src/workers/orchestrator/create-orchestrator.ts`

```typescript
type WorkerLoop = {
  name: string;
  run: () => Promise<void>; // single iteration — NOT infinite loop
};

type OrchestratorOptions = {
  workers: WorkerLoop[];
  connectDb?: boolean; // default true
  connectRedis?: boolean; // default true
};
```

Export `createOrchestrator(options: OrchestratorOptions): Promise<void>`:
1. Call `disableDatabaseQueryLogging()` + `authenticateDatabaseConnections()` if `connectDb`
2. Call `connectRedis()` if `connectRedis`
3. Log `[orchestrator] Starting N workers: [names]`
4. For each worker, spawn an async loop:
   - `while (true)` → call `worker.run()`
   - Wrap in try/catch → on error call `reportWorkerError({ workerName: worker.name, operation: "orchestrator_loop", error })` then sleep 2000ms
5. `await Promise.all(loops)` — process stays alive

### Constraints

- Do NOT import any worker-specific logic in this file
- Each worker's `run()` must handle its own idle sleep internally
- No HTTP health-check endpoint in this task (separate concern)
- Export from barrel: `src/workers/orchestrator/index.ts`
