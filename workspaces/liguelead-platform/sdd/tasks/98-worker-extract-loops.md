---
id: worker-extract-loops
title: Extract worker process-once loops from standalone workers
scope: worker-consolidation
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
depends_on:
  - worker-orchestrator-infra
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTb8
github_project_item_id: 200961586
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6bjI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200961586"
github_project_status: Done
---

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
