You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: worker-orchestrator-infra
Title: Worker orchestrator infrastructure

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

### worker-orchestrator-infra
Task id: worker-orchestrator-infra
Task title: Worker orchestrator infrastructure
Task status: open
Task scope: worker-consolidation
Task validation: npm run typecheck ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781617021627-evryzt/01-worker-orchestrator-infra/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: worker-orchestrator-infra
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
