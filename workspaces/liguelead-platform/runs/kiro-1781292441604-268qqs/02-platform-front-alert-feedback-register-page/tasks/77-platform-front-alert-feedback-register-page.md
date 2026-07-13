---
id: platform-front-alert-feedback-register-page
title: Add alert feedback to Register page
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
src/pages/Auth/Register/Register.tsx
src/pages/Auth/Register/Register.styles.ts
```

## Requirements

- Use `useAppAlert()` for registration submit feedback.
- Show success alert when account creation succeeds and user remains on current route long enough to see feedback.
- Show danger alert for API validation errors, duplicate account errors, network errors, and unexpected failures.
- Keep field-level validation inline.
- Do not use browser alerts.
