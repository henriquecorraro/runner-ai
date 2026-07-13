---
id: email-two-factor-authentication-frontend
title: Build email two-factor authentication settings and login challenge
scope: account-security
status: done
repositories:
  - platform-front
validation:
  - "cd /home/rick/projetos/platform-front && npm run lint"
  - "cd /home/rick/projetos/platform-front && npm run build"
docs_targets:
  - platform-front:docs/features/account-security.md
depends_on:
  - email-two-factor-authentication-middleware-contracts
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4807407717
github_issue_number: 131
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/131
github_issue_node_id: I_kwDORqaAXc8AAAABHos4ZQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/131
github_project_item_id: 208529577
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxt6Kk
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208529577"
github_project_status: Done
---

## Settings

- Add an independent two-factor authentication section to `/settings` for every authenticated user.
- Load `GET /users/me/two-factor`.
- Explain that enabling requires an email code on every login.
- Show the destination email returned by the API.
- Render the existing design-system checkbox/toggle pattern.
- Persist through `PATCH /users/me/two-factor` with `{ enabled }`.
- Show loading, retry, saving, success, and error states.
- Localize all copy in `pt-BR`, `en`, and `es-ES`.

## Login Challenge

- Extend login response handling for standard success and two-factor-required responses.
- Do not persist an auth session when the password step returns a challenge.
- Replace the login form with an inline code-confirmation step.
- Display the masked destination email.
- Accept exactly six numeric digits.
- Confirm through `POST /auth/two-factor/confirm`.
- Persist the auth session and navigate only after confirmation succeeds.
- Add resend through `POST /auth/two-factor/resend`.
- Disable resend during the API cooldown and show a countdown.
- Allow returning to the password step and clear challenge-local state.
- Map `TWO_FACTOR_CHALLENGE_INVALID`, `TWO_FACTOR_CODE_INVALID`, `TWO_FACTOR_ATTEMPTS_EXCEEDED`, `TWO_FACTOR_RESEND_COOLDOWN`, and `TWO_FACTOR_EMAIL_DELIVERY_FAILED` to localized feedback.

## Accessibility

- Associate code label and input.
- Use `autocomplete="one-time-code"` and numeric input mode.
- Announce resend countdown and feedback without relying on color.
- Preserve keyboard submission.

## Tests

- Cover preference loading and mutation.
- Cover secondary-user access to the preference.
- Cover normal login.
- Cover challenge transition without session persistence.
- Cover confirmation, resend cooldown, back action, and structured errors.
