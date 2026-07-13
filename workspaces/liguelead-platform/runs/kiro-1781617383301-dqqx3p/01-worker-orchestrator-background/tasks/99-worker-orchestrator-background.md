---
id: worker-orchestrator-background
title: "Background orchestrator: audit-events + auto-recharges + mercadopago + lead-lists"
scope: worker-consolidation
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
depends_on:
  - worker-extract-loops
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTcA
github_project_item_id: 200961614
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6bk4
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200961614"
github_project_status: Todo
---

## Objective

Create orchestrator entry point that runs 4 low-throughput workers in one process.

## File: `src/workers/orchestrator-background.worker.ts`

```typescript
import "reflect-metadata";
import { createOrchestrator } from "./orchestrator";
import { auditEventsLoop } from "./loops/audit-events.loop";
import { autoRechargesLoop } from "./loops/auto-recharges.loop";
import { mercadopagoPaymentsLoop } from "./loops/mercadopago-payments.loop";
import { leadListsLoop } from "./loops/lead-lists.loop";

void createOrchestrator({
  workers: [
    { name: "audit-events", run: auditEventsLoop },
    { name: "auto-recharges", run: autoRechargesLoop },
    { name: "mercadopago-payments", run: mercadopagoPaymentsLoop },
    { name: "lead-lists", run: leadListsLoop },
  ],
});
```

## package.json script

Add: `"worker:orchestrator-background": "tsx src/workers/orchestrator-background.worker.ts"`

## Constraints

- `connectDb: true`, `connectRedis: true` (defaults)
- Do NOT remove the original standalone worker files or their scripts — they remain as fallback
- Must pass typecheck and build
