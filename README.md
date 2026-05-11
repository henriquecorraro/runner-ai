# Ecosystem AI Runner

Generic runner for executing centralized ecosystem tasks across one or more local repositories with shared `codex exec` sessions.

The runner is not tied to a single product. Each ecosystem lives under `ecosystems/<name>/` and owns its own config, centralized SDD, local skills, and execution history.

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

## Installing Skills In Codex

Codex discovers local skills from:

```text
~/.codex/skills/
```

The cleanest way to use the skills from this project is to create symlinks from `~/.codex/skills` to the folders in this repository.

Example:

```bash
ln -s /home/rick/projetos/ecosystem-ai-runner/skills/codex-direct-mode \
  /home/rick/.codex/skills/codex-direct-mode

ln -s /home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-bootstrap \
  /home/rick/.codex/skills/ecosystem-bootstrap

ln -s /home/rick/projetos/ecosystem-ai-runner/skills/ecosystem-task-factory \
  /home/rick/.codex/skills/ecosystem-task-factory

ln -s /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead/skills/liguelead-direct-sdd \
  /home/rick/.codex/skills/liguelead-direct-sdd

ln -s /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead/skills/liguelead-platform-ecosystem \
  /home/rick/.codex/skills/liguelead-platform-ecosystem
```

Why use symlinks:

- Codex continues reading from `~/.codex/skills`
- you edit the skill only once inside this project
- changes in the project become the active version in Codex immediately

To verify:

```bash
ls -l /home/rick/.codex/skills
readlink /home/rick/.codex/skills/codex-direct-mode
```

## Using Skills

After the links exist, use the skill by naming it in the prompt.

Examples:

```text
[$liguelead-direct-sdd](/home/rick/.codex/skills/liguelead-direct-sdd/SKILL.md)
```

```text
[$ecosystem-bootstrap](/home/rick/.codex/skills/ecosystem-bootstrap/SKILL.md)
Crie um novo ecossistema chamado flow com os repositórios /caminho/repo-a e /caminho/repo-b
```

```text
[$ecosystem-task-factory](/home/rick/.codex/skills/ecosystem-task-factory/SKILL.md)
Crie tasks para o scope onboarding no ecossistema flow
```

If the new skill does not appear immediately in the UI, open a new thread or restart the Codex session.

See [docs/usage.md](/home/rick/projetos/ecosystem-ai-runner/docs/usage.md) for the full contract.
