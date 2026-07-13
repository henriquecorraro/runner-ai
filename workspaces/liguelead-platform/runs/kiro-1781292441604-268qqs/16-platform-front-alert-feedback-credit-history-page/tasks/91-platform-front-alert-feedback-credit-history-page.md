---
id: platform-front-alert-feedback-credit-history-page
title: Add alert feedback to Credit History page
scope: platform-front-alert-feedback
status: open
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
src/pages/CreditHistory/CreditHistory.tsx
src/pages/CreditHistory/components/HistoryFilters.tsx
src/pages/CreditHistory/components/OrderDetailModal.tsx
```

## Requirements

- Use `useAppAlert()` for credit history user-triggered operations.
- Show success/info alert for copied/opened payment link, successful explicit refresh, and report/detail actions when present.
- Show danger alert for failed explicit refresh, failed order detail load after user action, failed link open, and network errors.
- Keep table empty state and persistent order detail errors in page/modal UI.
- Do not use browser alerts.
