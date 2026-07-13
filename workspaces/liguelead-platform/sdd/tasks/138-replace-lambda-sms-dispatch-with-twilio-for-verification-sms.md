---
id: replace-lambda-sms-dispatch-with-twilio-for-verification-sms
title: Replace Lambda SMS dispatch with Twilio for verification SMS
scope: sms-verification
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4710249008
github_issue_number: 63
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/63
github_issue_node_id: I_kwDORpoJ688AAAABGMCyMA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/63
github_project_item_id: 202900280
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYAzg
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202900280"
github_project_status: Done
---

## Objective

Replace the AWS Lambda-based SMS dispatch in `sms-verification-dispatch.service.ts` with Twilio SMS API.

## Environment variables

Add to `src/infra/config/env.ts`:

| Env var | Zod schema | Default |
|---------|-----------|---------|
| `TWILIO_ACCOUNT_SID` | `z.string().default("")` | `""` |
| `TWILIO_AUTH_TOKEN` | `z.string().default("")` | `""` |
| `TWILIO_FROM_NUMBER` | `z.string().default("")` | `""` |

Expose in `env` object under `env.twilio.accountSid`, `env.twilio.authToken`, `env.twilio.fromNumber`.

## Dependencies

Install `twilio` package:

```bash
npm install twilio
```

## File: `src/modules/sms-verification/services/sms-verification-dispatch.service.ts`

Rewrite completely:

- Remove all AWS Lambda imports and `LambdaClient` usage.
- Remove the `sms_gateways` database query.
- Use the `twilio` SDK to send SMS directly.
- Keep the `env.sms.enabled` guard (if disabled, only log and return).
- Keep the console.log with the verification code for dev visibility.
- Phone destination format: `+${ddi}${phone}` (E.164).
- Message body unchanged: `` `Use o código ${token} para continuar seu cadastro na LigueLead.` ``

Target implementation:

```typescript
import Twilio from "twilio";
import { env } from "@/infra/config/env";

type DispatchInput = {
  clientId: number;
  phone: string;
  ddi: string;
  token: string;
};

const getTwilioClient = () => Twilio(env.twilio.accountSid, env.twilio.authToken);

export async function dispatchVerificationSms(input: DispatchInput): Promise<void> {
  console.log(
    `[SMS-VERIFICATION] Code for ${input.ddi}${input.phone} (clientId=${input.clientId}): ${input.token}`,
  );

  if (!env.sms.enabled) {
    return;
  }

  const client = getTwilioClient();
  await client.messages.create({
    to: `+${input.ddi}${input.phone}`,
    from: env.twilio.fromNumber,
    body: `Use o código ${input.token} para continuar seu cadastro na LigueLead.`,
  });
}
```

## Constraints

- Do NOT change any other SMS dispatch path (broadcasts, etc.) — only `sms-verification-dispatch.service.ts`.
- Do NOT remove `AWS_SMS_LAMBDA_FUNCTION_ARN` from env (still used by broadcast SMS).
- Existing tests that import `dispatchVerificationSms` must still compile. If mocking changes are needed, update them.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
