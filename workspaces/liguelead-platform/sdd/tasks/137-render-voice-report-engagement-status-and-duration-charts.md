---
id: render-voice-report-engagement-status-and-duration-charts
title: "Render voice report engagement, status, and duration charts"
scope: broadcast-voice-report-analytics
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/broadcasts.md
depends_on:
  - expose-voice-report-analytics-through-middleware
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4708527234
github_issue_number: 81
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/81
github_issue_node_id: I_kwDORqaAXc8AAAABGKZsgg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/81
github_project_item_id: 202792497
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwWXjE
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202792497"
github_project_status: Done
---

## Files

```text
src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx
src/pages/Broadcasts/components/BroadcastReportChart.tsx
src/pages/Broadcasts/Broadcasts.styles.ts
src/service/broadcasts/broadcasts-service.types.ts
package.json
package-lock.json
docs/features/broadcasts.md
```

## Placement

- Add three analytics cards below metric cards and the execution timeline.
- Render the engagement funnel at full width.
- Render status distribution and duration distribution in a two-column row.
- Stack all cards at `<= 840px`.
- Use page section background near `#F6F5F2` only where compatible with the existing page shell.

## Shared card shell

| Property | Value |
|---|---|
| background | `#FFFFFF` |
| border | `1px solid #E5E7EB` |
| radius | `6px..8px` |
| shadow | subtle existing dashboard shadow token |
| header title | `15px`, weight `600` |
| header description | `12px`, `#7A7F87` |
| divider | `1px solid #E5E7EB` |
| technical pill | blue/lilac soft surface, monospace, `10px..11px` |

- Use a green chart-specific icon before each title.
- Keep header/content padding comfortable and consistent across all cards.
- Do not use generic chart-library legends, axes, ticks, grids, or frames.
- Install `echarts` as a production dependency; do not install a second chart library.
- Import tree-shakeable modules from `echarts/core` and register only required charts, components, and `CanvasRenderer`.
- Create a reusable React chart adapter that initializes once per DOM node, updates options on prop changes, resizes with `ResizeObserver`, and calls `dispose()` on unmount.
- Keep legends, insight strips, labels, and card shells as React/styled-components UI outside ECharts.

## Engagement funnel

### Header

| Field | Value |
|---|---|
| title | `Funil de engajamento` |
| technical pill | `Σ cálculo` |
| description | `Sem URA, o funil mostra a qualidade da escuta do áudio` |

### Stages

| Stage | Helper | Value | Bar width | Right metric |
|---|---|---:|---:|---:|
| `Discado` | `Total de ligações discadas` | `engagement.totalDialed` | `100%` | `100%` |
| `Atendido` | `Ligações atendidas` | `engagement.answered` | `answeredPercentOfDialed` | `answeredPercentOfDialed` |
| `Ouviu o áudio inteiro` | `Ouviu 90% ou mais do áudio` | `engagement.fullyListened` | `fullyListened / totalDialed` | `fullyListenedPercentOfAnswered` |

- Build three aligned horizontal tracks with an ECharts horizontal bar series; do not use the ECharts funnel series.
- Use a left label column, center track column, and right total/percentage column.
- Use `42px` track height, `#EEEDE9` track background, and rounded corners.
- Start every fill at the same x-coordinate.
- Clamp visual fill widths to `0..100`; do not mutate displayed values.
- Render fill values right-aligned inside bars in white, `14px`, weight `700`.
- Render right totals in monospace, `21px`, weight `600`; render percentages in `11px` muted text.

| Stage | Fill |
|---|---|
| Discado | `linear-gradient(90deg, #79D8C5, #11C7AA)` |
| Atendido | `#00BFA5` |
| Ouviu o áudio inteiro | `#079981` |

- Configure ECharts fill animation from left to right for `600ms..800ms` with smooth easing.
- Add a bottom insight strip: `#DFF6F3` surface, turquoise left border, gold star, `12px` text.
- Highlight `fullyListenedPercentOfAnswered` in turquoise with weight `700`.
- Hide the third stage when `audioDurationSeconds === null`; render unavailable-data copy in the insight strip.

## Status distribution

### Header

| Field | Value |
|---|---|
| title | `Resultado por status` |
| technical pill | `action_voice_report_status_buckets` |
| description | `Distribuição consolidada das ligações discadas` |

### Donut

