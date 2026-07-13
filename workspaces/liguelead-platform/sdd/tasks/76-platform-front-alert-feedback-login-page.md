---
id: platform-front-alert-feedback-login-page
title: Add alert feedback to Login page
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
src/pages/Auth/Login/Login.tsx
src/pages/Auth/Login/Login.styles.ts
```

## Requirements

- Use `useAppAlert()` for login mutation feedback.
- Show danger alert for invalid credentials, network errors, and unexpected auth failures.
- Show success/info alert only when current flow has a visible successful async operation before navigation.
- Preserve existing navigation behavior.
- Do not show duplicate inline error and global alert for the same submit failure unless inline error is field-specific.
- Do not use browser alerts.
