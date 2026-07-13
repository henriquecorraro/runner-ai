---
id: fix-sms-url-sanitization
title: Fix SMS URL sanitization when saving messages
scope: backend-bugfix
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-api && npx vitest run tests/sms-content.service.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-front && npm run build"
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4695960213
github_issue_number: 47
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/47
github_issue_node_id: I_kwDORpoJ688AAAABF-aqlQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/47
  - https://github.com/ligue-lead-tech/platform-front/issues/66
github_project_item_id: 202147427
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwMhmM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202147427"
github_project_status: Done
---

## Repositories

| Repository | Required | Purpose |
|---|---|---|
| platform-api | yes | Fix SMS message sanitization and tests |
| platform-front | verify-only | Verify create-SMS flow sends and displays URL text |

## Files

```txt
platform-api/src/modules/sms/services/sms-content.service.ts
platform-api/tests/sms-content.service.spec.ts
platform-api/src/modules/sms/use-cases/sms.use-cases.ts
platform-front/src/components/Dialogs/SmsDialog/SmsDialog.tsx
platform-front/src/service/sms/sms-service.ts
platform-front/src/service/sms/sms-service.types.ts
```

## Defect

| Flow | Current behavior | Required behavior |
|---|---|---|
| Create SMS with shortened URL | Saved message strips URL punctuation and becomes invalid | Saved message preserves URL punctuation |
| Example input | `https://ligue.ly/ligueBuy` | `https://ligue.ly/ligueBuy` |
| Broken output | `httpsligue.lyligueBuy` | must not occur |

## Implementation

- Preserve URL punctuation in `processSmsContent`.
- Preserve these URL characters at minimum:

| Character | Purpose |
|---|---|
| `:` | URL scheme separator |
| `/` | URL path separator |
| `?` | query separator |
| `#` | fragment separator |
| `=` | query key/value separator |
| `&` | query parameter separator |
| `%` | percent-encoded values |

- Keep emoji removal.
- Keep accent normalization.
- Keep unsupported punctuation removal.
- Escape allowlist characters before using them in a regex character class.
- Do not create accidental regex ranges from `-`.
- Add regression tests for shortened URLs and URL query strings.
- Verify create SMS persists the returned `message` with URL punctuation intact.

## Acceptance

- `processSmsContent("Acesse https://ligue.ly/ligueBuy")` returns `Acesse https://ligue.ly/ligueBuy`.
- `processSmsContent("Link: https://exemplo.com/oferta?a=1&b=2#top")` preserves `:`, `/`, `?`, `=`, `&`, `#`.
- `processSmsContent` still removes emoji.
- `processSmsContent` still normalizes accents.
- `processSmsContent` still removes unsupported punctuation such as comma and exclamation mark.
- Creating SMS from frontend with a shortened URL displays and persists a valid URL.

## Do Not

- Do not disable SMS sanitization entirely.
- Do not modify the SMS create request payload shape.
- Do not change short-link creation behavior.
- Do not alter dispatch workers except if they perform independent URL-breaking sanitization.

## Validation

```sh
cd /home/rick/projetos/platform-api && npx vitest run tests/sms-content.service.spec.ts
cd /home/rick/projetos/platform-api && npm run typecheck
cd /home/rick/projetos/platform-front && npm run build
```
