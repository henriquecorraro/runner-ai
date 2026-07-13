---
id: i18n-install-and-configure-i18next-with-language-detector
title: i18n: Install and configure i18next with language detector
scope: i18n
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710475683
github_issue_number: 84
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/84
github_issue_node_id: I_kwDORqaAXc8AAAABGMQnow
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/84
github_project_item_id: 202913367
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYNlc
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913367"
github_project_status: Todo
---

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
