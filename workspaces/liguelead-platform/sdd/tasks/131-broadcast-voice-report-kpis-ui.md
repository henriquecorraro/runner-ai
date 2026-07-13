---
id: broadcast-voice-report-kpis-ui
title: Render voice report KPI fields in frontend schedule report
scope: broadcast-reports
status: done
repositories:
  - platform-front
validation:
  - npm run build
depends_on:
  - broadcast-voice-report-kpis-middleware
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4697219455
github_issue_number: 72
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/72
github_issue_node_id: I_kwDORqaAXc8AAAABF_nhfw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/72
github_project_item_id: 202211469
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNgI0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202211469"
github_project_status: Done
---

## Files

| Path | Change |
| --- | --- |
| `src/service/broadcasts/broadcasts-service.types.ts` | Extend `TBroadcastVoiceReport.summary`. |
| `src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx` | Render KPI cards for new fields. |
| `docs/features/broadcasts.md` | Document report KPI usage. |

## Summary Type

```ts
type TBroadcastVoiceReportSummary = {
  totalDialed: number
  answered: number
  notAnswered: number
  answeredPercent: number
  notAnsweredPercent: number
  dtmfCount: number
  dtmfPercent: number
  interactionSmsSent: number
  credits: number
  creditsToCharge: number
  avgListenedSeconds: number
  totalListenedSeconds: number
  billableCalls: number
  failedCount: number
}
```

## UI

Add visible report metrics:

| Label | Value |
| --- | --- |
| `Duração média escutada` | `avgListenedSeconds` formatted as seconds. |
| `Tempo total escutado` | `totalListenedSeconds` formatted as duration. |
| `Chamadas cobradas` | `billableCalls` formatted as number. |
| `Falhas` | `failedCount` formatted as number. |

Keep existing cards for totals, answered, not answered, DTMF, SMS interactions, credits, updated timestamp.
Do not add S3 JSON loading.
Do not show placeholder text when field value is `0`; render `0` or `0s`.
Keep current header behavior: page title is broadcast name, tags stay in page header, status badge uses list color standard.
