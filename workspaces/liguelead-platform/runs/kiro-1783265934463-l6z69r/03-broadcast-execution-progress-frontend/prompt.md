You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: broadcast-execution-progress-frontend
Title: Frontend execution progress UI for active broadcast schedules

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

### broadcast-execution-progress-frontend
Task id: broadcast-execution-progress-frontend
Task title: Frontend execution progress UI for active broadcast schedules
Task status: open
Task scope: broadcast-execution-progress
Task validation: npm run lint ; npm run build

```md
## Objective

Display real-time execution progress on the broadcast schedule detail page when `statusId === 4` (Discando).

## Service Layer

File: `src/service/broadcasts/broadcasts-service.ts`

Add function:

```typescript
async getScheduleExecutionProgress(scheduleId: number): Promise<ExecutionProgressResponse>
```

Endpoint: `GET /broadcasts/schedules/${scheduleId}/execution-progress`

File: `src/service/broadcasts/broadcasts-service.types.ts`

Add types:

```typescript
export type TVoiceExecutionProgress = {
  type: 'voice'
  total: number
  processed: number
  pending: number
  answered: number
  answeredBillsecZero: number
  notAnswered: number
  busy: number
  failed: number
  progressPercent: number
  avgDurationSeconds: number | null
}

export type TSmsExecutionProgress = {
  type: 'sms'
  total: number
  sent: number
  pending: number
  totalCredits: number
  progressPercent: number
}

export type TExecutionProgressResponse = {
  progress: TVoiceExecutionProgress | TSmsExecutionProgress | null
  updatedAt: string
}
```

## Query Hook

File: `src/hooks/queries/broadcasts.queries.ts`

Add `useScheduleExecutionProgressQuery(scheduleId, enabled)`:
- `enabled`: only when schedule `statusId === 4`
- `refetchInterval`: 30000 (30s polling while active)
- `staleTime`: 25000

## UI Component

File: `src/pages/Broadcasts/components/BroadcastExecutionProgress.tsx`

New component. Render when `statusId === 4` in `BroadcastScheduleDetailsView.tsx`.

Replace the `ScheduleReportPendingState` block (when statusId === 4) with the new progress component.

### Voice Layout

| Metric | Source |
|--------|--------|
| Progress bar | `progressPercent` — full-width bar, purple color (`#a78bfa`) |
| Processados | `processed` / `total` |
| Atendidas | `answered` (badge: percent of total) |
| Não atendidas | `notAnswered` |
| Duração média | `avgDurationSeconds` + "s" suffix |
| Pendentes | `pending` |

### SMS Layout

| Metric | Source |
|--------|--------|
| Progress bar | `progressPercent` — full-width bar, blue color (`#60a5fa`) |
| Enviadas | `sent` / `total` |
| Pendentes | `pending` |
| Créditos | `totalCredits` |

### Progress Bar Spec

- Styled component with animated width transition (0.5s ease).
- Height: 8px, border-radius: 4px.
- Background: `rgba(255, 255, 255, 0.06)` (or theme surface equivalent).
- Inner fill: purple for voice, blue for SMS.
- Display percent text to the right of bar.

### Metric Cards

Use existing `ReportMetricCard` pattern from `Broadcasts.styles.ts`:
- `ReportCardsGrid` container
- `AnimatedCard` wrapper
- `ReportMetricCard` > `ReportMetricHeader` + `ReportMetricBody`
- Icons from `@phosphor-icons/react`

### Fallback

If `progress === null`, show the existing `ScheduleReportPendingState` (keep current behavior as fallback — table might not exist yet at start).

## Integration Point

File: `src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx`

Replace:
```tsx
{detail && (isVoiceSchedule || isSmsSchedule) && isWaitingForReport ? (
  <ScheduleReportPendingState>...</ScheduleReportPendingState>
) : null}
```

With:
```tsx
{detail && (isVoiceSchedule || isSmsSchedule) && detail.statusId === 4 ? (
  <BroadcastExecutionProgress scheduleId={detail.id} typeId={detail.typeId} />
) : null}
{detail && (isVoiceSchedule || isSmsSchedule) && detail.statusId === 3 ? (
  <ScheduleReportPendingState>...</ScheduleReportPendingState>
) : null}
```

## i18n Keys

File: `src/i18n/locales/pt-BR/broadcasts.json`, `en/broadcasts.json`, `es-ES/broadcasts.json`

Add under `executionProgress` namespace:

| Key | pt-BR | en | es-ES |
|-----|-------|----|----|
| executionProgress.title | Progresso do envio | Send progress | Progreso del envío |
| executionProgress.processed | Processados | Processed | Procesados |
| executionProgress.answered | Atendidas | Answered | Contestadas |
| executionProgress.notAnswered | Não atendidas | Not answered | No contestadas |
| executionProgress.avgDuration | Duração média | Avg. duration | Duración media |
| executionProgress.pending | Pendentes | Pending | Pendientes |
| executionProgress.sent | Enviadas | Sent | Enviados |
| executionProgress.credits | Créditos | Credits | Créditos |
| executionProgress.updatedAt | Atualizado em | Updated at | Actualizado en |

## Constraints

- Do NOT modify existing report views (statusId === 7 flow).
- Keep `ScheduleReportPendingState` for `statusId === 3` (scheduled, not yet running).
- Use existing design system patterns — do NOT introduce new CSS libraries.
- Polling must stop when component unmounts or statusId changes away from 4.

## Validation

- `npm run lint`
- `npm run build`
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1783265934463-l6z69r/03-broadcast-execution-progress-frontend/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: broadcast-execution-progress-frontend
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
