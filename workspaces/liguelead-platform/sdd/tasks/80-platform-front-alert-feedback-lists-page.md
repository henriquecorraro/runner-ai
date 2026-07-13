---
id: platform-front-alert-feedback-lists-page
title: Add alert feedback to Lists page
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
src/pages/Lists/Lists.tsx
src/pages/Lists/components/ListsContent.tsx
src/components/CreateLeadListDialog/CreateLeadListDialog.tsx
src/components/MergeListsDialog/MergeListsDialog.tsx
src/components/CreateListFromFilterModal/CreateListFromFilterModal.tsx
```

## Requirements

- Use `useAppAlert()` for list operations.
- Show success alert for create list, delete list, merge list, create from filter, and update operations when present.
- Show danger alert for failed list mutations and failed explicit user-triggered actions.
- Keep dialog field validation inline.
- Replace local operation-only success/error messages with shared alerts where applicable.
- Do not use browser alerts.
