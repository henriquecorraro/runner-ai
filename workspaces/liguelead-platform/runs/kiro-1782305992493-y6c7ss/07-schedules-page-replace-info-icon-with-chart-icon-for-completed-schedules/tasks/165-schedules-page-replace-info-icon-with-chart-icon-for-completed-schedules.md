---
id: schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules
title: Schedules page: replace info icon with chart icon for completed schedules
scope: broadcasts
status: open
repositories:
  - platform-front
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731282498
github_issue_number: 109
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/109
github_issue_node_id: I_kwDORqaAXc8AAAABGgGkQg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/109
github_project_item_id: 204077258
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp-Mo
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204077258"
github_project_status: Todo
---

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
