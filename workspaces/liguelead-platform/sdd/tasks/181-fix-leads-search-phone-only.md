---
id: fix-leads-search-phone-only
title: "Restrict leads search to phone only + conditional USE INDEX"
scope: fix-leads-search-phone-only
status: done
repositories:
  - platform-api
  - platform-front
validation:
  - Search queries only l.phone LIKE
  - USE INDEX not forced when additional filters present
  - "Frontend placeholder updated in pt-BR, en, es-ES"
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4790087133
github_issue_number: 98
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/98
github_issue_node_id: I_kwDORpoJ688AAAABHYLt3Q
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/98
  - https://github.com/ligue-lead-tech/platform-front/issues/125
github_project_item_id: 207492573
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxeFd0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=207492573"
github_project_status: Done
---

## Problem
Leads search with LIKE on name/surname/email causes timeout (>2min) for clients with 685k+ leads. No viable index for text search at this volume.

## Solution
- Restrict search to phone only (has idx_leads_client_phone index, responds in ~98ms)
- USE INDEX applied conditionally: only when no search/fromPlatformId/leadListIds filters
- Frontend placeholder updated to indicate phone-only search (all 3 languages)

## Performance
- Phone search: ~98ms ✅
- fromPlatformId (no USE INDEX): ~79ms ✅
- createdWithinDays (with USE INDEX): ~2ms ✅

## PRs
- API: https://github.com/ligue-lead-tech/platform-api/pull/95
- Front: https://github.com/ligue-lead-tech/platform-front/pull/124

## Validation
- Search filters only by l.phone LIKE
- USE INDEX not applied when search/fromPlatformId/leadListIds present
- Placeholder shows "Buscar por telefone" / "Search by phone" / "Buscar por teléfono"
