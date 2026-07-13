---
id: rename-credits-entry-point-and-open-the-credits-area
title: Rename credits entry point and open the Credits area
scope: credits
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
---

## Context
The current frontend has a button labeled `Comprar Créditos`. The requested behavior is to change this entry point to `Créditos` and use it to open the Credits management area shown in the first reference screenshot.

## Requirements
- Find the current `Comprar Créditos` entry point in the platform frontend.
- Change the visible label to `Créditos`.
- Route/open the Credits area instead of opening the purchase screen directly.
- Preserve the existing placement, permission behavior, and surrounding navigation patterns unless the current implementation already has a better local convention for management screens.
- Keep user-facing strings in Portuguese.

## Reference UI Details
- The current direct-purchase action should become a management-area entry point.
- The visible string should be exactly `Créditos`, not `Comprar Créditos`.
- The destination should be the overview/management screen whose header reads `Créditos` and whose visual direction is closer to a financial dashboard than to a checkout page.
- The purchase CTA remains available inside the overview screen as `Comprar Crédito`.

## Acceptance Criteria
- The entry point visible to the user reads `Créditos`.
- Activating it opens the Credits area/overview screen.
- The purchase screen is no longer the first screen shown from that entry point.
- Existing access control and navigation behavior continue to work.
