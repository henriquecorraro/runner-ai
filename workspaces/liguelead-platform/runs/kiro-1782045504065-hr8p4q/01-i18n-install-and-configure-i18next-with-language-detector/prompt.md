You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-install-and-configure-i18next-with-language-detector
Title: i18n: Install and configure i18next with language detector

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

### i18n-install-and-configure-i18next-with-language-detector
Task id: i18n-install-and-configure-i18next-with-language-detector
Task title: i18n: Install and configure i18next with language detector
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Install

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

## Create `src/i18n/index.ts`

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBRCommon from './locales/pt-BR/common.json'
import esESCommon from './locales/es-ES/common.json'
import enCommon from './locales/en/common.json'

const resources = {
  'pt-BR': { common: ptBRCommon },
  'es-ES': { common: esESCommon },
  en: { common: enCommon },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

export default i18n
```

## Create locale files

- `src/i18n/locales/pt-BR/common.json` — empty object `{}`
- `src/i18n/locales/es-ES/common.json` — empty object `{}`
- `src/i18n/locales/en/common.json` — empty object `{}`

These will be populated in subsequent tasks.

## Integrate in entry point

File: `src/main.tsx`

Add `import './i18n'` before `import App from './App.tsx'`.

## Constraints

- Do NOT add Suspense wrapper for i18n (resources are bundled inline).
- Do NOT change any existing component behavior.
- `pt-BR` is default language and fallback.
- Language persists in `localStorage` key `i18nextLng`.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/01-i18n-install-and-configure-i18next-with-language-detector/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-install-and-configure-i18next-with-language-detector
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
