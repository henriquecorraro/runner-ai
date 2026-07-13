---
id: audit-dropdown-select
title: Audit DropdownSelect for DS migration eligibility
scope: ds-migration-audit
status: done
repositories:
  - platform-front
  - design-system
validation:
  - Verdict is clearly stated as DS_CANDIDATE or KEEP_IN_APP
  - Justification references concrete evidence from code inspection
---

## Objective

Analyze `platform-front/src/components/DropdownSelect` and determine if it is a generic, reusable UI component suitable for the design-system package, or a domain-specific component that must stay in platform-front.

## Evaluation Criteria

| Criterion | DS candidate | Stay in platform-front |
|-----------|-------------|----------------------|
| Has business logic / API calls | ❌ | ✅ |
| References app-specific context/stores | ❌ | ✅ |
| Pure presentational / form control | ✅ | ❌ |
| Reusable across multiple apps | ✅ | ❌ |
| Already has equivalent in DS | ❌ (skip) | — |

## Steps

1. Read all files in `platform-front/src/components/DropdownSelect/`
2. Check imports — flag any app-specific dependencies (stores, services, API clients, app routes)
3. Check if design-system already exports an equivalent component
4. Produce verdict: `DS_CANDIDATE` or `KEEP_IN_APP` with one-line justification
5. If DS_CANDIDATE, list any modifications needed to make it generic

## Output

Add a comment to this task with the verdict and reasoning.
