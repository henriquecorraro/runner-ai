---
name: ecosystem-operating-mode
description: "Always-on operating guide for ecosystem-ai-runner. Use whenever an AI agent works in this repository, manages ecosystem tasks, runs isolated agents, or needs to choose which ecosystem skills to follow before satisfying the user's request."
---

# Ecosystem Operating Mode

Use this as the umbrella skill for `ecosystem-ai-runner`.

This skill does not replace the other skills. It routes the agent to the right workflow and keeps repository work consistent.

## First Step

When working inside this runner:

1. Read `HOWTOUSE.md` if the current request is about this project, ecosystem task management, runner execution, or reusable skills.
2. Inspect `ecosystems/*/ecosystem.config.json` when an ecosystem must be chosen.
3. Read ecosystem-local skills under `ecosystems/<name>/skills/*/SKILL.md` when they exist for the selected ecosystem.
4. Use the most specific shared skill for the user's intent.

## Skill Routing

- Bootstrap or register repositories: use `ecosystem-bootstrap`.
- Create, split, normalize, or plan tasks: use `ecosystem-task-factory`.
- Execute tasks in the current chat by default, or via the runner only when the user explicitly chooses it: use `ecosystem-task-executor`.
- Close tasks only after developer validation: use `ecosystem-task-closer`.
- Shorter answers only when requested: use `codex-direct-mode`.

If more than one skill applies, use this skill first, then the more specific skill.

## Operating Rules

- Keep centralized planning in this runner.
- ENGLISH FIRST for ecosystem SDD: write all files under `ecosystems/<name>/sdd/`
  in English, including task titles, task bodies, textual frontmatter values,
  `Task Status` entries, and README notes. User chat can be in another language,
  but do not mirror that language into centralized SDD artifacts unless the user
  explicitly asks for a quoted user-facing phrase.
- Keep code and stable human docs in the owning repositories.
- Do not mark a task as `done` until the developer explicitly confirms the result is correct.
- During implementation, use `implemented` or `needs-rework` to match the actual state.
- Do not infer an ecosystem from an editor tab. If the user did not name one and the action needs one, discover available ecosystems and ask.
- Resolve contextual references like "essas tasks", "as tasks", or "pode fazer" against tasks created, changed, or discussed in the current conversation first.
- Execute selected tasks in the current chat by default to reuse existing context and reduce token cost.
- Use the runner only when the user explicitly asks for it, confirms it after being offered, or selects a large scope/open-task execution that benefits from isolated context.
- Run the narrowest useful validation for every touched repository.
- Do not revert unrelated user changes.

## Runner Prompt Rule

When creating prompts for isolated agents, include instructions to read this umbrella skill and the relevant specific skills before executing tasks.
