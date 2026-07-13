---
id: worker-orchestrator-interactive
title: "Interactive voice orchestrator: interactions + sms-dispatch"
scope: worker-consolidation
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
depends_on:
  - worker-extract-loops
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoTcI
github_project_item_id: 200961651
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv6bnM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=200961651"
github_project_status: Done
---

## Objective

Create orchestrator entry point that runs 2 interactive voice workers in one process.

## File: `src/workers/orchestrator-interactive.worker.ts`

```typescript
import "reflect-metadata";
import { createOrchestrator } from "./orchestrator";
import { interactiveVoiceInteractionsLoop } from "./loops/interactive-voice-interactions.loop";
import { interactiveVoiceSmsDispatchLoop } from "./loops/interactive-voice-sms-dispatch.loop";

void createOrchestrator({
  workers: [
    { name: "interactive-voice-interactions", run: interactiveVoiceInteractionsLoop },
    { name: "interactive-voice-sms-dispatch", run: interactiveVoiceSmsDispatchLoop },
  ],
});
```

## package.json script

Add: `"worker:orchestrator-interactive": "tsx src/workers/orchestrator-interactive.worker.ts"`

## Constraints

- `interactive-voice-interactions` loop has NO idle sleep (drainOnce is blocking) — this is expected and acceptable since both workers in this group are latency-sensitive
- Do NOT remove the original standalone worker files or their scripts
- Must pass typecheck and build
