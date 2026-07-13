You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: worker-orchestrator-interactive
Title: Interactive voice orchestrator: interactions + sms-dispatch

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

### worker-orchestrator-interactive
Task id: worker-orchestrator-interactive
Task title: Interactive voice orchestrator: interactions + sms-dispatch
Task status: open
Task scope: worker-consolidation
Task validation: npm run typecheck ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781617383301-dqqx3p/03-worker-orchestrator-interactive/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: worker-orchestrator-interactive
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
