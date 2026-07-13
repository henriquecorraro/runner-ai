---
id: i18n-create-language-selector-component-in-header
title: i18n: Create language selector component in Header
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-install-and-configure-i18next-with-language-detector
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710477987
github_issue_number: 86
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/86
github_issue_node_id: I_kwDORqaAXc8AAAABGMQwow
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/86
github_project_item_id: 202913473
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYNsE
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913473"
github_project_status: Done
---

## Create `src/components/LanguageSelector/LanguageSelector.tsx`

Dropdown component for switching language. Place in Header next to NotificationsDropdown.

```typescript
import { useTranslation } from 'react-i18next'
import DropdownSelect from '@/components/DropdownSelect/DropdownSelect'

const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'PT' },
  { value: 'es-ES', label: 'ES' },
  { value: 'en', label: 'EN' },
]

const LanguageSelector = () => {
  const { i18n } = useTranslation()

  return (
    <DropdownSelect
      ariaLabel="Select language"
      size="sm"
      value={i18n.language}
      options={LANGUAGE_OPTIONS}
      onValueChange={(lng) => i18n.changeLanguage(lng)}
    />
  )
}

export default LanguageSelector
```

## Integrate in Header

File: `src/components/Header/Header.tsx`

Add `<LanguageSelector />` before `<NotificationsDropdown />` inside `<HeaderRight>`.

## Constraints

- Use existing `DropdownSelect` component — do NOT install new UI library.
- Labels show short language codes: PT, ES, EN.
- Language change immediately persists via i18next detector (localStorage).
- Do NOT translate the language names themselves.

## Validation

```bash
npm run lint
npm run build
```
