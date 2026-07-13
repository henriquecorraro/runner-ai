You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: worker-orchestrator-broadcast
Title: Broadcast orchestrator: mailing + sms-dispatch + voice-close

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

### worker-orchestrator-broadcast
Task id: worker-orchestrator-broadcast
Task title: Broadcast orchestrator: mailing + sms-dispatch + voice-close
Task status: open
Task scope: worker-consolidation
Task validation: npm run typecheck ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781617383301-dqqx3p/02-worker-orchestrator-broadcast/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: worker-orchestrator-broadcast
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
