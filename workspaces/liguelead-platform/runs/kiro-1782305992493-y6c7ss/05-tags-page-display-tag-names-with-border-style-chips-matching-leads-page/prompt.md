You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: tags-page-display-tag-names-with-border-style-chips-matching-leads-page
Title: Tags page: display tag names with border-style chips matching leads page

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

### tags-page-display-tag-names-with-border-style-chips-matching-leads-page
Task id: tags-page-display-tag-names-with-border-style-chips-matching-leads-page
Task title: Tags page: display tag names with border-style chips matching leads page
Task status: open
Task scope: tags
Task validation: npm run lint (platform-front) ; npm run build (platform-front)

```md
## Goal

In the Tags page (`ListsContent`), change how tag names are displayed in the table's name column. Currently the name column uses the `SlugBadge` styled component (colored background with text). Update it to use the same tag chip/badge visual style shown in the leads page — a bordered chip with the chosen color as the BORDER (not fill background), matching how `ListChipsCell` renders tags in the leads table.

## Reference

### File: `src/hooks/tables/ListChipsCell.tsx`

This component renders tag chips in the Leads table. Use the same visual pattern for the Tags page name column.

### File: `src/hooks/tables/useListsColumns.tsx`

Current `slug` column cell renders:
```tsx
<SlugBadge $bg={color} $text={getContrastColor(color)} onClick={...}>
  {slug}
</SlugBadge>
```

Change to render a chip/badge with:
- Border in the tag's `color`
- Light/transparent background (or very light tint of the color)
- Text in dark color for readability
- Keep the click-to-navigate behavior

### File: `src/pages/Lists/Lists.styles.ts`

Update or replace `SlugBadge` styled component:
```ts
export const SlugBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 2px solid ${({ $color }) => $color};
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $color }) => $color};
  background: transparent;
  transition: opacity 0.15s;
  &:hover { opacity: 0.7; }
`
```

Update `useListsColumns.tsx` to pass `$color={color}` instead of `$bg` and `$text`.

## Validation

- `npm run lint` passes
- `npm run build` passes
- Tags in the Lists page visually match how tags appear in the Leads page (border style, not filled background)
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782305992493-y6c7ss/05-tags-page-display-tag-names-with-border-style-chips-matching-leads-page/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: tags-page-display-tag-names-with-border-style-chips-matching-leads-page
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
