---
id: platform-front-alert-feedback-audios-page
title: Add alert feedback to Audios page
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
src/pages/Audios/Audios.tsx
src/pages/Audios/components/AudiosContent.tsx
src/pages/Audios/components/AudioDialog.tsx
```

## Requirements

- Use `useAppAlert()` for audio operations.
- Show success alert for create, update, delete, upload, and processing-trigger operations when present.
- Show danger alert for failed audio mutations, upload errors, unsupported file errors, network errors, and failed explicit user-triggered actions.
- Keep file/form validation inline.
- Do not use browser alerts.
