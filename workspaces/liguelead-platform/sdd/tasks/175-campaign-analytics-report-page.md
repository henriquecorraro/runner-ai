---
id: campaign-analytics-report-page
title: Build campaign analytics report page
scope: campaigns
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/campaigns.md
depends_on:
  - campaign-analytics-report-api
  - campaign-analytics-report-middleware-contract
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4761341845
github_issue_number: 115
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/115
github_issue_node_id: I_kwDORqaAXc8AAAABG8xPlQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/115
github_project_item_id: 205729722
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxDL7o
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205729722"
github_project_status: Done
---

## Objective
Build the internal campaign report page at `/campaigns/:campaignId` and expose navigation from the campaigns table.

## Data
Consume `GET /campaigns/:id/report` without client-side aggregation.

## Header
- Render campaign name.
- Render exact subtitle `Visão geral da Campanha` in pt-BR.
- Add navigation-trail label.

## Primary metrics
Use the existing Broadcast report metric-card components and dimensions.
- Total sends.
- Leads reached.
- Weighted engagement rate.
- Total cost.
- Average cost per reached contact.

## Channel volume
- Render Voice, SMS, and SMS Flash only.
- Merge interactive voice into Voice data supplied by the API.
- Use official product themes from `credit-products.theme.ts`.
- Use solid product gradients, white text, and translucent icons.

## Daily chart
- Use the existing ECharts wrapper.
- Render grouped bars for 30 days.
- Use official product colors.
- Include responsive resizing, axis labels, legend, tooltip, accessibility, and reduced-motion behavior.

## Cost section
- Render compact neutral boards.
- Use product-colored icons and dark product-colored titles.
- Use neutral-dark monetary values.
- Render full-campaign total, proportional segmented bar, and uppercase compact legend.
- Do not show RCS or 30-day cost labels.

## Status section
- Use all non-deleted campaign Actions.
- Render centered donut total.
- Distinguish processing, generating report, scheduled, paused, cancelled, completed, and other.
- Render cancelled in red.

## Navigation
- Make campaign title clickable.
- Add `View report` to the campaign row action dropdown.

## Files
- `src/pages/Campaigns/components/CampaignReport.tsx`
- `src/pages/Campaigns/components/CampaignDailyVolumeChart.tsx`
- `src/pages/Campaigns/Campaigns.styles.ts`
- `src/pages/Campaigns/Campaigns.tsx`
- `src/pages/Campaigns/components/CampaignsContent.tsx`
- `src/service/campaigns/*`
- `src/hooks/queries/campaigns.queries.ts`
- `src/hooks/tables/useCampaignsColumns.tsx`
- `src/routes/AppRoutes.tsx`
- `src/components/Header/NavigationTrail.tsx`
- campaign and common locale files

## Acceptance
- Do not display calculation formulas or database-field legends.
- Do not display RCS.
- Keep metric cards floating outside white section wrappers.
- Support desktop and mobile widths.
- Pass lint and build.
