---
id: fix-short-links-copy-button-active-visual-state
title: Fix short-links copy button active visual state
scope: frontend-bugfix
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4695431240
github_issue_number: 63
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/63
github_issue_node_id: I_kwDORqaAXc8AAAABF96YSA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/63
github_project_item_id: 202121535
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMIT8
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202121535"
github_project_status: Done
---

## Repositories

| Repository | Required |
|---|---|
| platform-front | yes |

## Files

```txt
src/pages/LinkShortener/components/ShortLinksContent.tsx
src/components/Dialogs/SmsShortLinksDialog/SmsShortLinksDialog.tsx
src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx
src/pages/LinkShortener/LinkShortener.styles.ts
src/pages/Sms/Sms.styles.ts
```

## Defect

| UI | Current behavior | Required behavior |
|---|---|---|
| Short links copy button | Button appears visually disabled/faded but copies on click | Button appears enabled when clickable |
| SMS short links copy button | Button can share disabled-looking styling | Button appears enabled when clickable |

## Implementation

- Audit all short-link copy buttons.
- Use enabled visual variant/color for clickable copy actions.
- Keep disabled styling only when `disabled={true}`.
- Preserve `navigator.clipboard.writeText(...)` behavior.
- Preserve success feedback text/toast behavior.
- Preserve accessible label update after copy.
- Ensure icon contrast meets active button expectations on white cards/dialogs.

## Acceptance

- `/shortener` active links show copy buttons that look enabled.
- `/shortener` archived links show copy buttons that look enabled when clickable.
- SMS `Ver links encurtados` dialog shows copy buttons that look enabled.
- Copy buttons keep pointer/click behavior.
- Copied feedback still appears for the clicked row only.
- No button with active click handler uses disabled visual opacity.

## Do Not

- Do not remove copy actions.
- Do not change copied URL source; copy `link.shortUrl`.
- Do not introduce text-only copy controls when icon button is available.

## Validation

```sh
npm run lint
npm run build
```
