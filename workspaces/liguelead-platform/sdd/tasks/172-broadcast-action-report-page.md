---
id: broadcast-action-report-page
title: Broadcast Action Internal Report Page
scope: broadcast-action-reporting
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/broadcasts.md
depends_on:
  - broadcast-action-aggregate-report-api
  - broadcast-action-aggregate-report-middleware-contract
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4748139332
github_issue_number: 114
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/114
github_issue_node_id: I_kwDORqaAXc8AAAABGwLbRA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/114
github_project_item_id: 205046701
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgw4w60
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205046701"
github_project_status: Done
---

## Files

| Path | Operation |
| --- | --- |
| `src/routes/AppRoutes.tsx` | add `/broadcasts/actions/:id` route before edit/schedule siblings when needed |
| `src/pages/Broadcasts/Broadcasts.tsx` | detect action report route and render internal report page |
| `src/pages/Broadcasts/components/BroadcastActionReportView.tsx` | create page view |
| `src/pages/Broadcasts/components/BroadcastReportChart.tsx` | reuse/adjust charts for aggregate voice report if required |
| `src/pages/Broadcasts/components/BroadcastActionsContent.tsx` | add action to open report page from saved broadcast list |
| `src/service/broadcasts/broadcasts-service.types.ts` | add aggregate report response type |
| `src/service/broadcasts/broadcasts-service.ts` | add service and query key |
| `src/hooks/queries/broadcasts.queries.ts` | add query hook |
| `src/i18n/locales/pt-BR/broadcasts.json` | add copy |
| `src/i18n/locales/en/broadcasts.json` | add copy |
| `src/i18n/locales/es-ES/broadcasts.json` | add copy |
| `docs/features/broadcasts.md` | document page/route |

## Routes

| Route | View |
| --- | --- |
| `/broadcasts/actions/:id` | saved broadcast internal report page |
| `/broadcasts/actions/:id/edit` | keep edit wizard |
| `/broadcasts/actions/:id/schedule` | keep schedule wizard |
| `/broadcasts/schedules/:scheduleId` | keep per-schedule report page |

## Service

```ts
export const broadcastActionReportQueryKey = (id: string) => [...broadcastActionQueryKey(id), 'report'] as const;

export const getBroadcastActionReport = async (id: string): Promise<TBroadcastActionReport> => {
  const response = await api.get<TBroadcastActionReport>(`${prefix}/actions/${id}/report`);
  return response.data;
};
```

## Type

```ts
export type TBroadcastActionReport = {
  broadcastAction: Pick<TBroadcastAction, 'id' | 'title' | 'description' | 'typeId' | 'status' | 'createdAt' | 'updatedAt'>;
  reportType: 'voice' | 'sms';
  scheduleCount: number;
  generatedReportCount: number;
  latestScheduleAt: string | null;
  latestReportAt: string | null;
  totals: {
    totalShipping: number;
    totalCredits: number;
    chargedAmount: number;
  };
  voice?: Omit<TBroadcastVoiceReport, 'actionId' | 'typeId' | 'reportType' | 'timeline' | 'pauses' | 'createdAt' | 'updatedAt'>;
  sms?: Pick<TBroadcastSmsReport, 'summary'>;
  schedules: Array<{
    id: number;
    typeId: TBroadcastTypeId;
    statusId: number;
    statusLabel: string;
    date: string;
    startTime: string | null;
    limitTime: string | null;
    totalShipping: number;
    campaignId: number | null;
    campaignName: string | null;
    reportGenerated: boolean;
    reportUrl: string | null;
    summary: Record<string, number> | null;
  }>;
};
```

## UI

- Header:
  - broadcast title
  - type badge
  - status badge
  - schedule count
  - generated report count
  - latest schedule/report date when present
- Primary metrics:
  - total scheduled audience
  - actions/schedules used count
  - generated reports count
  - total credits
  - charged amount
- Voice section:
  - reuse visual metric cards from per-schedule voice report
  - show total dialed, answered, not answered, average listened duration, charged amount
  - for interactive voice, show digits and interaction SMS sent
  - reuse engagement funnel, status distribution, and duration distribution with aggregate data
  - hide audio playback when aggregate report has no single schedule audio payload
- SMS/SMS Flash section:
  - show total leads, total sent, sent percent, credits, charged amount
- Schedules table:
  - date/window
  - campaign
  - status
  - audience
  - report generated state
  - link to `/broadcasts/schedules/:id`
  - no inline CSV download from aggregate page

## Empty States

| Case | UI |
| --- | --- |
| `scheduleCount = 0` | show saved broadcast metadata and no schedules empty state |
| `scheduleCount > 0`, `generatedReportCount = 0` | show schedules table and report-not-ready empty state |
| query 404 | show standard not-found/empty state with back to broadcasts action |
| query error | show retry state |

## Constraints

- Do not add marketing/landing content.
- Do not duplicate per-schedule report calculation in the frontend.
- Do not fetch every schedule report individually to build aggregate data.
- Use only `GET /broadcasts/actions/:id/report` for aggregate metrics.
- Use existing `/broadcasts/schedules/:id` links for drill-down details.
- Preserve existing schedule detail page behavior.
- Keep labels in Portuguese for `pt-BR`.
- Keep text from overflowing cards/buttons at mobile widths.

## Documentation

- Document `/broadcasts/actions/:id` as saved broadcast aggregate report.
- Document that `/broadcasts/schedules/:id` remains the execution-level report.
- Document that aggregate page links to schedule-level CSV download through drill-down only.
