---
id: add-save-only-action-to-broadcast-creation
title: Add save-only action to broadcast creation
scope: broadcast-schedule-ux
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/broadcasts.md
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4803605220
github_issue_number: 128
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/128
github_issue_node_id: I_kwDORqaAXc8AAAABHlEy5A
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/128
github_project_item_id: 208318798
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxqsU4
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208318798"
github_project_status: Done
---

## UI

- Add a secondary `SALVAR` button beside `SALVAR E AGENDAR` in `src/pages/Broadcasts/components/BroadcastActionWizard.tsx`.
- Reuse the existing broadcast action persistence flow.
- Keep `SALVAR E AGENDAR` behavior unchanged.
- Disable both submit actions while persistence is running.

## Navigation

| Action | Destination |
|---|---|
| `SALVAR` | `/broadcasts` |
| `SALVAR E AGENDAR` | `/broadcasts/actions/{saved.id}/schedule` |

## Constraints

- Do not create a schedule when `SALVAR` is selected.
- Do not duplicate validation or payload construction.
- Use existing button and layout components.

## Tests

- Cover save-only persistence and `/broadcasts` navigation.
- Cover save-and-schedule persistence and existing schedule navigation.
