---
id: broadcast-voice-report-kpis-middleware
title: Expose voice report KPI fields in middleware contract
scope: broadcast-reports
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
depends_on:
  - broadcast-voice-report-kpis-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4697218254
github_issue_number: 60
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/60
github_issue_node_id: I_kwDOR6h3H88AAAABF_nczg
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/60
github_project_item_id: 202211429
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwNgGU
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202211429"
github_project_status: Done
---

## Files

| Path | Change |
| --- | --- |
| `src/domains/broadcasts/contracts.ts` | Extend `broadcastVoiceReportSchema.summary`. |
| `src/tests/route-contracts.test.ts` | Assert new summary fields. |
| `docs/domains/README.md` | Document report summary additions. |
| `docs/contracts-and-routes/README.md` | Document public contract additions. |
| `docs/public-api/openapi.json` | Regenerate with `npm run docs:openapi`. |

## Summary Contract

```ts
type BroadcastVoiceReportSummary = {
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

## Constraints

Do not add S3 JSON contract fields.
Do not expose internal `actions` columns directly.
Do not make existing `reportUrl` required.
Keep `/broadcasts/schedules/:id/report/download` unchanged.
