---
id: limit-rcs-enablement-request-per-client
title: Limit RCS enablement requests to one per client
scope: rcs-agents
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
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4867962256
github_issue_number: 130
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/130
github_issue_node_id: I_kwDORpoJ688AAAABIic1kA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/130
  - https://github.com/ligue-lead-tech/platform-front/issues/142
github_project_item_id: 212065959
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyj3qc
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=212065959"
github_project_status: Done
---

## Repositories

| Repository | Changes |
|---|---|
| platform-api | Enforce one RCS enablement request per client and add client uniqueness constraint |
| platform-front | Replace multi-agent list behavior with one-request navigation and terminology |
| areadocliente | Enforce one request in legacy service and replace multi-agent entry actions |

## Invariant

- Allow at most one `rcs_agents` row per `client_id`.
- Treat the row as an RCS sending enablement request, not a collection of independently registered agents.
- Preserve existing routes and payload contracts.
- Preserve edit, submit, ownership, file upload, and status rules.

## API

- Add `UNIQUE KEY uniq_rcs_agents_client_id (client_id)` to migration `028-create-rcs-agents.sql`.
- Check for an existing client row before protocol generation and create.
- Return HTTP `409` with code `RCS_REQUEST_ALREADY_EXISTS` on duplicate creation.
- Keep the database unique constraint as the concurrency safeguard.
- Add focused use-case tests for first creation and duplicate rejection.

## Frontend

- Hide every new-request action when a request exists.
- Make `/rcs/agents/new` reuse or redirect to the existing request instead of creating another row.
- Change user-facing primary terminology from agents to RCS enablement request where applicable.
- Keep status history/table behavior compatible with pre-existing duplicate development data by selecting the newest request.

## Legacy

- Reject duplicate create attempts in `RcsAgents_service`.
- Hide new-request actions when a request exists.
- Keep existing rows accessible.
- Use customer-friendly RCS enablement request terminology.

## Validation

```bash
cd /home/rick/projetos/platform-api
npm run typecheck
npm test
npm run build

cd /home/rick/projetos/platform-front
npm run lint
npm run build
```
