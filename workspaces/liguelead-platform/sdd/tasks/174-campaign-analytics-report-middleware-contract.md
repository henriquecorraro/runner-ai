---
id: campaign-analytics-report-middleware-contract
title: Expose campaign analytics report middleware contract
scope: campaigns
status: done
repositories:
  - middleware
validation:
  - npm run build
  - npm test
  - npm run docs:openapi
docs_targets:
  - docs/public-api/openapi.json
depends_on:
  - campaign-analytics-report-api
github_issue_repo: ligue-lead-tech/middleware
github_issue_id: 4761341171
github_issue_number: 65
github_issue_url: https://github.com/ligue-lead-tech/middleware/issues/65
github_issue_node_id: I_kwDOR6h3H88AAAABG8xM8w
github_issue_urls:
  - https://github.com/ligue-lead-tech/middleware/issues/65
github_project_item_id: 205729702
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxDL6Y
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=205729702"
github_project_status: Done
---

## Objective
Expose and validate `GET /campaigns/:id/report` through the middleware.

## Route
| Method | Path | Auth | Target |
|---|---|---|---|
| GET | `/campaigns/:id/report` | session | `NEW_BACKEND_URL` |

## Contract
- Validate positive campaign id.
- Validate campaign identity, totals, three channels, exactly 30 daily-volume entries, and status distribution.
- Accept channel type ids `1 | 3 | 4` only.
- Accept status keys `completed | processing | reporting | scheduled | paused | cancelled | other`.
- Reject negative counts, percentages outside `0..100`, malformed ISO dates, and daily series with length other than 30.

## Files
- `src/domains/campaigns/contracts.ts`
- `src/domains/campaigns/routes.ts`
- `docs/public-api/openapi.json`

## Acceptance
- Preserve session authentication.
- Route must resolve before `/campaigns/:id`.
- Regenerate OpenAPI.
- Pass build and tests.
