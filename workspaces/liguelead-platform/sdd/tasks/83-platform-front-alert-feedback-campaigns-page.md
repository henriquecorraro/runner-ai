---
id: platform-front-alert-feedback-campaigns-page
title: Add alert feedback to Campaigns page
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
src/pages/Campaigns/Campaigns.tsx
src/pages/Campaigns/components/CampaignsContent.tsx
src/pages/Campaigns/components/CampaignDialog.tsx
```

## Requirements

- Use `useAppAlert()` for campaign create/update/delete/toggle operations.
- Show success alert for successful campaign mutations.
- Show danger alert for failed campaign mutations and failed explicit user-triggered actions.
- Keep dialog field validation inline.
- Do not use browser alerts.
