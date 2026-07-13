---
id: platform-front-framer-motion-transitions
title: Add Framer Motion transitions to Platform Frontend views
scope: platform-front-motion
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
---

## Context
Platform Frontend needs smoother animated transitions, starting with the call scheduling reports navigation flow and using Framer Motion as the animation library.

## Goal
Install and integrate Framer Motion in Platform Frontend, then apply tasteful route/view transitions for the updated reports page flow.

## Requirements
- Add Framer Motion to the project dependency set using the package manager already used by `platform-front`.
- Introduce a small reusable transition pattern for route or view changes that matches the existing app architecture.
- Apply the transition to the call scheduling reports page/list navigation flow created for the reports page work.
- Keep animations restrained, accessible, and compatible with loading/error states.
- Avoid broad visual redesigns outside the transition behavior.

## Notes
- Prefer an implementation that can be reused by future pages without forcing immediate adoption across the whole app.
- Respect existing layout conventions and route structure.
