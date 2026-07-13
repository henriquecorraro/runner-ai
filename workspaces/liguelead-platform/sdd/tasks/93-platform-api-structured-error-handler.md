---
id: platform-api-structured-error-handler
title: Add structured and performant platform-api error handling logs
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
---

## Files

Modify:

```text
src/infra/http/error-handler.ts
src/infra/http/not-found-handler.ts
src/infra/http/request-id.middleware.ts
src/auth/request-context.ts
```

Add when useful:

```text
src/infra/logging/logger.ts
src/infra/logging/log-sanitizer.ts
src/infra/logging/error-log.mapper.ts
src/infra/http/error-response.mapper.ts
tests/error-handler.spec.ts
tests/log-sanitizer.spec.ts
```

## Error response contract

Keep response shape stable:

```ts
type ErrorResponse = {
  message: string;
  code: string;
  requestId?: string;
  details?: unknown;
};
```

Do not expose stack traces in HTTP responses.

Do not expose SQL strings, gateway payloads, credentials, tokens, passwords, PAN, CVC, authorization headers, cookies, or raw database errors in HTTP responses.

## Error classification

| Source | HTTP status | Code | Log level |
| --- | ---: | --- | --- |
| `ZodError` | 400 | `VALIDATION_ERROR` | `warn` |
| `AppError` | `error.statusCode` | `error.code` | `warn` for `<500`, `error` for `>=500` |
| `UniqueConstraintError` | 409 | `UNIQUE_CONSTRAINT_VIOLATION` | `warn` |
| MySQL duplicate entry `ER_DUP_ENTRY` or `errno=1062` | 409 | `UNIQUE_CONSTRAINT_VIOLATION` | `warn` |
| Express JSON parse error `entity.parse.failed` | 400 | `INVALID_JSON_BODY` | `warn` |
| Unknown error | 500 | `INTERNAL_SERVER_ERROR` | `error` |
| Not found handler | 404 | `ROUTE_NOT_FOUND` | no error log by default |

## Structured error log contract

Emit one structured log for every handled error except `ROUTE_NOT_FOUND` unless the route decides otherwise.

```ts
type HttpErrorLogEvent = {
  level: "warn" | "error";
  event: "http_error";
  requestId: string | null;
  method: string;
  path: string;
  statusCode: number;
  errorCode: string;
  errorName: string;
  message: string;
  context: {
    userId: number | null;
    clientId: number | null;
    planId: number | null;
    phoneVerified: boolean | null;
  };
  details?: unknown;
  stack?: string;
};
```

Context mapping:

| Request context field | Log field |
| --- | --- |
| `request.context.requestId` | `requestId` |
| `request.context.authSession.userId > 0` | `context.userId` |
| `request.context.authSession.clientId > 0` | `context.clientId` |
| `request.context.authSession.planId` | `context.planId` |
| `Boolean(request.context.authSession.phoneVerifiedAt)` | `context.phoneVerified` |

## Logger requirements

- Use a lightweight logger wrapper.
- Emit JSON-compatible objects.
- Avoid heavy deep cloning on the hot path.
- Build error log payload only when an error reaches `errorHandler`.
- Serialize unknown errors safely.
- Include stack only for `level="error"` and only in non-production logs unless the existing deployment log collector requires stacks.
- Cap serialized `details` depth and size.
- Redact sensitive keys recursively before logging.

Sensitive keys:

```ts
const SENSITIVE_LOG_KEYS = [
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
  "purchaseCpf"
];
```

## Error handler requirements

- Preserve current `ZodError`, `AppError`, Sequelize unique constraint, and MySQL duplicate entry behavior.
- Add invalid JSON body handling.
- Normalize unknown thrown values, including strings and plain objects.
- Always include `requestId` in responses when available.
- Always include request context fields in logs when available.
- Do not use `console.error({ requestId, error })` directly.
- Do not log complete request bodies in this task.
- Do not log successful responses in this task.
- Do not add request/response audit persistence in this task.

## Tests

Add tests for:

- `ZodError` returns 400 and logs `warn`.
- `AppError` returns configured status/code and logs expected level.
- `UniqueConstraintError` returns 409 and logs `warn`.
- MySQL duplicate entry returns 409 and logs `warn`.
- Invalid JSON body returns 400 `INVALID_JSON_BODY` and logs `warn`.
- Unknown error returns 500 and logs `error`.
- Unknown non-Error throw returns 500 and logs `error`.
- Log payload includes request id and auth context.
- Log redaction removes nested sensitive fields.
- HTTP response never includes stack traces or raw sensitive details.

## Documentation

Document:

- Error response shape.
- Error classification table.
- Structured error log fields.
- Redaction rules.
- Explicit non-goal: full request/response audit logging.
