---
id: expose-voice-report-analytics-through-middleware
title: Expose voice report analytics through middleware
scope: broadcast-voice-report-analytics
status: open
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
docs_targets:
  - docs/
depends_on:
  - persist-voice-report-engagement-and-status-analytics
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4708525972
github_issue_number: 62
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/62
github_issue_node_id: I_kwDOR6h3H88AAAABGKZnlA
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/62
github_project_item_id: 202792431
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwWXe8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202792431"
github_project_status: Todo
---

## Route contract

- Update the existing proxy contract for `GET /broadcasts/schedules/:id/report`.
- Preserve authentication, client scoping, backend target, path, and error passthrough.
- Add the following response fields without changing existing fields:

```ts
type VoiceReportAnalytics = {
  engagement: {
    totalDialed: number;
    answered: number;
    fullyListened: number;
    audioDurationSeconds: number | null;
    fullyListenedThresholdPercent: 90;
    answeredPercentOfDialed: number;
    fullyListenedPercentOfAnswered: number;
  };
  statusDistribution: Array<{
    key: "answered" | "not_answered" | "busy_congestion" | "invalid_no_route";
    label: string;
    total: number;
    percentOfDialed: number;
  }>;
};
```

## Constraints

- Update Zod schemas, inferred types, route fixtures, contract tests, and generated OpenAPI artifacts.
- Require nonnegative integer totals.
- Require percentages in `0..100`.
- Require `audioDurationSeconds` to be a positive integer or `null`.
- Require exactly `90` for `fullyListenedThresholdPercent`.
- Reject unsupported status keys; do not expose a separate voicemail/mailbox key.
- Do not calculate analytics in middleware.
- Do not rename or remove `summary`, `durationBuckets`, `timeline`, or `pauses`.
- Update repository-local API documentation.

## Validation

```bash
npm run build
npm test
npm run docs:openapi
```
