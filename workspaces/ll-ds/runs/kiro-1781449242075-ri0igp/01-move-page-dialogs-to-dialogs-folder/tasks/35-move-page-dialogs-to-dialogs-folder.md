---
id: move-page-dialogs-to-dialogs-folder
title: Move remaining page-level dialogs to components/Dialogs folder
scope: ds-usemodal-refactor
status: open
repositories:
  - platform-front
validation:
  - npm run build passes
  - All 6 page-level dialogs exist under src/components/Dialogs/
  - "No Dialog/Modal files remain in src/pages/*/components/"
---

## Objective

Move all page-level Dialog/Modal components into the centralized `src/components/Dialogs/` folder.

## Components to Move

| Current Path | New Path |
|-------------|----------|
| `src/pages/Audios/components/AudioDialog.tsx` | `src/components/Dialogs/AudioDialog/AudioDialog.tsx` |
| `src/pages/Campaigns/components/CampaignDialog.tsx` | `src/components/Dialogs/CampaignDialog/CampaignDialog.tsx` |
| `src/pages/Campaigns/components/CampaignDialog.styles.ts` | `src/components/Dialogs/CampaignDialog/CampaignDialog.styles.ts` |
| `src/pages/CreditHistory/components/OrderDetailModal.tsx` | `src/components/Dialogs/OrderDetailModal/OrderDetailModal.tsx` |
| `src/pages/CreditHistory/components/OrderDetailModal.styles.ts` | `src/components/Dialogs/OrderDetailModal/OrderDetailModal.styles.ts` |
| `src/pages/LinkShortener/components/ShortLinkDialog.tsx` | `src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx` |
| `src/pages/Sms/components/SmsDialog.tsx` | `src/components/Dialogs/SmsDialog/SmsDialog.tsx` |
| `src/pages/Sms/components/SmsShortLinksDialog.tsx` | `src/components/Dialogs/SmsShortLinksDialog/SmsShortLinksDialog.tsx` |

## Steps

1. Create each subfolder under `src/components/Dialogs/`
2. Move files (preserve styles alongside their component)
3. Update all imports across the codebase to reference new paths
4. Add re-exports to `src/components/Dialogs/index.ts`

## Constraints

- Do NOT rename components or change any component code — only move files and update import paths
- Keep each component in its own subfolder within `Dialogs/`
- If the dialog file imports siblings from its old page folder (e.g., types, styles), move those alongside it

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
