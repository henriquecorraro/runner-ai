You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-uploads-page
Title: i18n: Translate Uploads page

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

### i18n-translate-uploads-page
Task id: i18n-translate-uploads-page
Task title: i18n: Translate Uploads page
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Uploads page. Namespace: `uploads`.

## Files to modify

- `src/pages/Uploads/Uploads.tsx`
- `src/pages/Uploads/components/UploadsContent.tsx`
- `src/hooks/tables/useUploadsColumns.tsx`
- `src/components/Dialogs/LeadListUploadDialog/LeadListUploadDialog.tsx`

## Key translations (pt-BR → es-ES → en)

- title: "Uploads" → "Uploads" → "Uploads"
- subtitle: "Acompanhe o processamento dos arquivos enviados." → "Acompañe el procesamiento de los archivos enviados." → "Track the processing of uploaded files."
- newUpload: "Novo upload" → "Nuevo upload" → "New upload"
- All table column headers, empty states, error states, dialog texts.
- Upload dialog: file selection labels, progress states, success/error messages.

## Constraints

- Replace date formatting with `formatDate()` / `formatDateTime()`.
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/08-i18n-translate-uploads-page/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-uploads-page
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
