---
id: campaign-analytics-report-api
title: Implement campaign analytics report API
scope: campaigns
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - docs/human/modules/campaigns.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4761340434
github_issue_number: 80
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/80
github_issue_node_id: I_kwDORpoJ688AAAABG8xKEg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/80
github_project_item_id: 205729654
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxDL3Y
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205729654"
github_project_status: Done
---

## Objective
Implement `GET /campaigns/:id/report` using `actions.campaign_id` as the only campaign linkage.

## Consolidation rules
- Include KPI, channel, cost, and daily-volume data only when `actions.status_id = 7` and `NULLIF(TRIM(actions.action_report_url), '') IS NOT NULL`.
- Include every non-deleted campaign action in status distribution.
- Merge `types_id IN (1, 2)` into Voice.
- Keep SMS (`types_id = 3`) and SMS Flash (`types_id = 4`) separate.
- Do not expose RCS.

## Output
Return campaign identity, global totals, per-channel volume/cost/success metrics, 30 calendar days of daily volume with zero-filled dates, and status distribution.

```ts
type CampaignReport = {
  campaign: Campaign
  totals: {
    sendCount: number
    peopleReached: number
    engagementRate: number
    totalCost: number
    averageCostPerContact: number
  }
  channels: Array<{
    typeId: 1 | 3 | 4
    sendCount: number
    volume: number
    successCount: number
    successRate: number
    cost: number
  }>
  dailyVolume: Array<{
    date: string
    voice: number
    sms: number
    smsFlash: number
  }>
  status: {
    total: number
    distribution: Array<{
      key: 'completed' | 'processing' | 'reporting' | 'scheduled' | 'paused' | 'cancelled' | 'other'
      total: number
      percent: number
    }>
  }
}
```

## Status mapping
| Rule | Key |
|---|---|
| `status_id = 7` | `completed` |
| `status_id IN (4, 5)` | `processing` |
| `status_id = 6` without platform cancellation history | `reporting` |
| `status_id IN (2, 3)` | `scheduled` |
| `status_id = 12` | `paused` |
| `status_id = 6` with `actions_has_status.by_method = 'platform-api'` | `cancelled` |
| remaining statuses | `other` |

## Files
- `src/modules/campaigns/contracts/campaigns.contracts.ts`
- `src/modules/campaigns/controllers/campaigns.controller.ts`
- `src/modules/campaigns/entities/campaign.entity.ts`
- `src/modules/campaigns/repositories/campaigns.repository.ts`
- `src/modules/campaigns/routes/campaigns.routes.ts`
- `src/modules/campaigns/use-cases/campaigns.use-cases.ts`
- `tests/contracts/route-contract.registry.ts`
- `tests/setup/test-app.ts`

## Acceptance
- Enforce authenticated tenant ownership.
- Return HTTP 404 for unknown campaign.
- Return exactly 30 ordered daily-volume entries.
- Keep costs based on used fees.
- Pass typecheck, tests, and build.
