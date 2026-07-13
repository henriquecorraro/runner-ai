---
id: broadcast-schedule-report-header-ui
title: Build broadcast schedule report header in frontend
scope: broadcast-schedule-report
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front/docs/features/broadcasts.md
depends_on:
  - broadcast-schedule-report-header-api
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4696745641
github_issue_number: 71
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/71
github_issue_node_id: I_kwDORqaAXc8AAAABF_KmqQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/71
github_project_item_id: 202186149
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNHaU
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202186149"
github_project_status: Done
---

## Repositories

| Repository | Paths |
|---|---|
| platform-front | `src/pages/Broadcasts/**`, `src/service/broadcasts/**`, `src/hooks/queries/broadcasts.queries.ts`, `docs/features/broadcasts.md` |

## Requirements

| Item | Requirement |
|---|---|
| Page | Update the schedule detail/report page for `/broadcasts/schedules/:id`. |
| Header row | Show compact badges/chips for broadcast type, campaign, and status. |
| Title | Show the broadcast title immediately after the header row as the primary page title. |
| Source | Use fields from `GET /broadcasts/schedules/:id`; use report endpoint only for report metrics/download. |
| Loading | Keep existing skeleton/error behavior. |
| Voice report | Preserve existing voice metrics, CSV download, and duration chart. |
| Non-voice schedules | Keep existing queue/progress details below the new header. |
| Fallbacks | Use `Campanha não informada` when `campaignName` is null. Use existing local type/status labels only as fallback. |
| Docs | Update `docs/features/broadcasts.md` with the report header behavior. |

## UI Order

| Position | Content |
|---|---|
| 1 | Back action. |
| 2 | Header badges: type, campaign, status. |
| 3 | Broadcast title. |
| 4 | Schedule metadata/details. |
| 5 | Voice report metrics or non-voice loading/progress details. |

## Constraints

| Rule | Value |
|---|---|
| Components | Reuse existing design system badges/buttons/styles where possible. |
| Layout | Do not create a marketing hero. |
| Responsiveness | Header text must wrap cleanly on mobile. |
| Copy | Do not add instructional explanatory text to the page. |
