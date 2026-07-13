---
id: broadcast-report-metric-cards-and-charged-amount
title: Broadcast voice report metric cards and charged amount summary
scope: broadcast-report-ui
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - platform-api:npm run typecheck
  - platform-api:npm test
  - platform-api:npm run build
  - platform-front:npm run lint
  - platform-front:npm run build
docs_targets:
  - platform-api:docs/human/modules/broadcasts.md
  - platform-front:docs/features/broadcasts.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4707104634
github_issue_number: 57
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/57
github_issue_node_id: I_kwDORpoJ688AAAABGJC3eg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/57
  - https://github.com/ligue-lead-tech/platform-front/issues/78
github_project_item_id: 202722927
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwVTm8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202722927"
github_project_status: Done
---

## Files
```text
platform-api/src/modules/broadcasts/entities/broadcast-send.entity.ts
platform-api/src/modules/broadcasts/repositories/broadcast-sends.repository.ts
platform-api/src/modules/broadcasts/mappers/broadcast-schedule-response.mapper.ts
platform-api/src/modules/broadcasts/contracts/broadcasts.contracts.ts
platform-api/tests/broadcast-sends.repository.spec.ts
platform-api/tests/broadcast-scheduling.use-cases.spec.ts
platform-api/docs/human/modules/broadcasts.md
platform-front/src/service/broadcasts/broadcasts-service.types.ts
platform-front/src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx
platform-front/src/pages/Broadcasts/Broadcasts.styles.ts
platform-front/docs/features/broadcasts.md
```

## API query
```sql
SELECT
  COALESCE(SUM(actions_has_fees.quantity), 0) AS chargedCredits,
  COALESCE(SUM(actions_has_fees.quantity * actions_has_fees.unity_value), 0) AS chargedAmount
FROM actions_has_fees
WHERE actions_has_fees.actions_id = :actionId
  AND actions_has_fees.status = 'used';
```

## API contract
```ts
type BroadcastVoiceReportSummary = {
  totalDialed: number;
  totalAttempts: number;
  notDialed: number;
  answered: number;
  notAnswered: number;
  answeredPercent: string;
  notAnsweredPercent: string;
  dtmfCount: number;
  dtmfPercent: string;
  interactionSmsSent: number;
  credits: number;
  creditsToCharge: number;
  chargedAmount: number;
  avgListenedSeconds: number;
  totalListenedSeconds: number;
  billableCalls: number;
  failedCount: number;
};
```

## API requirements
- Extend `BroadcastVoiceReportEntity` summary data with `chargedAmount`.
- Load `chargedAmount` from `actions_has_fees` in the same repository path that loads `action_voice_reports`.
- Keep `credits` sourced from `action_voice_reports.credits`.
- Keep `chargedAmount` as BRL decimal number in API responses. Do not convert to cents.
- Sum only rows with `status = 'used'`.
- Return `0` when no used fee rows exist.
- Do not mutate backfill logic, close worker billing logic, or route paths.
- Keep `GET /broadcasts/schedules/:id/report` response backward-compatible except for additive fields.

## Frontend contract
```ts
type TBroadcastVoiceReport['summary'] = {
  totalDialed: number;
  totalAttempts: number;
  notDialed: number;
  answered: number;
  notAnswered: number;
  answeredPercent: number;
  notAnsweredPercent: number;
  dtmfCount: number;
  dtmfPercent: number;
  interactionSmsSent: number;
  credits: number;
  creditsToCharge: number;
  chargedAmount: number;
  avgListenedSeconds: number;
  totalListenedSeconds: number;
  billableCalls: number;
  failedCount: number;
}
```

## Frontend requirements
- Replace the plain report summary grid in `BroadcastScheduleDetailsView` with metric cards.
- Use the established `platform-front` visual language: rounded surface cards, muted eyebrow label, emphasized main metric, secondary helper line, icon chip.
- Keep the duration buckets chart section intact.
- Render cards for at least: `Total dialed`, `Answered`, `Not answered`, `Average listened duration`, `Charged credits`.
- Use the current report values exactly as delivered by the API.
- `Answered` helper text must show `answeredPercent`.
- `Not answered` helper text must show `notAnsweredPercent`.
- `Average listened duration` helper text must show `totalListenedSeconds` formatted as human-readable duration.
- `Charged credits` main metric must show `summary.credits`; helper text must show formatted BRL from `summary.chargedAmount`.
- Keep remaining metrics visible as cards or compact secondary cards on the same report section.
- Add icons per metric using the icon set already used in the page codebase. Do not introduce a new icon dependency.
- Preserve mobile readability. Cards must stack cleanly on narrow widths.
- Do not remove CSV download behavior.

## Formatting rules
- Format BRL with `pt-BR` locale and `currency: 'BRL'`.
- Format duration seconds as `Xs`, `Ymin Zs`, `Hh Ymin` using the existing helpers when possible.
- Keep percentages with two decimals.

## Tests
- Add API coverage proving `chargedAmount` is included in the report payload and sums only `used` fee rows.
- Keep existing report retrieval specs passing.
- Adjust frontend types to compile with the additive API field.

## Documentation
- Update `platform-api/docs/human/modules/broadcasts.md` with the additive report summary field `chargedAmount` and its `actions_has_fees` source.
- Update `platform-front/docs/features/broadcasts.md` with the metric-card report layout and value mapping.

## Do not do
- Do not create a new endpoint.
- Do not read charged amount directly from `actions.cost`.
- Do not hide `failedCount`, `notDialed`, or `totalAttempts` from the report surface.
- Do not introduce mock values or frontend-only derived billing numbers.
