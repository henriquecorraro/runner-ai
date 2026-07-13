---
id: tags-page-display-tag-names-with-border-style-chips-matching-leads-page
title: Tags page: display tag names with border-style chips matching leads page
scope: tags
status: open
repositories:
  - platform-front
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731278280
github_issue_number: 107
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/107
github_issue_node_id: I_kwDORqaAXc8AAAABGgGTyA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/107
github_project_item_id: 204076995
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp98M
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204076995"
github_project_status: Todo
---

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
