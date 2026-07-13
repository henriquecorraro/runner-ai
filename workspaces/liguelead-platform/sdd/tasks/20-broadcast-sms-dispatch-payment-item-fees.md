---
id: broadcast-sms-dispatch-payment-item-fees
title: Persist payment item id in broadcast SMS batch fees
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - "cd /home/rick/projetos/platform-api && npm run typecheck"
  - "cd /home/rick/projetos/platform-api && npm test -- --run tests/broadcast-sms-dispatch.service.spec.ts tests/broadcast-sends.repository.spec.ts tests/broadcast-mailing-populator.service.spec.ts"
  - "cd /home/rick/projetos/platform-api && npm run build"
docs_targets:
  - platform-api:src/modules/broadcasts/services/broadcast-sms-dispatch.service.ts
  - platform-api:tests/broadcast-sms-dispatch.service.spec.ts
depends_on:
  - broadcast-sms-dispatch-worker-batch-billing
---

When the new broadcast SMS dispatch worker charges prepaid units batch by batch, persist the consumed unit's payment_item_id into actions_has_fees.payment_item_id along with unit_id, unity_value, quantity, credit type, and status. This keeps fee rows traceable to the original payment item whenever prepaid units are consumed.
