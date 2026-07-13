You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: sms-page-remove-activate-deactivate-option-keep-only-delete
Title: SMS page: remove activate/deactivate option, keep only delete

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

### sms-page-remove-activate-deactivate-option-keep-only-delete
Task id: sms-page-remove-activate-deactivate-option-keep-only-delete
Task title: SMS page: remove activate/deactivate option, keep only delete
Task status: open
Task scope: sms
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
## Goal

In the SMS page, remove the "Activate/Deactivate" option from the SplitButton actions menu. Keep only the "Delete" option. Frontend-only change.

## File: `src/hooks/tables/useSmsColumns.tsx`

Current actions column SplitButton `options` array:
```tsx
options={[
  {
    label: active ? t('deactivate', { title }) : t('activate', { title }),
    icon: <PowerIcon size={16} weight={active ? 'fill' : 'regular'} />,
    onClick: () => onToggleActive(sms),
  },
  {
    label: t('delete', { title }),
    icon: <TrashIcon size={16} />,
    onClick: () => onDelete(sms),
  },
]}
```

Remove the first option (activate/deactivate). Result:
```tsx
options={[
  {
    label: t('delete', { title }),
    icon: <TrashIcon size={16} />,
    onClick: () => onDelete(sms),
  },
]}
```

- Remove `PowerIcon` import if no longer used in the file
- Remove `onToggleActive` from `UseSmsColumnsParams` type (or keep for backwards compat but unused)
- Remove the `active` and `isSmsActive` usage in the actions cell if no longer needed
- Clean up the `isSmsActive` export only if it is not used elsewhere

## Constraints

- Frontend-only change. Do NOT remove backend toggle endpoint.
- Keep `onToggleActive` param optional in type to avoid breaking callers, or remove it and update callers.

## Validation

- `npm run lint` passes
- `npm run build` passes
- SMS table action menu only shows "Edit" button + "Delete" in dropdown, no activate/deactivate
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/08-sms-page-remove-activate-deactivate-option-keep-only-delete/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: sms-page-remove-activate-deactivate-option-keep-only-delete
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
