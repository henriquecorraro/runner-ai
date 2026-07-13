---
id: fix-short-link-dialog-shorten-submit
title: Fix short-link dialog shorten submit execution
scope: frontend-bugfix
status: done
repositories:
  - platform-front
  - middleware
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
  - "cd /home/rick/projetos/middleware && npm run build"
  - "cd /home/rick/projetos/middleware && npm run docs:openapi"
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4695435533
github_issue_number: 64
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/64
github_issue_node_id: I_kwDORqaAXc8AAAABF96pDQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/64
  - https://github.com/ligue-lead-tech/middleware/issues/58
  - https://github.com/ligue-lead-tech/platform-api/issues/46
github_project_item_id: 202121780
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMIjQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202121780"
github_project_status: Done
---

## Repositories

| Repository | Required | Purpose |
|---|---|---|
| platform-front | yes | Fix UI submit and dialog lifecycle |
| middleware | verify-only | Verify public route contract if frontend request fails |
| platform-api | verify-only | Verify backend route contract if middleware contract is wrong |

## Files

```txt
platform-front/src/components/Dialogs/ShortLinkDialog/ShortLinkDialog.tsx
platform-front/src/pages/LinkShortener/LinkShortener.tsx
platform-front/src/pages/LinkShortener/components/ShortLinksContent.tsx
platform-front/src/hooks/queries/link-shortener.queries.ts
platform-front/src/service/link-shortener/link-shortener-service.ts
platform-front/src/service/link-shortener/link-shortener-service.types.ts
middleware/src/domains/link-shortener/routes.ts
middleware/src/domains/link-shortener/contracts.ts
platform-api/src/modules/link-shortener/routes/link-shortener.routes.ts
platform-api/src/modules/link-shortener/controllers/link-shortener.controller.ts
platform-api/src/modules/link-shortener/schemas/link-shortener.schemas.ts
```

## Contract

| Operation | Method | Path | Request | Success response |
|---|---|---|---|---|
| Create short link | POST | `/shortener` | `{ "uri": "https://example.com/path" }` | `{ "link": "https://..." }` |

```ts
type CreateShortLinkRequest = {
  uri: string
}

type CreateShortLinkResponse = {
  link: string
}
```

## Defect

| Flow | Current behavior | Required behavior |
|---|---|---|
| Paste URL -> click `Encurtar` | Dialog disappears and no short link is created | Dialog stays open, POST `/shortener` executes, generated short URL is displayed |
| Failed shorten request | Dialog can close without visible error | Dialog stays open and shows error feedback |

## Implementation

- Ensure `Encurtar` button triggers exactly one `createShortLink` mutation.
- Prevent form submit propagation from closing parent or current dialogs.
- Do not call `close()` inside successful shorten handler.
- Keep dialog open after successful shorten.
- Set `shortUrl` from `response.link`.
- Invalidate `shortLinksQueryKey` after successful creation.
- Disable `Encurtar` while request is pending.
- Keep destination URL field value while request is pending and after failure.
- Verify middleware and platform-api only if frontend request path/payload/response mismatch is found.

## Acceptance

- Open `/shortener`.
- Click `Encurtar link`.
- Paste a valid absolute URL.
- Click `Encurtar`.
- Dialog remains open.
- Network request uses `POST /shortener` with body `{ uri }`.
- Success renders `URL encurtada` section with returned URL.
- Active links list includes new link after dialog closes or list refetches.
- Invalid URL/server validation error keeps dialog open and shows error text.
- Same behavior works when shortener is launched from SMS create flow.

## Do Not

- Do not auto-close dialog after successful shorten.
- Do not submit SMS form when clicking shortener `Encurtar`.
- Do not change backend route behavior unless contract verification proves a mismatch.

## Validation

```sh
cd /home/rick/projetos/platform-front && npm run lint
cd /home/rick/projetos/platform-front && npm run build
cd /home/rick/projetos/middleware && npm run build
cd /home/rick/projetos/middleware && npm run docs:openapi
cd /home/rick/projetos/platform-api && npm run typecheck
```
