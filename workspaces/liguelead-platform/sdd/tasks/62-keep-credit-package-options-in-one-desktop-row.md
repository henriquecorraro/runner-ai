---
id: keep-credit-package-options-in-one-desktop-row
title: Keep credit package options in one desktop row
scope: platform-front
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/credit-purchase.md
---

Adjust the credit purchase screen so package option cards for each credit type fit on a single row on desktop and notebook widths, while preserving readable responsive behavior on smaller screens. Use compact card content and layout rules grounded in responsive grid/flex references.
