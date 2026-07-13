---
id: audios-page-remove-activate-deactivate-option-keep-only-delete
title: "Audios page: remove activate/deactivate option, keep only delete"
scope: audios
status: done
repositories:
  - platform-front
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731284411
github_issue_number: 111
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/111
github_issue_node_id: I_kwDORqaAXc8AAAABGgGruw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/111
github_project_item_id: 204077378
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp-UI
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204077378"
github_project_status: Done
---

## Goal

In the Audios page, remove the "Activate/Deactivate" option from the SplitButton actions menu. Keep only the "Delete" option. Frontend-only change.

## File: `src/hooks/tables/useAudiosColumns.tsx`

Current actions column SplitButton `options` array:
```tsx
options={[
  {
    label: active ? t('actions.deactivate', { title }) : t('actions.activate', { title }),
    icon: <PowerIcon size={16} weight={active ? 'fill' : 'regular'} />,
    onClick: () => onToggleActive(audio),
  },
  {
    label: t('actions.delete', { title }),
    icon: <TrashIcon size={16} />,
    onClick: () => onDelete(audio),
  },
]}
```

Remove the first option (activate/deactivate). Result:
```tsx
options={[
  {
    label: t('actions.delete', { title }),
    icon: <TrashIcon size={16} />,
    onClick: () => onDelete(audio),
  },
]}
```

- Remove `PowerIcon` import if no longer used in the file
- Remove `onToggleActive` from `UseAudiosColumnsParams` type (or keep optional for backwards compat)
- Remove `active` variable and `isAudioActive` usage in the actions cell if no longer needed
- Clean up `isAudioActive` export only if not used elsewhere

## Constraints

- Frontend-only change. Do NOT remove backend toggle endpoint.
- Keep `onToggleActive` param optional in type to avoid breaking callers, or remove it and update callers.

## Validation

- `npm run lint` passes
- `npm run build` passes
- Audios table action menu only shows "Edit" button + "Delete" in dropdown, no activate/deactivate
