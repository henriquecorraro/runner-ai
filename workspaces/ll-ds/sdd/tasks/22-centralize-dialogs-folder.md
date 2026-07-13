---
id: centralize-dialogs-folder
title: Centralize all Dialog components into components/Dialogs folder
scope: ds-migration-audit
status: done
repositories:
  - platform-front
validation:
  - "npm run lint && npm run build passes on platform-front"
  - All 6 dialog components exist under src/components/Dialogs/
  - No dialog components remain at src/components/ root level
---

## Objective

Move all Dialog/Modal components in `platform-front/src/components/` into a centralized `platform-front/src/components/Dialogs/` folder.

## Components to Move

| Current Path | New Path |
|-------------|----------|
| `src/components/CreateLeadListDialog/` | `src/components/Dialogs/CreateLeadListDialog/` |
| `src/components/CreateListFromFilterModal/` | `src/components/Dialogs/CreateListFromFilterModal/` |
| `src/components/DeleteConfirmationDialog/` | `src/components/Dialogs/DeleteConfirmationDialog/` |
| `src/components/LeadListUploadDialog/` | `src/components/Dialogs/LeadListUploadDialog/` |
| `src/components/MergeListsDialog/` | `src/components/Dialogs/MergeListsDialog/` |
| `src/components/CardPaymentModal/` | `src/components/Dialogs/CardPaymentModal/` |

## Steps

1. Create `src/components/Dialogs/` directory
2. Move each Dialog/Modal folder into `src/components/Dialogs/`
3. Create `src/components/Dialogs/index.ts` barrel export re-exporting all dialogs
4. Update all imports across platform-front referencing the old paths to use new paths
5. Verify no broken imports remain

## Constraints

- Do NOT rename components or change any component code — only move files and update import paths
- Keep each component in its own subfolder within `Dialogs/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run lint && npm run build
```
