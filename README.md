# Ecosystem AI Runner

Generic runner for executing centralized ecosystem tasks across one or more local repositories with shared agent sessions.

The runner is not tied to a single product. Each ecosystem lives under `ecosystems/<name>/` and owns its own config, centralized SDD, local skills, and execution history.

If you are an AI agent reading this repository after clone, read [HOWTOUSE.md](HOWTOUSE.md) first. It is the operating guide for Codex, Claude Code, or any compatible coding agent.

## Structure

```text
ecosystem-ai-runner/
  bin/
  docs/
  skills/
  ecosystems/
    liguelead/
      ecosystem.config.json
      sdd/
      skills/
      runs/
```

## Core Idea

- repositories stay focused on code and repo-local docs
- ecosystem planning stays centralized in this runner
- ecosystems may link to one GitHub Project through `githubProject.url`
- tasks live in `ecosystems/<name>/sdd/tasks/`
- centralized ecosystem SDD artifacts are English-first, even when the chat is in another language
- related tasks can share the same `scope`
- the runner can execute one task, one scope, all open tasks, or all open scopes
- work follows the sequence: create ecosystem, create tasks, execute tasks, validate with the developer, then close tasks

## Workflow

Use the skills in this order:

1. `ecosystem-operating-mode`: choose the right workflow and local skills.
2. `ecosystem-bootstrap`: create or register an ecosystem.
3. `ecosystem-task-factory`: create centralized task files.
4. `ecosystem-task-executor`: execute tasks in the current chat or via runner from the chat.
5. Developer and AI validate the result.
6. `ecosystem-task-closer`: mark tasks as `done` only after validation.

Do not mark tasks as `done` during execution. Use `implemented` or `needs-rework` until the developer confirms the result.

## Runner Examples

Run one scope:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --scope <scope-id>
```

Run all actionable tasks in one shared execution:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-tasks
```

Run all actionable tasks grouped by scope:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-scopes
```

Dry-run before invoking an agent:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --open-scopes --dry-run
```

Choose an agent explicitly:

```bash
npm run tasks -- --config ecosystems/<name>/ecosystem.config.json --task <task-id> --agent claude-code
```

## MCP For Agents

The preferred long-term interface is MCP: the developer talks normally in the
AI chat, and the agent calls ecosystem tools behind the scenes.

Start the MCP server with:

```bash
npm run mcp
```

The MCP tools are designed around this rule:

- ecosystem creation goes through `create_ecosystem`, which requires either a GitHub Project URL or explicit confirmation to create without one
- `create_task` creates the GitHub draft Project card in `Todo` when the ecosystem has `githubProject`
- current-chat task execution uses `set_task_board_status` for `In Progress` and `Testing`
- validated closure asks for PR handoff intent, then uses `set_task_status(status="done", userValidated=true)` to update the card closeout and move it to `Done`
- current chat execution is the default, because it reuses the existing brainstorm context
- contextual phrases like "as tasks" or "pode fazer" refer first to tasks discussed in the current chat
- the isolated runner is used only when the user explicitly asks for it or confirms it for a large scope/open-task batch

## Codex Plugin

This repository also ships a local Codex plugin wrapper around the MCP server
and operating skill.

Register the local plugin marketplace:

```bash
codex plugin marketplace add /home/rick/projetos/ecosystem-ai-runner
```

The plugin lives at:

```text
plugins/ecosystem-ai-runner/
```

For direct MCP usage without relying on plugin UI activation, register the MCP
server explicitly:

```bash
codex mcp add ecosystem-ai-runner -- node /home/rick/projetos/ecosystem-ai-runner/bin/ecosystem-ai-mcp.js
```

Then start Codex from this repo:

```bash
codex -C /home/rick/projetos/ecosystem-ai-runner
```

## Claude Code Plugin

The same plugin folder also exposes a Claude Code manifest at
`plugins/ecosystem-ai-runner/.claude-plugin/plugin.json`, alongside a local
marketplace declaration at `.claude-plugin/marketplace.json`.

Register the local marketplace and install the plugin from inside Claude Code:

```text
/plugin marketplace add /home/luiz/liguelead/runner-ai
/plugin install ecosystem-ai-runner@ecosystem-ai-runner-local
```

The plugin manifest declares the MCP server inline using `${CLAUDE_PLUGIN_ROOT}`,
so no manual `claude mcp add` step is required after installation.

For direct MCP usage without going through the plugin UI, register the MCP
server explicitly instead:

```bash
claude mcp add ecosystem-ai-runner -- node /home/luiz/liguelead/runner-ai/bin/ecosystem-ai-mcp.js
```

## Installing Skills

For the full AI-facing setup, see [HOWTOUSE.md](HOWTOUSE.md).

Codex reads local skills from:

```text
~/.codex/skills/
```

Claude Code can read skills from:

```text
~/.claude/skills/
.claude/skills/
```

From the repository root, link the generic skills for Codex:

```bash
mkdir -p "$HOME/.codex/skills"

ln -sfn "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.codex/skills/ecosystem-bootstrap"

ln -sfn "$PWD/skills/ecosystem-operating-mode" \
  "$HOME/.codex/skills/ecosystem-operating-mode"

ln -sfn "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.codex/skills/ecosystem-task-factory"

ln -sfn "$PWD/skills/ecosystem-task-executor" \
  "$HOME/.codex/skills/ecosystem-task-executor"

ln -sfn "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.codex/skills/ecosystem-task-closer"

ln -sfn "$PWD/skills/codex-direct-mode" \
  "$HOME/.codex/skills/codex-direct-mode"
```

Or link them for Claude Code:

```bash
mkdir -p "$HOME/.claude/skills"

ln -sfn "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.claude/skills/ecosystem-bootstrap"

ln -sfn "$PWD/skills/ecosystem-operating-mode" \
  "$HOME/.claude/skills/ecosystem-operating-mode"

ln -sfn "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.claude/skills/ecosystem-task-factory"

ln -sfn "$PWD/skills/ecosystem-task-executor" \
  "$HOME/.claude/skills/ecosystem-task-executor"

ln -sfn "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.claude/skills/ecosystem-task-closer"

ln -sfn "$PWD/skills/codex-direct-mode" \
  "$HOME/.claude/skills/codex-direct-mode"
```

## Using Skills

After the links exist, use the skill by naming it in the prompt.

Examples:

```text
Use the `ecosystem-bootstrap` skill.
Crie um novo ecossistema chamado flow com os repositórios /caminho/repo-a e /caminho/repo-b.
Não crie tasks ainda.
```

```text
Use the `ecosystem-task-factory` skill.
Crie tasks para o scope onboarding no ecossistema flow.
```

```text
Use the `ecosystem-task-executor` skill.
Execute a task onboarding-backend no ecossistema flow via runner a partir deste chat.
```

```text
Use the `ecosystem-task-executor` skill.
Execute a task onboarding-backend no ecossistema flow nesta conversa.
```

```text
Use the `ecosystem-task-closer` skill.
A task onboarding-backend do ecossistema flow foi validada. Marque como done e atualize a doc humana no repositório dono.
```

If a skill does not appear immediately in the active AI tool, open a new thread or restart the tool session.

See [docs/usage.md](docs/usage.md) for the full contract.
