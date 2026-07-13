You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-broadcasts-pages
Title: i18n: Translate Broadcasts pages

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

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### i18n-translate-broadcasts-pages
Task id: i18n-translate-broadcasts-pages
Task title: i18n: Translate Broadcasts pages
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Broadcasts domain (actions, schedules, wizards, report). Namespace: `broadcasts`.

## Files to modify

- `src/pages/Broadcasts/Broadcasts.tsx`
- `src/pages/Broadcasts/components/BroadcastActionsContent.tsx`
- `src/pages/Broadcasts/components/BroadcastSchedulesContent.tsx`
- `src/pages/Broadcasts/components/BroadcastActionWizard.tsx`
- `src/pages/Broadcasts/components/BroadcastScheduleWizard.tsx`
- `src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx`
- `src/pages/Broadcasts/components/BroadcastReportChart.tsx`
- `src/pages/Broadcasts/components/BroadcastContentPicker.tsx`
- `src/hooks/tables/useBroadcastActionsColumns.tsx`
- `src/hooks/tables/useBroadcastSchedulesColumns.tsx`
- `src/service/broadcasts/broadcasts-service.types.ts` (BROADCAST_TYPE_LABELS)

## Key translations

- statusLabels: Rascunho/EM ANÁLISE/AGENDADO/Iniciado/Finalizado/Cancelado/CONCLUÍDO/Expirado/PAUSADO
- BROADCAST_TYPE_LABELS: Ligação/Ligação com interação/SMS/SMS Flash
- Page headers, counter with pluralization, schedule summary
- Wizard: step labels, field labels, validation messages, audience config
- Report: chart labels, metric labels, download button
- Interpolation for schedule summary: `"{{date}} das {{start}} às {{limit}}"`, `"{{count}} lead(s)"`

## Constraints

- `statusLabels` and `BROADCAST_TYPE_LABELS` must be moved to i18n keys.
- Do NOT translate user-entered broadcast titles, campaign names, or tag names.
- Replace `toLocaleDateString('pt-BR')` and `toLocaleString('pt-BR')` with formatters.
- This is the largest task — provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/13-i18n-translate-broadcasts-pages/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-broadcasts-pages
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
