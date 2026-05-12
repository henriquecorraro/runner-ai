# Ecosystem AI Runner

Generic runner for executing centralized ecosystem tasks across one or more local repositories with shared agent sessions.

The runner is not tied to a single product. Each ecosystem lives under `ecosystems/<name>/` and owns its own config, centralized SDD, local skills, and execution history.

For a full end-to-end usage guide, see [HOWTOUSE.md](HOWTOUSE.md).

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
- tasks live in `ecosystems/<name>/sdd/tasks/`
- related tasks can share the same `scope`
- the runner can execute one task, one scope, all open tasks, or all open scopes

## Example

LigueLead now lives here:

```text
ecosystems/liguelead/
```

Run one scope:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --scope broadcast-interaction-unique-key
```

Run all open tasks in one shared execution:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --open-tasks
```

Run all open tasks grouped by scope:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --open-scopes
```

Choose an agent explicitly:

```bash
npm run tasks -- --config ecosystems/liguelead/ecosystem.config.json --task audios-upload-and-voice-routes --agent claude-code
```

## Installing Skills In Codex

Codex discovers local skills from:

```text
~/.codex/skills/
```

The cleanest way to use the skills from this project is to create symlinks from `~/.codex/skills` to the folders in this repository.

Example:

```bash
ln -s "$PWD/skills/codex-direct-mode" \
  "$HOME/.codex/skills/codex-direct-mode"

ln -s "$PWD/skills/ecosystem-bootstrap" \
  "$HOME/.codex/skills/ecosystem-bootstrap"

ln -s "$PWD/skills/ecosystem-task-factory" \
  "$HOME/.codex/skills/ecosystem-task-factory"

ln -s "$PWD/skills/ecosystem-task-closer" \
  "$HOME/.codex/skills/ecosystem-task-closer"

ln -s "$PWD/ecosystems/liguelead/skills/liguelead-direct-sdd" \
  "$HOME/.codex/skills/liguelead-direct-sdd"

ln -s "$PWD/ecosystems/liguelead/skills/liguelead-platform-ecosystem" \
  "$HOME/.codex/skills/liguelead-platform-ecosystem"
```

Why use symlinks:

- Codex continues reading from `~/.codex/skills`
- you edit the skill only once inside this project
- changes in the project become the active version in Codex immediately

To verify:

```bash
ls -l "$HOME/.codex/skills"
readlink "$HOME/.codex/skills/codex-direct-mode"
```

## Using Skills

After the links exist, use the skill by naming it in the prompt.

Examples:

```text
Use the `liguelead-direct-sdd` skill.
```

```text
Use the `ecosystem-bootstrap` skill.
Crie um novo ecossistema chamado flow com os repositórios /caminho/repo-a e /caminho/repo-b
Não crie tasks ainda
Avalie a qualidade das docs humanas dos repositórios e me mostre se há gaps
```

```text
Use the `ecosystem-task-factory` skill.
Crie tasks para o scope onboarding no ecossistema flow
```

```text
Use the `ecosystem-task-closer` skill.
A task onboarding-backend do ecossistema flow foi validada. Marque como done e atualize a doc humana no repositório dono.
```

If the new skill does not appear immediately in the UI, open a new thread or restart the Codex session.

See [docs/usage.md](docs/usage.md) for the full contract.
