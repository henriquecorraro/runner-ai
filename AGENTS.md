# Ecosystem AI Runner Agent Guide

This repository is a control plane for ecosystem work, not a single application repository.

When a user asks to plan, create, execute, or close ecosystem tasks:

- Prefer the MCP tools from `bin/ecosystem-ai-mcp.js` when available.
- Use the current chat/agent as the default execution context to reuse brainstorm context and save tokens.
- Resolve references like "essas tasks", "as tasks", or "pode fazer" against tasks created, changed, loaded, or discussed in the current conversation first.
- Use the isolated runner only when the user explicitly asks for it or confirms it for a large scope/open-task batch.
- Do not mark tasks as `done` until the user confirms validation.
- Keep centralized task planning in this repository and stable human docs in each owning repository.

Useful MCP command:

```bash
npm run mcp
```
