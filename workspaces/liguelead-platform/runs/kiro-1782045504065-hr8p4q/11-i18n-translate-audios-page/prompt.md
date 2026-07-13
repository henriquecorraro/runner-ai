You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-audios-page
Title: i18n: Translate Audios page

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### i18n-translate-audios-page
Task id: i18n-translate-audios-page
Task title: i18n: Translate Audios page
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Audios page. Namespace: `audios`.

## Files to modify

- `src/pages/Audios/Audios.tsx`
- `src/pages/Audios/components/AudiosContent.tsx`
- `src/hooks/tables/useAudiosColumns.tsx`
- `src/components/Dialogs/AudioDialog/AudioDialog.tsx`

## Key translations

- title: "Áudios" → "Audios" → "Audios"
- counter with pluralization: "Você possui {{count}} áudio(s) cadastrado(s)" → i18next `_one`/`_other`
- newAudio: "Novo áudio" → "Nuevo audio" → "New audio"
- Table columns, dialog fields (title, upload, TTS options), error/success messages.

## Constraints

- Provide full JSON for all 3 locales.
- Replace date formatting with `formatDate()`.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/11-i18n-translate-audios-page/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-audios-page
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
