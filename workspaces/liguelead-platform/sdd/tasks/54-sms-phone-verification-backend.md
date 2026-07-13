---
id: sms-phone-verification-backend
title: SMS phone verification module for account creation
scope: sms-phone-verification
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
---

## Objective

Implement SMS phone verification that blocks platform access until the client verifies their phone number after account creation.

## Database Changes (migrations)

Create migration file `migrations/008-sms-verification.sql` with:

### 1. New table `sms_verification_tokens`

```sql
CREATE TABLE sms_verification_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  token CHAR(6) NOT NULL,
  attempts TINYINT UNSIGNED DEFAULT 0,
  used TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client_id (client_id),
  INDEX idx_client_created (client_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. New column on `clients`

```sql
ALTER TABLE clients ADD COLUMN phone_verified_at DATETIME NULL DEFAULT NULL;
```

## New module: `src/modules/sms-verification/`

Structure:
```
src/modules/sms-verification/
  ├── controllers/sms-verification.controller.ts
  ├── use-cases/sms-verification.use-cases.ts
  ├── routes/sms-verification.routes.ts
  ├── schemas/sms-verification.schemas.ts
  └── services/sms-verification-dispatch.service.ts
```

### Endpoints

Both endpoints require session auth (behind `authSessionContextMiddleware`).

#### `POST /sms-verification/send`

Flow:
1. Get `clientId` from auth session context.
2. Check Redis key `sms_verify_cooldown:{clientId}` — if exists, return 429 with `{ code: "SMS_COOLDOWN_ACTIVE", retryAfterSeconds: <TTL remaining> }`.
3. Fetch client phone from DB: `SELECT whatsapp_ddi, whatsapp FROM clients WHERE id = :clientId`.
4. Generate 6-digit token via `crypto.randomInt(100000, 999999)`.
5. Insert into `sms_verification_tokens` (client_id, phone, token, created_at).
6. Set Redis cooldown key `sms_verify_cooldown:{clientId}` with TTL 60 seconds.
7. Dispatch SMS via AWS Lambda (use existing `AWS_SMS_LAMBDA_FUNCTION_ARN` from env):
   - Lookup active gateway: `SELECT id FROM sms_gateways WHERE active = 1 AND is_flash = 0 ORDER BY id ASC LIMIT 1`
   - Invoke Lambda with `InvocationType: 'Event'` (async)
   - Payload format: `{"body": "{\"actionId\":null,\"actionBatch\":0,\"clientId\":0,\"gatewayId\":<id>,\"data\":[{\"destination\":\"<ddi+phone>\",\"message\":\"Use o código <token> para continuar seu cadastro na LigueLead.\"}]}"}`
   - When `SMS_ENABLED=false` (dev), log to console: `[SMS-VERIFICATION] Code for <phone> (clientId=<id>): <token>`
8. Return 200 `{ sent: true }`.

#### `POST /sms-verification/validate`

Input body: `{ code: string }` (6-digit string, validated with zod).

Flow:
1. Get `clientId` from auth session context.
2. Check Redis key `sms_verify_block:{clientId}` — if exists, return 429 `{ code: "SMS_VERIFY_BLOCKED", retryAfterSeconds: <TTL remaining> }`.
3. Find latest unused token: `SELECT * FROM sms_verification_tokens WHERE client_id = :clientId AND used = 0 AND created_at >= NOW() - INTERVAL 10 MINUTE ORDER BY created_at DESC LIMIT 1`.
4. If no token found, return 400 `{ code: "TOKEN_EXPIRED_OR_NOT_FOUND" }`.
5. If token.attempts >= 5, set Redis block key `sms_verify_block:{clientId}` TTL 15 minutes, return 429 `{ code: "SMS_VERIFY_BLOCKED", retryAfterSeconds: 900 }`.
6. If code does not match: increment `attempts` on the row, return 400 `{ code: "INVALID_CODE", attemptsRemaining: 5 - newAttempts }`.
7. If code matches:
   - Mark token `used = 1`.
   - Update client: `UPDATE clients SET phone_verified_at = NOW() WHERE id = :clientId`.
   - Invalidate auth session cache: delete Redis key `auth_session_context:{userId}` so next request re-fetches with phoneVerifiedAt.
   - Return 200 `{ verified: true }`.

## Phone verification guard middleware

Create `src/auth/phone-verified.middleware.ts`:

- Reads `phone_verified_at` from the auth session context.
- If `null`, throws `ForbiddenError("Phone not verified", "PHONE_NOT_VERIFIED")`.
- Applied in `src/app/app.ts` AFTER `authSessionContextMiddleware` and BEFORE `appRouter`.
- Exempt routes (registered BEFORE the guard, same pattern as customer-accounts): `/sms-verification/*` and `/users/me`.

## Changes to `AuthSessionContext`

In `src/auth/request-context.ts`, add field:
```typescript
phoneVerifiedAt: string | null
```

In `src/modules/users/use-cases/users.use-cases.ts` (`resolveAuthSessionContextUseCase`):
- Query `phone_verified_at` from `clients` table when resolving (alongside planId).
- Include in the cached Redis object.
- Parse from cache on subsequent requests.

## Changes to `GET /users/me` response

Add `phoneVerified: boolean` to the response payload (derived from `authSession.phoneVerifiedAt !== null`). This endpoint is exempt from the guard so the front can always read it.

## Environment variables

Add to `src/infra/config/env.ts`:
- `SMS_ENABLED`: boolean, default `false`

## Route registration in `src/app/app.ts`

Final order:
```typescript
app.use("/customer-accounts", customerAccountsRouter);
app.use(authSessionContextMiddleware);
app.use("/sms-verification", smsVerificationRouter);  // after auth, before guard
app.use("/users", usersRouter);                         // after auth, before guard
app.use(phoneVerifiedMiddleware);                       // guard
app.use(appRouter);                                     // all other protected routes
```

Note: extract `/users` from `appRouter` to mount it before the guard alongside sms-verification.

## Tests

- Unit test for send use case (cooldown logic, token generation).
- Unit test for validate use case (match, attempts, block).
- Unit test for phone-verified middleware (allows verified, blocks unverified, skips exempt routes).
