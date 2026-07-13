---
id: i18n-translate-linkshortener-page
title: i18n: Translate LinkShortener page
scope: i18n
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710492891
github_issue_number: 95
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/95
github_issue_node_id: I_kwDORqaAXc8AAAABGMRq2w
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/95
github_project_item_id: 202914424
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOng
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202914424"
github_project_status: Todo
---

## Scope

Translate LinkShortener page. Namespace: `shortener`.

## Files to modify

- `src/pages/LinkShortener/LinkShortener.tsx`
- `src/pages/LinkShortener/components/ShortLinksContent.tsx`
- `src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx`

## Key translations

- title: "Links encurtados" → "Enlaces cortos" → "Short Links"
- counter with pluralization: "Você encurtou {{count}} Link(s)" → i18next `_one`/`_other`
- shortenLink: "Encurtar link" → "Acortar enlace" → "Shorten link"
- Table columns, empty state, copy link texts, dialog fields.

## Constraints

- Provide full JSON for all 3 locales.
- Do NOT translate shortened URLs.

## Validation

```bash
npm run lint
npm run build
```
