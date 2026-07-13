---
id: route-send-and-balance-events-through-notification-preferences
title: Route send and balance events through notification preferences
scope: user-notification-preferences
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:docs/human/modules/notifications.md
  - platform-api:docs/human/modules/broadcasts.md
  - platform-api:docs/human/credit-purchase.md
  - platform-api:docs/human/modules/auto-recharges.md
depends_on:
  - user-notification-preferences-and-delivery-core
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4798723978
github_issue_number: 102
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/102
github_issue_node_id: I_kwDORpoJ688AAAABHga3ig
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/102
github_project_item_id: 208030413
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgxmSs0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=208030413"
github_project_status: Done
---

## Event Map

| Source | Category | Type | Severity | Event key |
|---|---|---|---|---|
| SMS/SMS Flash broadcast started | `sends` | `broadcast_send_started` | `info` | `broadcast-send-started:{actionId}` |
| Voice broadcast started | `sends` | `broadcast_send_started` | `info` | `broadcast-send-started:{actionId}` |
| SMS/SMS Flash broadcast finalized | `sends` | `broadcast_send_completed` | `info` | `broadcast-send-completed:{actionId}` |
| Voice broadcast close finalized | `sends` | `broadcast_send_completed` | `info` | `broadcast-send-completed:{actionId}` |
| Broadcast terminal failure | `sends` | `broadcast_send_failed` | `danger` | `broadcast-send-failed:{actionId}:{failureCode}` |
| Credit order approved and credited | `balance` | `credit_order_approved` | `info` | `credit-order-approved:{paymentId}` |
| Credit order terminally rejected | `balance` | `credit_order_rejected` | `warning` | `credit-order-rejected:{paymentId}` |
| Auto-recharge failure | `balance` | `auto_recharge_failed` | `danger` | `auto-recharge-failed:{ruleId}:{attemptIdentity}` |

## Integration

- Replace direct `ClientNotificationsRepository.create` calls with the shared dispatcher.
- Integrate SMS/SMS Flash start only after the action claim persists the started status.
- Integrate voice start only after the action claim persists the started status and the dialer campaign starts.
- Emit one start event per action; rely on dispatcher event-key idempotency across worker retries.
- Integrate SMS/SMS Flash completion only after billing and action finalization commit.
- Integrate voice completion only after `broadcast_voice_close_settlements.status = 'finalized'` commit.
- Emit one completion event per action; rely on dispatcher event-key idempotency across worker retries.
- Integrate terminal send failures only at the state transition that makes the action non-retryable.
- Integrate credit approval only after credits and balances commit.
- Integrate credit rejection only after terminal rejection persistence.
- Route existing auto-recharge failure content through category `balance`.
- Never call email or inbox persistence inside an open business transaction.
- Catch and log dispatcher failure; do not revert broadcast, payment, credit, balance, or auto-recharge state.

## Content

- Reuse event content for email and in-app delivery.
- Include action/order identifiers in metadata, not recipient PII.
- Build broadcast action URLs from `PLATFORM_FRONT_URL`.
- Use `http://localhost:5173` as the development default.
- Use `https://plataforma.liguelead.app.br` as the production default.

| Type | Action URL |
|---|---|
| `broadcast_send_started` | `{PLATFORM_FRONT_URL}/broadcasts/schedules/{actionId}` |
| `broadcast_send_completed` | `{PLATFORM_FRONT_URL}/broadcasts/schedules/{actionId}` |
| `broadcast_send_failed` | `{PLATFORM_FRONT_URL}/broadcasts/schedules/{actionId}` |
| `credit_order_approved` | `/credits/history` |
| `credit_order_rejected` | `/credits/history` |
| `auto_recharge_failed` | `/credits?autoRecharge={ruleUuid}#auto-recharge` |

## Tests

- Cover one dispatcher call at each terminal transition.
- Cover no event before transaction commit.
- Cover worker retry idempotency.
- Cover completion and failure mutual exclusion.
- Cover notification failure isolation from business success.
- Cover exact category, type, severity, event key, metadata, and action URL for every map row.
