---
id: i18n-translate-broadcasts-pages
title: i18n: Translate Broadcasts pages
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
  - i18n-create-locale-aware-formatters-helper
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710494402
github_issue_number: 96
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/96
github_issue_node_id: I_kwDORqaAXc8AAAABGMRwwg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/96
github_project_item_id: 202914560
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOwA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914560"
github_project_status: Done
---

## Scope

Translate Broadcasts domain (actions, schedules, wizards, report). Namespace: `broadcasts`.

## Files to modify

- `src/pages/Broadcasts/Broadcasts.tsx`
- `src/pages/Broadcasts/components/BroadcastActionsContent.tsx`
- `src/pages/Broadcasts/components/BroadcastSchedulesContent.tsx`
- `src/pages/Broadcasts/components/BroadcastActionWizard.tsx`
- `src/pages/Broadcasts/components/BroadcastScheduleWizard.tsx`
- `src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx`
- `src/pages/Broadcasts/components/BroadcastReportChart.tsx`
- `src/pages/Broadcasts/components/BroadcastContentPicker.tsx`
- `src/hooks/tables/useBroadcastActionsColumns.tsx`
- `src/hooks/tables/useBroadcastSchedulesColumns.tsx`
- `src/service/broadcasts/broadcasts-service.types.ts` (BROADCAST_TYPE_LABELS)

## Key translations

- statusLabels: Rascunho/EM ANÁLISE/AGENDADO/Iniciado/Finalizado/Cancelado/CONCLUÍDO/Expirado/PAUSADO
- BROADCAST_TYPE_LABELS: Ligação/Ligação com interação/SMS/SMS Flash
- Page headers, counter with pluralization, schedule summary
- Wizard: step labels, field labels, validation messages, audience config
- Report: chart labels, metric labels, download button
- Interpolation for schedule summary: `"{{date}} das {{start}} às {{limit}}"`, `"{{count}} lead(s)"`

## Constraints

- `statusLabels` and `BROADCAST_TYPE_LABELS` must be moved to i18n keys.
- Do NOT translate user-entered broadcast titles, campaign names, or tag names.
- Replace `toLocaleDateString('pt-BR')` and `toLocaleString('pt-BR')` with formatters.
- This is the largest task — provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
