---
id: email-two-factor-authentication-api
title: Implement email two-factor authentication API
scope: account-security
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/authentication.md
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4807406350
github_issue_number: 105
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/105
github_issue_node_id: I_kwDORpoJ688AAAABHoszDg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/105
github_project_item_id: 208529523
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxt6HM
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208529523"
github_project_status: Done
---

## User Preference

- Use existing `users.force_auth2` and `users.code_auth2` columns.
- Do not create a new persistence table.
- Scope preference and verification code to the authenticated/login user, never all users in a client.
- Add authenticated `GET /users/me/two-factor`.
- Return `{ enabled: boolean, channel: "email", email: string }`.
- Add authenticated `PATCH /users/me/two-factor`.
- Accept `{ enabled: boolean }`.
- Update only `users.force_auth2` for the authenticated user.
- Clear `users.code_auth2` when disabling.

## Login Challenge

- Extend `POST /auth/login` with a response union.
- Return the existing session response when `force_auth2 = 0`.
- Do not create an auth session when `force_auth2 = 1`.
- Generate a cryptographically secure six-digit code.
- Store the active code in `users.code_auth2` for the login user.
- Create an opaque random challenge id in Redis with user id, client id, normalized email, expiry, and attempt state.
- Set challenge TTL to 10 minutes.
- Limit verification to 5 failed attempts.
- Invalidate the challenge and clear `code_auth2` after success or attempt exhaustion.
- Send the code to the login user's email through the existing SES sender and shared email template.
- Do not expose the code in API responses or logs.
- Return HTTP 200 with:
```ts
type TwoFactorRequiredResponse = {
  status: 202
  response: "Two-factor authentication required"
  data: {
    requiresTwoFactor: true
    challengeId: string
    maskedEmail: string
    expiresInSeconds: 600
  }
}
```

## Confirm And Resend

- Add public `POST /auth/two-factor/confirm`.
- Accept `{ challengeId: string, code: string }`.
- Validate six numeric digits.
- Create the opaque auth session only after valid confirmation.
- Return the existing successful login response.
- Add public `POST /auth/two-factor/resend`.
- Accept `{ challengeId: string }`.
- Enforce a 60-second resend cooldown.
- Rotate `users.code_auth2`, refresh challenge TTL, and send a new email.
- Return `{ maskedEmail: string, expiresInSeconds: 600, retryAfterSeconds: 60 }`.

## Errors

| Code | HTTP |
|---|---:|
| `TWO_FACTOR_CHALLENGE_INVALID` | 401 |
| `TWO_FACTOR_CODE_INVALID` | 401 |
| `TWO_FACTOR_ATTEMPTS_EXCEEDED` | 429 |
| `TWO_FACTOR_RESEND_COOLDOWN` | 429 |
| `TWO_FACTOR_EMAIL_DELIVERY_FAILED` | 503 |

## Tests

- Cover enabled/disabled preference reads and writes.
- Cover standard login without two-factor.
- Cover challenge login without premature session creation.
- Cover email dispatch through the shared template.
- Cover valid confirmation, invalid code, expiry, attempt exhaustion, resend cooldown, code rotation, and one-time challenge consumption.
- Cover user/client scoping.