- Build a continuous ECharts pie series with inner/outer radius configured as a donut; do not add separators between arcs.
- Use `150px` diameter and `23px..26px` ring thickness.
- Keep the center white.
- Set `totalAudience = detail.totalShipping ?? (engagement.totalDialed + summary.notDialed)`.
- Render `totalAudience` centered in monospace, `25px..28px`, weight `600`.
- Render `LEADS` below in uppercase, `10px`, weight `600`, muted letter spacing.
- Animate clockwise drawing with subtle `600ms..800ms` duration.
- Omit zero-value arcs; preserve zero-value legend rows.
- Render an empty state when `totalAudience === 0`.

### Display mapping

| Display key | Label | Total source | Percentage denominator |
|---|---|---:|---:|
| answered | `Atendidas` | `statusDistribution[answered].total` | `totalAudience` |
| not_answered | `Não atendidas` | `statusDistribution[not_answered].total` | `totalAudience` |
| busy_congestion | `Ocupado / congestão` | `statusDistribution[busy_congestion].total` | `totalAudience` |
| invalid_no_route | `Não encontrado / rota inválida` | `statusDistribution[invalid_no_route].total` | `totalAudience` |
| not_dialed | `Não discadas` | `summary.notDialed` | `totalAudience` |

- Use the four persisted backend buckets as input; do not request another backend status bucket.
- Keep `invalid_no_route` and `not_dialed` as separate slices; do not merge either into `not_answered`.
- Do not display a mailbox or voicemail legend row.
- Calculate every displayed percentage as `100 * displayTotal / totalAudience`; return `0` for a zero denominator.
- Ensure the five displayed totals sum to the represented audience for valid report data.

### Legend

| key | color |
|---|---|
| answered | `#08BEA3` |
| not_answered | `#5799EF` |
| busy_congestion | `#F59A08` |
| invalid_no_route | `#91A0B5` |
| not_dialed | `#CBD5E1` |

- Render a custom vertical legend to the donut right.
- Do not render a separate mailbox/voicemail legend item; mailbox is included in `answered` by the API contract.
- Render an `11px` rounded color square, `13px` weight-600 label, `10px..11px` technical key, right-aligned total, and muted percentage.
- Keep totals and percentages aligned in stable columns.
- Stack donut and legend at narrow card widths.

## Duration distribution

### Header

| Field | Value |
|---|---|
| title | `Distribuição de duração` |
| technical pill | `action_voice_report_duration_buckets` |
| description | `Quantos atendidos por faixa de tempo` |

### Display groups

Aggregate persisted `durationBuckets` into up to six ordered display groups:

| Group | Range |
|---|---|
| 1 | `0..5s` |
| 2 | `6..10s` |
| 3 | `11..20s` |
| 4 | `21..30s` |
| 5 | `31s..(ceil(audioDurationSeconds * 0.90) - 1)` |
| 6 | `ceil(audioDurationSeconds * 0.90)+` |

- Collapse invalid or overlapping groups for short audio durations.
- Assign each persisted bucket exactly once; do not fabricate or duplicate totals.
- Fall back to ordered persisted buckets when `audioDurationSeconds === null`.
- Percentage denominator: sum of displayed bucket totals.

### Bars

- Render an ECharts bar series from one aligned top baseline and grow downward.
- Do not render y-axis, ticks, grid, or outer plot frame.
- Use wide bars, short uniform gaps, and `4px` radius on the visual top corners only.
- Render each total centered near the bar top in white, `12px`, weight `700`.
- Render turquoise percentage in `10px`, weight `700`, below each bar.
- Render range label in monospace, `10px`, muted, below percentage.
- Add a gold star to the final range label.
- Add a thin baseline below labels.

| Position | Fill |
|---|---|
| 1 | `#FFB115` |
| 2 | `#FFA30B` |
| 3..6 | progressively stronger aqua/turquoise vertical gradients |

- Animate bars downward from the top for `600ms..800ms` with smooth easing.
- Add an insight strip `24px` below the chart using the funnel insight style.
- Highlight the percentage of answered calls lasting at least `30s`.
- Keep the existing empty state when all bucket totals are zero.
- Allow horizontal scrolling on mobile when labels would overlap.

## Interaction and accessibility

- Add accessible chart summaries and labels for each stage, arc, legend row, and duration bar.
- Honor `prefers-reduced-motion` by disabling growth/draw animations.
- If tooltips are implemented, use white background, thin border, `6px` radius, subtle shadow, and dashboard typography.
- Configure ECharts with `aria.enabled = true` and disable its default legend.
- Preserve metric cards, dark execution timeline, CSV download, pause controls, loading states, and existing page animations.
- Extend service types and fixtures; do not use mock chart values.

## Documentation

- Update `docs/features/broadcasts.md` with chart placement, data mappings, responsive behavior, and empty states.

## Validation

```bash
npm run lint
npm run build
```
