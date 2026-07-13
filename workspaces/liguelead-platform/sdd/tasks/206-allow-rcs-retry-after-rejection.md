---
id: allow-rcs-retry-after-rejection
title: Allow a new RCS request after rejection
scope: rcs-agents
status: open
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
github_issue_id: 4868436962
github_issue_number: 131
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/131
github_issue_node_id: I_kwDORpoJ688AAAABIi5z4g
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/131
  - https://github.com/ligue-lead-tech/platform-front/issues/143
github_project_item_id: 212096591
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgykVk8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=212096591"
github_project_status: Testing
---

## Repositories

| Repository | Changes |
|---|---|
| platform-api | Allow a new RCS request only after the previous request is rejected |
| platform-front | Show rejected request reason and expose a new-request action |
| areadocliente | Mirror rejected retry behavior in legacy flow |

## Rules

- Allow at most one non-rejected RCS request per client.
- Preserve rejected requests as history.
- Allow `POST /rcs-agents` when every existing request for the client has status `reprovado`.
- Return `409 RCS_REQUEST_ALREADY_EXISTS` when any request has another status.
- Remove the database unique constraint on `client_id`; retain a normal client index.
- Keep protocol uniqueness.

## UI

- Display the newest request as the primary status card.
- When the newest request is rejected, display `rejectionReason` prominently.
- Show `Fazer nova solicitação`.
- Navigate to the new request form without redirecting back to the rejected request.
- Do not allow editing the rejected request as the retry path.
- Keep previous rejected rows returned by the existing list endpoint.

## Validation

```bash
cd /home/rick/projetos/platform-api && npm run typecheck && npm test && npm run build
cd /home/rick/projetos/platform-front && npm run lint && npm run build
```
