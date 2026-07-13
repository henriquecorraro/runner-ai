---
id: platform-front-alert-feedback-sms-page
title: Add alert feedback to SMS page
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
src/pages/Sms/Sms.tsx
src/pages/Sms/components/SmsContent.tsx
src/pages/Sms/components/SmsDialog.tsx
src/pages/Sms/components/SmsShortLinksDialog.tsx
```

## Requirements

- Use `useAppAlert()` for SMS template/message operations.
- Show success alert for create, update, delete, send/test, and short-link attach operations when present.
- Show danger alert for failed SMS mutations and failed explicit user-triggered actions.
- Keep message/form validation inline.
- Do not use browser alerts.
