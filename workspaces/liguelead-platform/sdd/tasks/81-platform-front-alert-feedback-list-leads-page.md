---
id: platform-front-alert-feedback-list-leads-page
title: Add alert feedback to List Leads page
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
src/pages/ListLeads/ListLeads.tsx
src/pages/ListLeads/components/ListLeadsContent.tsx
```

## Requirements

- Use `useAppAlert()` for lead-list detail operations.
- Show success alert for successful remove lead, bulk action, import, export, refresh, or update actions when present.
- Show danger alert for failed mutations and failed explicit user-triggered actions.
- Keep empty state and persistent query error state in page UI.
- Do not use browser alerts.
