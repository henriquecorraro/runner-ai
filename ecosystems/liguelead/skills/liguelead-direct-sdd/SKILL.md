---
name: liguelead-direct-sdd
description: "Combined LigueLead SDD skill for work involving /home/rick/projetos/platform-api, /home/rick/projetos/middleware, and /home/rick/projetos/platform-front. Use for features, bug fixes, refactors, route contracts, API/frontend integration, task generation, and cross-repository behavior when Codex should follow mandatory SDD workflow, optionally hand execution to Ecosystem AI Runner, and respond in a concise, direct, low-fluff style."
---

# LigueLead Direct SDD

## Overview

Use this skill when a LigueLead platform task needs both:

1. the cross-repo SDD workflow from `liguelead-platform-ecosystem`;
2. the concise response style from `codex-direct-mode`.

## Responsibilities

This skill is a composition layer.

It should not become the source of truth for workflow or style rules.

## When To Use

Use it for work involving `/home/rick/projetos/platform-api`, `/home/rick/projetos/middleware`, and `/home/rick/projetos/platform-front` when the request involves:

- features
- bug fixes
- refactors
- route or contract changes
- API/frontend integration
- task generation
- cross-repository behavior

## Composition Order

Apply the two underlying skills in this order:

1. Follow `liguelead-platform-ecosystem` for workflow, repository rules, SDD discipline, docs, and validation.
2. Apply `codex-direct-mode` only to how the response is written.

If the two skills overlap, the ecosystem skill owns execution behavior and the direct mode skill owns response style.

## Runner Preference

When the user asks to execute prepared cross-repo tasks through automation, prefer the Ecosystem AI Runner in `/home/rick/projetos/ecosystem-ai-runner` instead of manually implementing repository by repository in the same session.

Typical command shapes:

```bash
cd /home/rick/projetos/ecosystem-ai-runner
npm run tasks -- \
  --config ecosystems/liguelead/ecosystem.config.json \
  --scope <scope-id>
```

Or, when you want one central task:

```bash
cd /home/rick/projetos/ecosystem-ai-runner
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --task <task-id>
```

## Source Of Truth

- Workflow, SDD, docs, validation, repo order: `liguelead-platform-ecosystem`
- Response style and brevity: `codex-direct-mode`
