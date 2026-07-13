---
id: broadcast-action-aggregate-report-middleware-contract
title: Broadcast Action Aggregate Report Middleware Contract
scope: broadcast-action-reporting
status: done
repositories:
  - middleware
validation:
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm test"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
docs_targets:
  - middleware:docs/domains/README.md
  - middleware:docs/domains/broadcasts.md
  - middleware:docs/contracts-and-routes/README.md
  - middleware:docs/public-api/openapi.json
depends_on:
  - broadcast-action-aggregate-report-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4748136209
github_issue_number: 64
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/64
github_issue_node_id: I_kwDOR6h3H88AAAABGwLPEQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/64
github_project_item_id: 205046510
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgw4wu4
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205046510"
github_project_status: Done
---

## Files

| Path | Operation |
| --- | --- |
| `src/domains/broadcasts/contracts.ts` | add aggregate report schemas/types |
| `src/domains/broadcasts/routes.ts` | add proxy route before `/broadcasts/actions/:id` |
| `src/tests/route-contracts.test.ts` or route fixtures | cover route resolution/schema |
| `docs/domains/README.md` | document route |
| `docs/domains/broadcasts.md` | document aggregate contract |
| `docs/contracts-and-routes/README.md` | document route family |
| `docs/public-api/openapi.json` | regenerate via `npm run docs:openapi` |

## Route

| Method | Path | Auth | Target |
| --- | --- | --- | --- |
| `GET` | `/broadcasts/actions/:id/report` | `session` | `NEW_BACKEND_URL` |

## Route Order

- Register `/broadcasts/actions/:id/report` before `/broadcasts/actions/:id`.
- Keep `/broadcasts/schedules/:id/report` unchanged.
- Keep `/broadcasts/schedules/:id/report/download` unchanged.

## Zod Contract

```ts
const broadcastActionAggregateReportSchema = z.object({
  broadcastAction: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    typeId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    status: z.union([z.literal("draft"), z.literal("saved"), z.literal("archived")]),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
  }),
  reportType: z.union([z.literal("voice"), z.literal("sms")]),
  scheduleCount: z.number(),
  generatedReportCount: z.number(),
  latestScheduleAt: z.string().nullable(),
  latestReportAt: z.string().nullable(),
  totals: z.object({
    totalShipping: z.number(),
    totalCredits: z.number(),
    chargedAmount: z.number(),
  }),
  voice: z.object({
    summary: z.object({
      totalDialed: z.number(),
      totalAttempts: z.number(),
      notDialed: z.number(),
      answered: z.number(),
      notAnswered: z.number(),
      answeredPercent: z.number(),
      notAnsweredPercent: z.number(),
      dtmfCount: z.number(),
      dtmfPercent: z.number(),
      interactionSmsSent: z.number(),
      credits: z.number(),
      creditsToCharge: z.number(),
      chargedAmount: z.number(),
      avgListenedSeconds: z.number(),
      totalListenedSeconds: z.number(),
      billableCalls: z.number(),
      failedCount: z.number(),
    }),
    engagement: z.object({
      totalDialed: z.number(),
      answered: z.number(),
      fullyListened: z.number(),
      audioDurationSeconds: z.number().nullable(),
      fullyListenedThresholdPercent: z.literal(90),
      answeredPercentOfDialed: z.number(),
      fullyListenedPercentOfAnswered: z.number(),
    }),
    durationBuckets: z.array(z.object({
      label: z.string(),
      minSeconds: z.number(),
      maxSeconds: z.number().nullable(),
      total: z.number(),
    })),
    statusDistribution: z.array(z.object({
      key: z.union([z.literal("answered"), z.literal("not_answered"), z.literal("busy_congestion"), z.literal("invalid_no_route")]),
      label: z.string(),
      total: z.number(),
      percentOfDialed: z.number(),
    })),
  }).optional(),
  sms: z.object({
    summary: z.object({
      totalLeads: z.number(),
      totalSent: z.number(),
      sentPercent: z.number(),
    }),
  }).optional(),
  schedules: z.array(z.object({
    id: z.number(),
    typeId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    statusId: z.number(),
    statusLabel: z.string(),
    date: z.string(),
    startTime: z.string().nullable(),
    limitTime: z.string().nullable(),
    totalShipping: z.number(),
    campaignId: z.number().nullable(),
    campaignName: z.string().nullable(),
    reportGenerated: z.boolean(),
    reportUrl: z.string().nullable(),
    summary: z.record(z.string(), z.number()).nullable(),
  })),
});
```

## Constraints

- Middleware must validate and proxy only; do not recalculate metrics.
- Preserve backend error `BROADCAST_ACTION_NOT_FOUND` and status `404`.
- Keep authenticated `public-id`/`user-id` session behavior identical to other broadcast routes.
- Do not expose or proxy aggregate CSV download; per-schedule CSV remains the existing route.

## Documentation

- Document that `/broadcasts/actions/:id/report` is aggregate by saved broadcast definition.
- Document that `/broadcasts/schedules/:id/report` is per execution/schedule.
- Regenerate OpenAPI output.
