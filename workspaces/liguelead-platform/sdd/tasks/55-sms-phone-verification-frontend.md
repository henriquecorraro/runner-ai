---
id: sms-phone-verification-frontend
title: SMS phone verification screen with countdown resend
scope: sms-phone-verification
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - sms-phone-verification-backend
---

## Objective

Implement the SMS phone verification screen in the frontend that blocks platform navigation until the user verifies their phone number. Includes a countdown-based resend mechanism and global error interception.

## Prerequisites

- Backend task `sms-phone-verification-backend` must be implemented first (endpoints available).

## Global API interceptor change

In `src/service/api.ts`, add handling for 403 `PHONE_NOT_VERIFIED` in the response error interceptor:

```typescript
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        clearAuthSession()
        if (window.location.pathname !== '/auth/login') {
          window.location.assign('/auth/login')
        }
      }

      if (
        error.response?.status === 403 &&
        error.response?.data?.code === 'PHONE_NOT_VERIFIED'
      ) {
        if (window.location.pathname !== '/auth/verify-phone') {
          window.location.assign('/auth/verify-phone')
        }
      }
    }

    return Promise.reject(error)
  },
)
```

## New route: `/auth/verify-phone`

Add to `src/routes/AppRoutes.tsx`:
- Lazy-load a new page `VerifyPhone`.
- This route should be inside `RequireAuth` but NOT inside `PlatformLayout` (it's a standalone fullscreen page like login).
- Place it between auth guard and platform layout (same level as PlatformLayout route).

```tsx
const VerifyPhone = lazy(() => import('@/pages/Auth/VerifyPhone/VerifyPhone'))

// Inside RequireAuth:
<Route element={<RequireAuth />}>
  <Route path="/auth/verify-phone" element={withAuthFallback(<VerifyPhone />)} />
  <Route element={<PlatformLayout />}>
    {/* ... existing routes */}
  </Route>
</Route>
```

## New page: `src/pages/Auth/VerifyPhone/VerifyPhone.tsx`

### Layout

Centered card (same visual style as Register page), containing:
1. Title: "Verificação de telefone"
2. Description: "Enviamos um código de 6 dígitos para o seu telefone. Digite-o abaixo para continuar."
3. 6-digit code input (single input with `maxLength={6}`, `inputMode="numeric"`, `pattern="[0-9]*"`).
4. Submit button: "Verificar"
5. Resend section:
   - When countdown active: "Reenviar código em **Xs**" (disabled, grey text)
   - When countdown finished: clickable link "Reenviar código"
6. Error messages displayed inline below the input.

### Behavior

#### On mount:
- Call `POST /sms-verification/send` to trigger the first SMS.
- Start 60-second countdown.
- If send returns 429 with `retryAfterSeconds`, use that value for countdown.

#### On submit (verify):
- Call `POST /sms-verification/validate` with `{ code }`.
- On success (`verified: true`): redirect to `/leads`.
- On error `INVALID_CODE`: show inline error "Código inválido. X tentativas restantes." (use `attemptsRemaining` from response).
- On error `TOKEN_EXPIRED_OR_NOT_FOUND`: show "Código expirado. Solicite um novo código."
- On error `SMS_VERIFY_BLOCKED`: show "Muitas tentativas. Tente novamente em X minutos." and disable form.

#### On resend click:
- Call `POST /sms-verification/send`.
- Restart 60-second countdown.
- If 429, show remaining time.
- Disable resend button during countdown.

### Countdown logic

- Use `useState` + `useEffect` with `setInterval` (1s tick).
- Persist countdown end timestamp in sessionStorage to survive page refreshes.
- Button enabled only when countdown reaches 0.

## New service file: `src/service/sms-verification/sms-verification-service.ts`

```typescript
import api from '@/service/api'

export async function sendVerificationCode() {
  const { data } = await api.post('/sms-verification/send')
  return data
}

export async function validateVerificationCode(code: string) {
  const { data } = await api.post('/sms-verification/validate', { code })
  return data
}
```

## Changes to `GET /users/me` usage (optional enhancement)

If the `RequireAuth` guard or any layout component calls `/users/me`, it can use the `phoneVerified` field to proactively redirect to `/auth/verify-phone` without waiting for a 403 from another endpoint. This is a UX nicety but not strictly required since the interceptor handles it globally.

## Styles

Follow existing project conventions (styled-components via `*.styles.ts` files if that is the pattern, or inline styles matching the auth pages).
