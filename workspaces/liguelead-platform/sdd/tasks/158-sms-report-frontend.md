---
id: sms-report-frontend
title: "Frontend: SMS report view with cards, timeline and CSV download"
scope: sms-report
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - sms-report-endpoint
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4720811037
github_issue_number: 102
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/102
github_issue_node_id: I_kwDORqaAXc8AAAABGWHcHQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/102
github_project_item_id: 203507352
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwhRpg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=203507352"
github_project_status: Done
---

## Objective

Render SMS/SMS Flash report in `BroadcastScheduleDetailsView` with 3 metric cards, execution timeline, and CSV download button.

## Types

File: `src/service/broadcasts/broadcasts-service.types.ts`

Add:
```typescript
export type TBroadcastSmsReport = {
  actionId: number
  typeId: 3 | 4
  reportType: 'sms'
  summary: {
    totalLeads: number
    totalSent: number
    sentPercent: number
  }
  timeline: TBroadcastReportTimelineEvent[]
  reportUrl: string | null
}

export function isSmsBroadcastType(typeId: TBroadcastTypeId) {
  return typeId === 3 || typeId === 4
}
```

## Service

File: `src/service/broadcasts/broadcasts-service.ts`

Update `getBroadcastScheduleReport` return type to `TBroadcastVoiceReport | TBroadcastSmsReport`.

## Query hook

File: `src/hooks/queries/broadcasts.queries.ts`

`useBroadcastScheduleReportQuery` — no changes needed (already generic).

## View

File: `src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx`

### Enable report fetch for SMS

```typescript
const isSmsSchedule = detail ? isSmsBroadcastType(detail.typeId) : false
```

Call `useBroadcastScheduleReportQuery` when:
```typescript
(isVoiceSchedule || isSmsSchedule) && detail?.statusId === 7
```

### 3 Cards for SMS

Render `ReportCardsGrid` when `isSmsSchedule && report && report.reportType === 'sms'`:

| Card | Label | Value | Helper | Tone |
|------|-------|-------|--------|------|
| total-leads | t('report.totalLeads') | `report.summary.totalLeads` | — | neutral |
| total-sent | t('report.totalSmsSent') | `report.summary.totalSent` | — | success |
| sent-percent | t('report.sentPercent') | `${report.summary.sentPercent}%` | — | info |

Icons:
- total-leads: `UsersIcon` (phosphor)
- total-sent: `ChatCircleTextIcon` (phosphor)
- sent-percent: `ChartPieIcon` (phosphor)

### Timeline

Reuse existing `ReportTimelineBlock` + `ReportTimelineRail` rendering. Same logic as voice — the `timeline` array has identical shape.

### Download button

Show download button (reuse existing `downloadBroadcastScheduleReportCsv`) when `report.reportUrl` is not null.

## i18n

File: `src/i18n/locales/pt-BR/broadcasts.json`

Add keys:
```json
{
  "report.totalLeads": "Total de Leads",
  "report.totalSmsSent": "SMS Enviados",
  "report.sentPercent": "Taxa de Envio"
}
```

File: `src/i18n/locales/en/broadcasts.json`
```json
{
  "report.totalLeads": "Total Leads",
  "report.totalSmsSent": "SMS Sent",
  "report.sentPercent": "Send Rate"
}
```

File: `src/i18n/locales/es-ES/broadcasts.json`
```json
{
  "report.totalLeads": "Total de Leads",
  "report.totalSmsSent": "SMS Enviados",
  "report.sentPercent": "Tasa de Envío"
}
```

## Constraints

- Do NOT create new pages or routes — reuse existing `BroadcastScheduleDetailsView`
- Do NOT show voice-specific cards (duration, DTMF, cost) for SMS reports
- Do NOT show `BroadcastReportCharts` for SMS reports
- Reuse all existing styled components from `Broadcasts.styles.ts`
