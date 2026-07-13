---
id: fix-short-links-page-overlapping-layout
title: Fix short-links page overlapping layout
scope: frontend-bugfix
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4695438706
github_issue_number: 65
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/65
github_issue_node_id: I_kwDORqaAXc8AAAABF961cg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/65
github_project_item_id: 202121927
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMIsc
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202121927"
github_project_status: Done
---

## Repositories

| Repository | Required |
|---|---|
| platform-front | yes |

## Files

```txt
src/pages/LinkShortener/LinkShortener.tsx
src/pages/LinkShortener/LinkShortener.styles.ts
src/pages/LinkShortener/components/ShortLinksContent.tsx
src/components/Skeleton/TableSkeleton.tsx
src/components/QueryError/QueryError.tsx
```

## Defect

| Screen | Current behavior | Required behavior |
|---|---|---|
| `/shortener` | Two parts of the screen overlap | Header, tabs, link cards, empty/error/loading states do not overlap |
| `/shortener` responsive layout | Long URLs/actions can collide with adjacent content | Long URLs wrap/truncate safely and actions remain accessible |

## Implementation

- Audit `/shortener` layout at desktop, tablet, and mobile widths.
- Remove fragile descendant selectors that depend on `PageWrapper` child order when they cause overlap.
- Ensure page header and content region have stable spacing.
- Ensure tabs do not overlap cards/loading/empty states.
- Ensure `LinkCard` supports long `shortUrl` and `longUrl` values.
- Ensure `CardActions` remains visible and does not cover link text.
- Use responsive grid/flex rules for narrow widths.
- Keep card actions clickable.
- Keep visual design consistent with existing page styling.

## Acceptance

- `/shortener` has no overlapping elements at `375x812`.
- `/shortener` has no overlapping elements at `768x1024`.
- `/shortener` has no overlapping elements at `1440x900`.
- Header action button remains visible and clickable.
- Tabs remain visible and clickable.
- Each link card keeps copy/customize/archive actions visible.
- Long destination URL wraps without covering action buttons.
- Loading, empty, error, active links, and archived links states render without overlap.

## Do Not

- Do not hide URL text to avoid layout issues unless using accessible truncation with title/tooltip.
- Do not remove link card actions.
- Do not change short-link data fetching behavior.

## Validation

```sh
npm run lint
npm run build
```
