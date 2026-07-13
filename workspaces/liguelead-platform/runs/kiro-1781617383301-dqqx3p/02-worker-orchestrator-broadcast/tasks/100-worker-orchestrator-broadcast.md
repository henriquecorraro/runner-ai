---
id: worker-orchestrator-broadcast
title: "Broadcast orchestrator: mailing + sms-dispatch + voice-close"
scope: worker-consolidation
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
depends_on:
  - worker-extract-loops
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTcE
github_project_item_id: 200961631
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6bl8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200961631"
github_project_status: Todo
---

## Objective

Create orchestrator entry point that runs 3 broadcast workers in one process.

## File: `src/workers/orchestrator-broadcast.worker.ts`

```typescript
import "reflect-metadata";
import { createOrchestrator } from "./orchestrator";
import { broadcastMailingLoop } from "./loops/broadcast-mailing.loop";
import { broadcastSmsDispatchLoop } from "./loops/broadcast-sms-dispatch.loop";
import { broadcastVoiceCloseLoop } from "./loops/broadcast-voice-close.loop";

void createOrchestrator({
  workers: [
    { name: "broadcast-mailing", run: broadcastMailingLoop },
    { name: "broadcast-sms-dispatch", run: broadcastSmsDispatchLoop },
    { name: "broadcast-voice-close", run: broadcastVoiceCloseLoop },
  ],
});
```

## package.json script

Add: `"worker:orchestrator-broadcast": "tsx src/workers/orchestrator-broadcast.worker.ts"`

## Constraints

- Do NOT remove the original standalone worker files or their scripts
- Must pass typecheck and build
