---
id: platform-front-alert-feedback-leads-page
title: Add alert feedback to Leads page
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
src/pages/Leads/Leads.tsx
src/pages/Leads/components/LeadsContent.tsx
src/pages/Leads/components/LeadsSummaryCards.tsx
src/hooks/tables/useLeadColumns.tsx
```

## Requirements

- Use `useAppAlert()` for user-triggered leads operations.
- Show success alert for successful create/update/delete/import/link actions when present.
- Show danger alert for failed mutations and failed user-triggered refresh/export actions when present.
- Keep query empty states and persistent load errors in page UI, not global alerts.
- Do not show alerts for passive background refetch failures unless triggered by explicit user action.
- Do not use browser alerts.
