You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-integrations-pages
Title: i18n: Translate Integrations pages

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

### i18n-translate-integrations-pages
Task id: i18n-translate-integrations-pages
Task title: i18n: Translate Integrations pages
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Integrations domain. Namespace: `integrations`.

## Files to modify

- `src/pages/Integrations/Integrations.tsx`
- `src/pages/Integrations/IntegrationWebhooks.tsx`
- `src/pages/Integrations/WebhookForm.tsx`
- `src/pages/Integrations/ConnectIntegrationModal.tsx`

## Key translations

- title: "Integrações" → "Integraciones" → "Integrations"
- subtitle, section headers (Connected/Available CRMs)
- Connect modal: form fields (API key, token, URL), instructions, success/error messages
- Webhooks: list headers, create/edit form labels (URL, events, headers), status badges
- Webhook form: all field labels, placeholders, validation hints, event type options
- Empty states, error states

## Constraints

- Do NOT translate CRM names (e.g., "Bitrix24", "HubSpot", "RD Station").
- Do NOT translate webhook URLs or API keys.
- Provide full JSON for all 3 locales.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/16-i18n-translate-integrations-pages/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-integrations-pages
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
