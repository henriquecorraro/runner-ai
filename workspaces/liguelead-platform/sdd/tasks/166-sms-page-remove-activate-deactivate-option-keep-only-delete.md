---
id: sms-page-remove-activate-deactivate-option-keep-only-delete
title: "SMS page: remove activate/deactivate option, keep only delete"
scope: sms
status: done
repositories:
  - platform-front
validation:
  - "npm run lint (platform-front)"
  - "npm run build (platform-front)"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4731283592
github_issue_number: 110
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/110
github_issue_node_id: I_kwDORqaAXc8AAAABGgGoiA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/110
github_project_item_id: 204077328
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwp-RA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204077328"
github_project_status: Done
---

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
