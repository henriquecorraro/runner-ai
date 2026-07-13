---
id: track-promotional-banner-engagement
title: Track promotional banner engagement across legacy and new platforms
scope: promotion-tracking
status: open
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - platform-api:npm run typecheck
  - platform-api:npm test
  - platform-api:npm run build
  - middleware:npm run build
  - middleware:npm test
  - middleware:npm run docs:openapi
  - platform-front:npm run lint
  - platform-front:npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4868900682
github_issue_number: 132
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/132
github_issue_node_id: I_kwDORpoJ688AAAABIjWHSg
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/132
  - https://github.com/ligue-lead-tech/middleware/issues/95
  - https://github.com/ligue-lead-tech/platform-front/issues/144
github_project_item_id: 212126160
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgykydA
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=212126160"
github_project_status: Testing
---

## Repositories

| Repository | Changes |
|---|---|
| platform-api | Create shared event table and authenticated ingestion endpoint |
| middleware | Proxy and validate promotion event ingestion |
| platform-front | Track RCS banner viewed, clicked, and dismissed events |
| areadocliente | Insert events through a legacy controller/model and instrument the RCS popup |

## Database

Create `migrations/029-create-promotion-events.sql`.

```sql
CREATE TABLE IF NOT EXISTS promotion_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_id VARCHAR(100) NOT NULL,
  event_type ENUM('viewed','clicked','dismissed') NOT NULL,
  source ENUM('legacy','platform-front') NOT NULL,
  client_id INT NOT NULL,
  user_id INT NULL,
  destination VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_promotion_events_campaign_event_created (campaign_id, event_type, created_at),
  INDEX idx_promotion_events_client_created (client_id, created_at),
  INDEX idx_promotion_events_user_created (user_id, created_at)
);
```

- Store every event.
- Do not add a unique constraint.
- Do not add foreign keys.
- Use the shared database accessed by platform-api and areadocliente.

## Platform API

Create authenticated route:

```http
POST /promotion-events
Content-Type: application/json
```

```typescript
type CreatePromotionEventBody = {
  campaignId: string;
  eventType: 'viewed' | 'clicked' | 'dismissed';
  source: 'platform-front';
  destination?: string;
};
```

- Derive `client_id` and `user_id` from authenticated request context.
- Never accept client or user identifiers from the request body.
- Return `201` with the created event identifier.
- Validate campaign id length and destination URL/path length.

## Middleware

- Register authenticated session proxy route `POST /promotion-events`.
- Validate the exact request and response schemas.
- Target `NEW_BACKEND_URL`.
- Regenerate OpenAPI output.

## Platform Front

- Extend `PromotionalBanner` with tracking metadata.
- Track `viewed` once when the dialog opens.
- Track `clicked` before navigation.
- Track `dismissed` for close button, Escape, and overlay close, excluding a click navigation.
- Use campaign id `rcs-launch-v1` and source `platform-front`.
- Tracking failure must not block dismissal or navigation.

## Legacy

- Create a legacy route, controller action, service/model insertion path for promotion events.
- Derive `client_id` and `user_id` exclusively from the CodeIgniter session.
- Accept only campaign id, event type, source `legacy`, and destination.
- Instrument the existing RCS popup for `viewed`, `clicked`, and `dismissed`.
- Tracking failure must not block popup dismissal or navigation.
- Do not call platform-api from the legacy application.

## Validation

```bash
cd /home/rick/projetos/platform-api && npm run typecheck && npm test && npm run build
cd /home/rick/projetos/middleware && npm run build && npm test && npm run docs:openapi
cd /home/rick/projetos/platform-front && npm run lint && npm run build
cd /home/rick/projetos/areadocliente && node --check public/assets/template/js/dashboard.js
```
