# Plugins

All installable plugin packages live in this directory.

```text
plugins/
  ws-runner/
    .claude-plugin/plugin.json
    .codex-plugin/plugin.json
    .mcp.json
    skills/ws-runner/SKILL.md
```

The repository-root `.claude-plugin/marketplace.json` and
`.agents/plugins/marketplace.json` files are host-specific marketplace catalogs.
They point to `plugins/ws-runner/` and must remain at the marketplace root for
repository-based discovery.
