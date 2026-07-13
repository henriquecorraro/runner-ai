---
id: platform-front-alert-feedback-credits-page
title: Add alert feedback to Credits page
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
src/pages/Credits/Credits.tsx
src/components/AutoRechargeSection/AutoRechargeSection.tsx
```

## Requirements

- Use `useAppAlert()` for Credits dashboard operations.
- Show success alert for automatic-recharge create, update, and delete operations.
- Show danger alert for automatic-recharge create, update, delete, card load, saved-card requirement, duplicate rule, package/tariff, and network failures where operation feedback is needed.
- Replace local operation-only success/error text in `AutoRechargeSection` with shared alerts.
- Keep persistent empty states and tariff preview messages in component UI.
- Do not use browser alerts.
