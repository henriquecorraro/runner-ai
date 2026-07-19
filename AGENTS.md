# Workspace AI Runner Agent Guide

This repository is a control plane for workspace work, not a single application repository.

When a user asks to plan, create, execute, or close workspace tasks:

- Prefer the MCP tools from `bin/ws-runner-mcp.js` when available.
- ENGLISH FIRST: write all workspace SDD content in English, including task files,
  task titles, task body sections, textual frontmatter values, `Task Status`
  entries, run prompts, and SDD README updates. The user may speak Portuguese,
  but centralized workspace SDD artifacts must stay English unless the user
  explicitly asks for a quoted user-facing string in another language.
- Use the current chat/agent as the default execution context to reuse brainstorm context and save tokens.
- Resolve references like "essas tasks", "as tasks", or "pode fazer" against tasks created, changed, loaded, or discussed in the current conversation first.
- Use the isolated runner only when the user explicitly asks for it or confirms it for a large scope/open-task batch.
- Do not mark tasks as `done` until the user confirms validation.
- Keep centralized task planning in this repository and stable human docs in each owning repository.

Useful MCP command:

```bash
npm run mcp
```
