You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: ll-ds
Task: audit-app-alert-host
Title: Audit AppAlertHost for DS migration eligibility

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Default validation: npm run lint ; npm run build

### audit-app-alert-host
Task id: audit-app-alert-host
Task title: Audit AppAlertHost for DS migration eligibility
Task status: open
Task scope: ds-migration-audit
Task validation: Verdict is clearly stated as DS_CANDIDATE or KEEP_IN_APP ; Justification references concrete evidence from code inspection

```md
## Objective

Analyze `platform-front/src/components/AppAlertHost` and determine if it is a generic, reusable UI component suitable for the design-system package, or a domain-specific component that must stay in platform-front.

## Evaluation Criteria

| Criterion | DS candidate | Stay in platform-front |
|-----------|-------------|----------------------|
| Has business logic / API calls | ❌ | ✅ |
| References app-specific context/stores | ❌ | ✅ |
| Pure presentational / animation | ✅ | ❌ |
| Reusable across multiple apps | ✅ | ❌ |
| Already has equivalent in DS | ❌ (skip) | — |

## Steps

1. Read all files in `platform-front/src/components/AppAlertHost/`
2. Check imports — flag any app-specific dependencies (stores, services, API clients, app routes)
3. Check if design-system already exports an equivalent component (DS has `Alert`)
4. Produce verdict: `DS_CANDIDATE` or `KEEP_IN_APP` with one-line justification
5. If DS_CANDIDATE, list any modifications needed to make it generic

## Output

Add a comment to this task with the verdict and reasoning.
```
## design-system
Repository label: Design System
Repository root: /home/rick/projetos/design-system

Repository guidance:
- Default validation: npm run lint ; npm run build

### audit-app-alert-host
Task id: audit-app-alert-host
Task title: Audit AppAlertHost for DS migration eligibility
Task status: open
Task scope: ds-migration-audit
Task validation: Verdict is clearly stated as DS_CANDIDATE or KEEP_IN_APP ; Justification references concrete evidence from code inspection

```md
## Objective

Analyze `platform-front/src/components/AppAlertHost` and determine if it is a generic, reusable UI component suitable for the design-system package, or a domain-specific component that must stay in platform-front.

## Evaluation Criteria

| Criterion | DS candidate | Stay in platform-front |
|-----------|-------------|----------------------|
| Has business logic / API calls | ❌ | ✅ |
| References app-specific context/stores | ❌ | ✅ |
| Pure presentational / animation | ✅ | ❌ |
| Reusable across multiple apps | ✅ | ❌ |
| Already has equivalent in DS | ❌ (skip) | — |

## Steps

1. Read all files in `platform-front/src/components/AppAlertHost/`
2. Check imports — flag any app-specific dependencies (stores, services, API clients, app routes)
3. Check if design-system already exports an equivalent component (DS has `Alert`)
4. Produce verdict: `DS_CANDIDATE` or `KEEP_IN_APP` with one-line justification
5. If DS_CANDIDATE, list any modifications needed to make it generic

## Output

Add a comment to this task with the verdict and reasoning.
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/runs/kiro-1781440390600-j23kex/01-audit-app-alert-host/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: audit-app-alert-host
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
