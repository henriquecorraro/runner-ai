---
id: platform-api-user-activity-audit-log
title: Add relational user activity audit log with Redis Stream batching
scope: platform-api-observability
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api/docs/human/architecture.md
  - platform-api/docs/human/observability.md
depends_on:
  - platform-api-structured-error-handler
---

## Files

Modify:

```text
package.json
src/app/app.ts
src/infra/config/env.ts
src/infra/database/sequelize.ts
src/types/redisKeys.ts
```

Add:

```text
migrations/012-create-audit-events.sql
src/modules/audit/models/audit-event.model.ts
src/modules/audit/entities/audit-event.entity.ts
src/modules/audit/repositories/audit-events.repository.ts
src/modules/audit/services/audit-event-sanitizer.service.ts
src/modules/audit/services/audit-event-queue.service.ts
src/modules/audit/services/audit-event-worker.service.ts
src/modules/audit/services/audit-user-action.service.ts
src/infra/http/audit-request.middleware.ts
src/workers/audit-events.worker.ts
tests/audit-event-sanitizer.spec.ts
tests/audit-request.middleware.spec.ts
tests/audit-event-worker.spec.ts
```

## Environment

Add env variables:

| Variable | Type | Default | Rule |
| --- | --- | --- | --- |
| `AUDIT_LOG_ENABLED` | boolean-like | `true` | Enables HTTP audit event enqueue. |
| `AUDIT_LOG_PAYLOADS_ENABLED` | boolean-like | `true` | Enables sanitized request payload capture. |
| `AUDIT_LOG_RESPONSE_PAYLOADS_ENABLED` | boolean-like | `false` | Enables sanitized response payload capture. |
| `AUDIT_LOG_MAX_PAYLOAD_BYTES` | integer | `16384` | Max serialized bytes per request or response payload. |
| `AUDIT_LOG_REDIS_STREAM` | string | `ci3:audit_events:stream` | Redis Stream key. |
| `AUDIT_LOG_REDIS_GROUP` | string | `platform-api-audit-writers` | Redis consumer group. |
| `AUDIT_LOG_WORKER_BATCH_SIZE` | integer | `250` | Max records per DB batch. |
| `AUDIT_LOG_WORKER_BLOCK_MS` | integer | `1000` | `XREADGROUP BLOCK` duration. |
| `AUDIT_LOG_PENDING_IDLE_MS` | integer | `60000` | Min idle before pending claim. |

Export under `env.auditLog`.

## Redis keys

Add:

```ts
export enum RedisKeys {
  AuditEventsStream = "ci3:audit_events:stream",
}
```

Use `env.auditLog.redisStream` when available. Keep `RedisKeys.AuditEventsStream` as the default constant.

## SQL

Create migration:

