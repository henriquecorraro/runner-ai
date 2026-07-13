---
id: platform-front-alert-feedback-broadcast-schedule-wizard-page
title: Add alert feedback to Broadcast Schedule Wizard page
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
src/pages/Broadcasts/components/BroadcastScheduleWizard.tsx
src/pages/Broadcasts/components/BroadcastScheduleWizard.styles.ts
```

## Requirements

- Use `useAppAlert()` for broadcast scheduling flow.
- Show success alert when schedule is created successfully before navigation or on visible confirmation state.
- Show danger alert for estimate failure, schedule creation failure, insufficient credits API response, network error, and unexpected failure.
- Keep step validation inline.
- Preserve route behavior for `/broadcasts/actions/:id/schedule`.
- Do not use browser alerts.
