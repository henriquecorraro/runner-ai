You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules
Title: Schedules page: replace info icon with chart icon for completed schedules

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

### schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules
Task id: schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules
Task title: Schedules page: replace info icon with chart icon for completed schedules
Task status: open
Task scope: broadcasts
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
## Goal

In the Broadcasts/Schedules page, for schedules with `statusId === 7` (completed), replace the current `InfoIcon` with a chart/report-oriented icon that better communicates "view report/stats".

## File: `src/hooks/tables/useBroadcastSchedulesColumns.tsx`

Current code for completed schedules (statusId === 7):
```tsx
<IconButton
  type="button"
  size="sm"
  variant="solid"
  color="primary"
  aria-label={t('schedulesTable.detailsAction', { title })}
  title={t('schedulesTable.detailsAction', { title })}
  onClick={() => onOpenDetails(row.original)}
>
  <InfoIcon size={14} />
</IconButton>
```

Replace `InfoIcon` with `ChartBarIcon` (or `ChartLineIcon` / `PresentationChartIcon`) from `@phosphor-icons/react`:

```tsx
import { ChartBarIcon } from '@phosphor-icons/react'
```

Replace:
```tsx
<InfoIcon size={14} />
```
With:
```tsx
<ChartBarIcon size={14} weight="bold" />
```

Remove unused `InfoIcon` import if no longer used elsewhere in the file.

## Validation

- `npm run lint` passes
- `npm run build` passes
- Completed schedule rows show a chart/report icon instead of info icon
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/07-schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