```sql
CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` char(36) NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `redis_stream_id` varchar(64) NULL,
  `source` enum('http','domain') NOT NULL DEFAULT 'http',
  `action` varchar(120) NULL,
  `resource_type` varchar(120) NULL,
  `resource_id` varchar(191) NULL,
  `user_id` bigint unsigned NULL,
  `client_id` bigint unsigned NULL,
  `plan_id` bigint unsigned NULL,
  `phone_verified` tinyint(1) NULL,
  `method` varchar(10) NOT NULL,
  `route_path` varchar(255) NULL,
  `original_url` varchar(1024) NOT NULL,
  `status_code` smallint unsigned NOT NULL,
  `duration_ms` int unsigned NOT NULL,
  `ip_address` varchar(64) NULL,
  `user_agent` varchar(512) NULL,
  `request_payload` json NULL,
  `response_payload` json NULL,
  `payload_truncated` tinyint(1) NOT NULL DEFAULT 0,
  `error_code` varchar(120) NULL,
  `metadata` json NULL,
  `request_started_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_events_event_id` (`event_id`),
  KEY `idx_audit_events_client_created` (`client_id`, `created_at`),
  KEY `idx_audit_events_user_created` (`user_id`, `created_at`),
  KEY `idx_audit_events_request_id` (`request_id`),
  KEY `idx_audit_events_action_created` (`action`, `created_at`),
  KEY `idx_audit_events_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_events_status_created` (`status_code`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Audit event contract

```ts
type AuditEventSource = "http" | "domain";

type AuditEventPayload = {
  eventId: string;
  requestId: string;
  source: AuditEventSource;
  action: string | null;
  resourceType: string | null;
  resourceId: string | null;
  context: {
    userId: number | null;
    clientId: number | null;
    planId: number | null;
    phoneVerified: boolean | null;
  };
  http: {
    method: string;
    routePath: string | null;
    originalUrl: string;
    statusCode: number;
    durationMs: number;
    ipAddress: string | null;
    userAgent: string | null;
  };
  requestPayload: unknown | null;
  responsePayload: unknown | null;
  payloadTruncated: boolean;
  errorCode: string | null;
  metadata: Record<string, unknown> | null;
  requestStartedAt: string;
  createdAt: string;
};
```

## HTTP middleware

Add `auditRequestMiddleware`.

Register order:

```ts
app.use(requestIdMiddleware);
app.use(auditRequestMiddleware);
app.use(corsMiddleware);
app.use(responseSanitizerMiddleware);
```

Requirements:

- Emit one `source="http"` audit event for every completed HTTP response when `AUDIT_LOG_ENABLED=true`.
- Emit on `response.finish`.
- Do not block the response on DB writes.
- Enqueue to Redis Stream with `XADD`.
- Use `request.context.requestId`.
- Read auth context at finish time so routes after `authSessionContextMiddleware` include populated `userId`, `clientId`, `planId`, and `phoneVerified`.
- Map `phoneVerified = Boolean(request.context.authSession.phoneVerifiedAt)` when auth context exists.
- Use `request.route?.path` plus `request.baseUrl` when available for `routePath`.
- Use `request.originalUrl` for `originalUrl`.
- Capture `request.body` only after sanitizer and size limit.
- Capture response body only for `response.json` and only when `AUDIT_LOG_RESPONSE_PAYLOADS_ENABLED=true`.
- Capture sanitized response body, not raw body.
- Set `payloadTruncated=true` when request or response payload exceeds `AUDIT_LOG_MAX_PAYLOAD_BYTES`.
- Set `action` automatically:

| Method | Default action |
| --- | --- |
| `GET` | `http.read` |
| `POST` | `http.create` |
| `PUT` | `http.update` |
| `PATCH` | `http.update` |
| `DELETE` | `http.delete` |
| Other | `http.request` |

- Set `source="http"` for middleware events.
- Set `resourceType` and `resourceId` to `null` for automatic middleware events.
- Set `errorCode` from JSON error response `code` when available.
- On Redis enqueue failure, emit a structured application error log and do not throw from `finish`.

## Sanitizer

Redact recursively by key, case-insensitive:

```ts
const SENSITIVE_AUDIT_KEYS = [
  "password",
  "senha",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "set-cookie",
  "card",
  "cardNumber",
  "securityCode",
  "cvc",
  "cvv",
  "iuguToken",
  "gatewayToken",
  "cpf",
  "cnpj",
  "document",
  "purchaseCpf",
  "file",
  "buffer",
  "base64"
];
```

Rules:

- Replace sensitive values with `"[REDACTED]"`.
- Limit nested object depth to `6`.
- Limit arrays to first `50` items and add `{ "_truncatedItems": number }` when truncated.
- Limit strings to `2048` characters and add truncation marker.
- Serialize Dates as ISO strings.
- Replace Buffers, streams, and file uploads with metadata only.
- Never mutate the original request or response object.

## Redis Stream queue

Use Redis Stream commands:

```text
XADD {stream} * event {json}
XGROUP CREATE {stream} {group} $ MKSTREAM
XREADGROUP GROUP {group} {consumer} COUNT {batchSize} BLOCK {blockMs} STREAMS {stream} >
XAUTOCLAIM {stream} {group} {consumer} {minIdleMs} 0 COUNT {batchSize}
XACK {stream} {group} {ids...}
```

Requirements:

- Create consumer group idempotently on worker startup.
- Process new messages with `XREADGROUP`.
- Claim stale pending messages with `XAUTOCLAIM`.
- Acknowledge only after successful DB commit or duplicate-safe DB insert.
- Do not use `LPUSH`/`BRPOP` for this audit pipeline.
- Do not use Redis as final storage.

## Worker

Add script:

```json
{
  "worker:audit-events": "tsx src/workers/audit-events.worker.ts"
}
```

Worker requirements:

- Authenticate database connections.
- Connect Redis.
- Disable database query logging.
- Ensure Redis consumer group exists.
- Read batches from Redis Stream.
- Validate event JSON shape.
- Insert valid events in one DB batch.
- Acknowledge successfully persisted messages.
- Move invalid messages to dead-letter metadata by inserting an `audit_events` row with `action="audit.invalid_event"` when safe; otherwise log and `XACK` invalid poison messages after validation failure.
- Log worker batch result with `processed`, `inserted`, `duplicates`, `invalid`, and `durationMs`.
- Sleep only when no messages are available.

## Repository

Implement batch insert with duplicate safety.

Use SQL equivalent:

```sql
INSERT INTO audit_events (
  event_id,
  request_id,
  redis_stream_id,
  source,
  action,
  resource_type,
  resource_id,
  user_id,
  client_id,
  plan_id,
  phone_verified,
  method,
  route_path,
  original_url,
  status_code,
  duration_ms,
  ip_address,
  user_agent,
  request_payload,
  response_payload,
  payload_truncated,
  error_code,
  metadata,
  request_started_at,
  created_at
) VALUES (...)
ON DUPLICATE KEY UPDATE
  redis_stream_id = VALUES(redis_stream_id);
```

Do not update request/response payloads on duplicate.

## Domain action helper

Add helper:

```ts
type AuditUserActionInput = {
  request: Request;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown>;
  requestPayload?: unknown;
  responsePayload?: unknown;
};

async function auditUserAction(input: AuditUserActionInput): Promise<void>;
```

Requirements:

- Use current request context.
- Emit `source="domain"`.
- Use same Redis Stream queue.
- Sanitize payloads and metadata.
- Do not throw to callers when audit enqueue fails; log the failure with request id.
- Do not retrofit every module with semantic events in this task.

## Non-goals

- Do not add search/admin endpoints for audit events.
- Do not store raw card, token, password, document, file, or authorization data.
- Do not write audit events directly to MySQL from HTTP middleware.
- Do not block HTTP responses waiting for audit DB inserts.
- Do not implement OpenSearch, ClickHouse, New Relic, S3, or MinIO in this task.

## Tests

Add tests for:

- Middleware emits one Redis Stream event on successful request.
- Middleware emits one Redis Stream event on error response.
- Event context includes request id, user id, client id, plan id, and phone verified when auth context is populated.
- Public route event has null user/client context.
- Request payload is sanitized and size-limited.
- Response payload is omitted when `AUDIT_LOG_RESPONSE_PAYLOADS_ENABLED=false`.
- Response payload is sanitized and size-limited when enabled.
- Sensitive nested keys are redacted.
- Redis enqueue failure does not fail the HTTP response.
- Worker creates consumer group idempotently.
- Worker reads Redis Stream batches and inserts one DB batch.
- Worker acknowledges only persisted messages.
- Worker duplicate event id does not create duplicate DB rows.
- Worker claims stale pending messages.
- `auditUserAction` emits a `source="domain"` event with semantic action/resource fields.

## Documentation

Document:

- Audit table fields.
- Redis Stream pipeline.
- Worker operation and deployment command.
- Env variables.
- Redaction rules.
- Payload capture defaults.
- How to add semantic user action audit events in use cases.
