---
id: platform-front-call-schedule-report-page
title: Replace call schedule reports modal with a dedicated page
scope: platform-front-call-scheduling
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
---

## Context
The call scheduling reports experience in Platform Frontend currently opens as a modal. The product direction is to make this report experience a full view/page instead of a modal.

## Goal
Replace the call schedule reports modal with a dedicated route-backed view and provide a clear button to return to the scheduling list.

## Requirements
- Identify the existing call scheduling reports modal entry point and preserve the current report data behavior.
- Implement a dedicated page/view for the reports experience instead of rendering it inside a modal.
- Add a visible back button/action that returns the user to the call scheduling list.
- Keep navigation consistent with the existing routing, layout, permissions, loading, and error patterns in `platform-front`.
- Remove or bypass the old modal trigger/state where it is no longer needed.

## Notes
- Preserve existing report filters, actions, and service calls unless the new page layout requires small presentational adjustments.
- Keep the implementation scoped to Platform Frontend.
