---
id: rcs-verification-dispatch
title: RCS as primary verification channel with SMS fallback
scope: rcs-verification-dispatch
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4824769374
github_issue_number: 111
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/111
github_issue_node_id: I_kwDORpoJ688AAAABH5QjXg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/111
github_project_item_id: 209509412
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgx83CQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=209509412"
github_project_status: Done
---

## Objective\nReplace SMS as primary channel for verification codes (phone verification, phone change) with RCS. SMS becomes fallback.\n\n## Spec\n- New service `rcs-dispatch.service.ts`: POST `https://api.liguelead.com.br/v1/rcs` with hardcoded api-token and app-id\n- First send → RCS (fallback to SMS/Twilio on failure)\n- Resend → SMS directly (device may not support RCS)\n- Resend detection: existing unused token for same client/purpose\n\n## Files\n- `src/modules/sms-verification/services/rcs-dispatch.service.ts` (new)\n- `src/modules/sms-verification/services/sms-verification-dispatch.service.ts`\n- `src/modules/sms-verification/use-cases/sms-verification.use-cases.ts`\n- `tests/sms-verification.use-cases.spec.ts`
