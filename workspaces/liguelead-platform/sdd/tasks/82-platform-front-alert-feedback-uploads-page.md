---
id: platform-front-alert-feedback-uploads-page
title: Add alert feedback to Uploads page
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
src/pages/Uploads/Uploads.tsx
src/pages/Uploads/components/UploadsContent.tsx
src/components/LeadListUploadDialog/LeadListUploadDialog.tsx
```

## Requirements

- Use `useAppAlert()` for upload operations.
- Show success alert when upload is accepted/queued/completed according to existing flow.
- Show danger alert for upload validation failure, API failure, network error, and failed explicit retry.
- Preserve DS `Alert` only for persistent dialog-local instructions when not operation feedback.
- Do not use browser alerts.
