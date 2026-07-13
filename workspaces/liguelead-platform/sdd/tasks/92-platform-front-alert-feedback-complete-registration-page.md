---
id: platform-front-alert-feedback-complete-registration-page
title: Add alert feedback to Complete Registration page
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
src/pages/CompleteRegistration/CompleteRegistration.tsx
src/pages/CompleteRegistration/CompleteRegistration.styles.ts
```

## Requirements

- Use `useAppAlert()` for registration-completion operations.
- Show success alert when profile/registration save succeeds before navigation or visible completion state.
- Show danger alert for load failure after explicit retry, save failure, API validation errors, network errors, and unexpected failures.
- Keep field-level validation inline.
- Preserve redirect behavior back to `/credits/buy` when applicable.
- Do not use browser alerts.
