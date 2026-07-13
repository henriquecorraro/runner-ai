You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-create-language-selector-component-in-header
Title: i18n: Create language selector component in Header

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

### i18n-create-language-selector-component-in-header
Task id: i18n-create-language-selector-component-in-header
Task title: i18n: Create language selector component in Header
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/03-i18n-create-language-selector-component-in-header/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-create-language-selector-component-in-header
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
