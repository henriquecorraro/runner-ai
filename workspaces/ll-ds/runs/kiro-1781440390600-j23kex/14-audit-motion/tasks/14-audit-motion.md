---
id: audit-motion
title: "Audit motion (AnimatedCard + Transition) for DS migration eligibility"
scope: ds-migration-audit
status: open
repositories:
  - platform-front
  - design-system
validation:
  - Verdict is clearly stated as DS_CANDIDATE or KEEP_IN_APP
  - Justification references concrete evidence from code inspection
---

## Objective

Analyze `platform-front/src/components/motion` (contains AnimatedCard.tsx and Transition.tsx) and determine if these are generic, reusable UI/animation components suitable for the design-system package, or domain-specific components that must stay in platform-front.

## Evaluation Criteria

| Criterion | DS candidate | Stay in platform-front |
|-----------|-------------|----------------------|
| Has business logic / API calls | ❌ | ✅ |
| References app-specific context/stores | ❌ | ✅ |
| Pure presentational / animation utility | ✅ | ❌ |
| Reusable across multiple apps | ✅ | ❌ |
| Already has equivalent in DS | ❌ (skip) | — |

## Steps

1. Read all files in `platform-front/src/components/motion/`
2. Check imports — flag any app-specific dependencies (stores, services, API clients, app routes)
3. Check if design-system already exports equivalent components
4. Produce verdict: `DS_CANDIDATE` or `KEEP_IN_APP` with one-line justification
5. If DS_CANDIDATE, list any modifications needed to make them generic

## Output

Add a comment to this task with the verdict and reasoning.
