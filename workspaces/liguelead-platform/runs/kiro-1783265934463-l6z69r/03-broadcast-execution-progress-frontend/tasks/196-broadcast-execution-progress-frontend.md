---
id: broadcast-execution-progress-frontend
title: Frontend execution progress UI for active broadcast schedules
scope: broadcast-execution-progress
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - broadcast-execution-progress-middleware
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4813424763
github_issue_number: 132
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/132
github_issue_node_id: I_kwDORqaAXc8AAAABHucIew
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/132
github_project_item_id: 208848877
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxyx-0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208848877"
github_project_status: Todo
---

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
