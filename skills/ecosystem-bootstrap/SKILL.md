---
name: workspace-bootstrap
description: "Create a new centralized workspace inside this runner project from one or more local repositories. Use when the user wants to register a new workspace, inspect local repositories, generate runner config, create the central SDD structure, and optionally add workspace-specific skills without requiring docs/sdd inside each repository."
---

# Workspace Bootstrap

## Overview

Use this skill to create a new workspace under `workspaces/<name>/` in this runner project.

The repositories of the workspace are treated as code sources, not as homes for the SDD queue.

When repositories already contain human-facing documentation, assess that documentation using [docs/human-doc-quality-rubric.md](../../docs/human-doc-quality-rubric.md).

Human documentation itself belongs in each corresponding repository. This runner stores only workspace config, SDD task files, run history, and docs-quality baselines.

## Goal

Generate a centralized workspace structure that the runner can execute without requiring `docs/sdd` inside the target repositories.

This skill only bootstraps the environment. It must not generate implementation tasks.

## Output Structure

Create this shape:

```text
workspaces/<name>/
  workspace.config.json
  skills/
  sdd/
    README.md
    tasks/
  runs/
```

## Workflow

Prefer the MCP `create_workspace` tool when available. Use manual file edits only
as a fallback or when the requested bootstrap needs repository-doc inspection
that the tool input does not already provide.

1. Read each repository root and its top-level docs, especially `README.md`, package manifests, and obvious validation scripts.
2. Identify repository ids, labels, stack, docs hints, and validation commands.
3. Choose runner agents. Default to `codex` when the user does not choose.
4. Evaluate the repository's human docs against the shared quality rubric when human docs exist or are clearly expected for that repo type.
5. Create `workspace.config.json` with repository metadata, GitHub Project URL when available, centralized `sddRoot` / `historyRoot`, `defaultAgent`, and `agents`.
6. Create `sdd/README.md` describing the workspace queue, linking the GitHub Project when configured, and recording the docs-quality baseline for the selected repositories.
7. Create `sdd/tasks/` as an empty queue directory.
8. In `sdd/README.md`, make it explicit that tasks are created later, intentionally, through `workspace-task-factory`.
9. Keep the workspace generic and runner-friendly. Do not require repo-local SDD folders.
10. Use the shared `workspace-task-factory` skill for future task creation instead of generating a per-workspace task factory file.

## Design Rules

- Keep all future tasks for the workspace in one place: `workspaces/<name>/sdd/tasks/`.
- Do not infer or pre-create tasks during bootstrap, even if likely feature flows are obvious.
- Leave task grouping, `scope`, and execution planning to `workspace-task-factory`.
- If docs are weak, record the gap and suggest a follow-up docs task strategy; do not create those tasks during bootstrap unless the user explicitly asks for it.
- Any future docs generated from that follow-up task must be written in the affected repository, not inside `workspace-ai-runner`.
- Put repo-specific docs and validation hints in `workspace.config.json`.
- Put the workspace GitHub Project under `githubProject.url` when the user provides it or it can be discovered. If no Project exists yet, omit `githubProject` and state that task-card sync cannot be enabled until the URL is configured.
- When using `create_workspace`, pass `skipGithubProject: true` only after the user explicitly confirms that no GitHub Project is needed.
- Configure `codex` and `claude-code` agents when possible, and set `defaultAgent` to `codex` unless the user asks otherwise.
- Do not create extra process documentation beyond the files needed by the runner.

## Agent Config

Use this shape in `workspace.config.json`:

```json
{
  "githubProject": {
    "url": "https://github.com/orgs/<org>/projects/<number>"
  },
  "defaultAgent": "codex",
  "agents": {
    "codex": {
      "type": "codex",
      "command": "codex",
      "args": ["exec", "--ephemeral"]
    },
    "claude-code": {
      "type": "claude-code",
      "command": "claude",
      "args": ["-p"]
    }
  }
}
```

## Docs Quality Review

Use the shared rubric to inspect whether the repositories already provide enough human context for future work.

Focus on documentation that explains:

- module or feature boundaries
- business rules
- routes, contracts, or integration surfaces
- operational or maintenance expectations

Record the result in `sdd/README.md` with:

- repository name
- score such as `8/10`
- evidence files read
- short missing areas
- one label: `docs-ready`, `docs-partial`, or `docs-gap`

If the repo has no meaningful human docs but clearly should have them, mark it as `docs-gap`.

Treat `7/10` as the practical threshold for a usable bootstrap baseline:

- `7-10`: report the score and proceed without suggesting a docs recovery plan
- `0-6`: report the score and explicitly suggest follow-up tasks to read the repositories module by module and write stable human docs in the same documentation style used in stronger repos such as `platform-api`

## Completion Message

Do not end the bootstrap response with a `Proximos passos` menu or any numbered options block.

The bootstrap response should always:

- state the docs score for each repository in the prose response
- mention the docs label for each repository when relevant
- call out the main missing areas briefly

When one or more repositories score below `7/10`, the response should also:

- explicitly suggest follow-up documentation tasks
- describe those tasks as repository reading passes done module by module
- make clear that the goal is to write correct human docs in the repository itself
- mention that the expected doc style should follow the stronger human-doc standard already used in repositories such as `platform-api`

Keep this suggestion in plain prose, not as a menu.

## Defaults

- If a repo exposes `package.json`, prefer its scripts for validation.
- If no clear validation script exists, record that explicitly instead of guessing.
- If the user does not specify a storage preference, keep the workspace fully inside this runner project.
