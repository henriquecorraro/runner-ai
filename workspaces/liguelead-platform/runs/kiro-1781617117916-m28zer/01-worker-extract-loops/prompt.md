You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: worker-extract-loops
Title: Extract worker process-once loops from standalone workers

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

### worker-extract-loops
Task id: worker-extract-loops
Task title: Extract worker process-once loops from standalone workers
Task status: open
Task scope: worker-consolidation
Task validation: npm run typecheck ; npm test ; npm run build

```md
## Objective

Refactor each worker's inner loop into a standalone function that performs ONE iteration (including its own idle sleep). The original standalone worker files must keep working unchanged — they just call the extracted function in their own `while(true)`.

## Workers to extract

| Worker file | New loop file | Exported function |
|---|---|---|
| `src/workers/audit-events.worker.ts` | `src/workers/loops/audit-events.loop.ts` | `auditEventsLoop(): Promise<void>` |
| `src/workers/auto-recharges.worker.ts` | `src/workers/loops/auto-recharges.loop.ts` | `autoRechargesLoop(): Promise<void>` |
| `src/workers/mercadopago-payments.worker.ts` | `src/workers/loops/mercadopago-payments.loop.ts` | `mercadopagoPaymentsLoop(): Promise<void>` |
| `src/workers/lead-lists.worker.ts` | `src/workers/loops/lead-lists.loop.ts` | `leadListsLoop(): Promise<void>` |
| `src/workers/broadcast-mailing.worker.ts` | `src/workers/loops/broadcast-mailing.loop.ts` | `broadcastMailingLoop(): Promise<void>` |
| `src/workers/broadcast-sms-dispatch.worker.ts` | `src/workers/loops/broadcast-sms-dispatch.loop.ts` | `broadcastSmsDispatchLoop(): Promise<void>` |
| `src/workers/broadcast-voice-close.worker.ts` | `src/workers/loops/broadcast-voice-close.loop.ts` | `broadcastVoiceCloseLoop(): Promise<void>` |
| `src/workers/interactive-voice-sms-dispatch.worker.ts` | `src/workers/loops/interactive-voice-sms-dispatch.loop.ts` | `interactiveVoiceSmsDispatchLoop(): Promise<void>` |
| `src/workers/interactive-voice-interactions.worker.ts` | `src/workers/loops/interactive-voice-interactions.loop.ts` | `interactiveVoiceInteractionsLoop(): Promise<void>` |

## Pattern for each loop file

```typescript
// Example: audit-events.loop.ts
import { AuditEventWorkerService } from "@/modules/audit/services/audit-event-worker.service";

const IDLE_INTERVAL_MS = 250;
const workerService = new AuditEventWorkerService();
let initialized = false;

export async function auditEventsLoop(): Promise<void> {
  if (!initialized) {
    await workerService.ensureConsumerGroup();
    initialized = true;
  }
  const result = await workerService.processOnce();
  if (result.processed > 0) {
    console.info("[audit-events-worker] Batch completed", result);
  } else {
    await new Promise(r => setTimeout(r, IDLE_INTERVAL_MS));
  }
}
```

## Constraints

- Each loop function must include its idle sleep — the orchestrator does NOT add sleep
- Each original `.worker.ts` file must be refactored to import and call the loop function in its own `while(true)` + try/catch — preserving identical runtime behavior
- `lead-lists.loop.ts` must keep the BRPOP mechanism with 5s timeout (non-blocking for Node event loop)
- `broadcast-mailing.loop.ts` must keep the `queueService.dequeue()` blocking pattern
- `interactive-voice-interactions.loop.ts` calls `drainOnce()` directly — no added sleep
- Error reporting stays inside each loop function (not delegated to orchestrator)
- Barrel export: `src/workers/loops/index.ts`
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781617117916-m28zer/01-worker-extract-loops/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: worker-extract-loops
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
