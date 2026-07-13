---
id: platform-front-alert-feedback-shortener-page
title: Add alert feedback to Link Shortener page
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
src/pages/LinkShortener/LinkShortener.tsx
src/pages/LinkShortener/components/ShortLinksContent.tsx
src/pages/LinkShortener/components/ShortLinkDialog.tsx
```

## Requirements

- Use `useAppAlert()` for short-link operations.
- Show success alert for create, update, delete, copy, activate/deactivate, and refresh actions when present.
- Show danger alert for failed mutations and failed explicit user-triggered actions.
- Keep URL/form validation inline.
- Do not use browser alerts.
