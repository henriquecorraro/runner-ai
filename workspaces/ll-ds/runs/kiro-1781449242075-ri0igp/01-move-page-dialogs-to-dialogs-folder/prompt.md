You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: ll-ds
Task: move-page-dialogs-to-dialogs-folder
Title: Move remaining page-level dialogs to components/Dialogs folder

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills, inspect and follow them.
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
- Default validation: npm run lint ; npm run build

### move-page-dialogs-to-dialogs-folder
Task id: move-page-dialogs-to-dialogs-folder
Task title: Move remaining page-level dialogs to components/Dialogs folder
Task status: open
Task scope: ds-usemodal-refactor
Task validation: npm run build passes ; All 6 page-level dialogs exist under src/components/Dialogs/ ; No Dialog/Modal files remain in src/pages/*/components/

```md
## Objective

Move all page-level Dialog/Modal components into the centralized `src/components/Dialogs/` folder.

## Components to Move

| Current Path | New Path |
|-------------|----------|
| `src/pages/Audios/components/AudioDialog.tsx` | `src/components/Dialogs/AudioDialog/AudioDialog.tsx` |
| `src/pages/Campaigns/components/CampaignDialog.tsx` | `src/components/Dialogs/CampaignDialog/CampaignDialog.tsx` |
| `src/pages/Campaigns/components/CampaignDialog.styles.ts` | `src/components/Dialogs/CampaignDialog/CampaignDialog.styles.ts` |
| `src/pages/CreditHistory/components/OrderDetailModal.tsx` | `src/components/Dialogs/OrderDetailModal/OrderDetailModal.tsx` |
| `src/pages/CreditHistory/components/OrderDetailModal.styles.ts` | `src/components/Dialogs/OrderDetailModal/OrderDetailModal.styles.ts` |
| `src/pages/LinkShortener/components/ShortLinkDialog.tsx` | `src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx` |
| `src/pages/Sms/components/SmsDialog.tsx` | `src/components/Dialogs/SmsDialog/SmsDialog.tsx` |
| `src/pages/Sms/components/SmsShortLinksDialog.tsx` | `src/components/Dialogs/SmsShortLinksDialog/SmsShortLinksDialog.tsx` |

## Steps

1. Create each subfolder under `src/components/Dialogs/`
2. Move files (preserve styles alongside their component)
3. Update all imports across the codebase to reference new paths
4. Add re-exports to `src/components/Dialogs/index.ts`

## Constraints

- Do NOT rename components or change any component code — only move files and update import paths
- Keep each component in its own subfolder within `Dialogs/`
- If the dialog file imports siblings from its old page folder (e.g., types, styles), move those alongside it

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/runs/kiro-1781449242075-ri0igp/01-move-page-dialogs-to-dialogs-folder/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: move-page-dialogs-to-dialogs-folder
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
