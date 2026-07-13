---
id: platform-front-alert-feedback-broadcasts-page
title: Add alert feedback to Broadcasts page
scope: platform-front-alert-feedback
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - platform-front/docs/features/feedback-alerts.md
depends_on:
  - platform-front-alert-feedback-foundation
---

## Files

```text
src/pages/Broadcasts/Broadcasts.tsx
src/pages/Broadcasts/components/BroadcastActionsContent.tsx
src/pages/Broadcasts/components/BroadcastSchedulesContent.tsx
src/pages/Broadcasts/components/BroadcastActionWizard.tsx
src/pages/Broadcasts/components/BroadcastScheduleDetailsView.tsx
src/pages/Broadcasts/components/BroadcastAudienceStep.tsx
src/pages/Broadcasts/components/BroadcastContentPicker.tsx
```

## Requirements

- Use `useAppAlert()` for broadcast action and schedule operations.
- Show success alert for create action, update action, cancel schedule, delete/cancel action, start/send, and report/download actions when present.
- Show danger alert for failed mutations and failed explicit user-triggered actions.
- Keep multi-step wizard validation inline.
- Keep persistent schedule/action statuses in page UI, not global alerts.
- Do not use browser alerts.
