---
id: broadcast-sms-dispatch-postpaid-tariff-resolution
title: Resolve postpaid SMS tariff during broadcast batch billing
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

Adjust the new broadcast SMS dispatch batch billing so postpaid clients use the same tariff resolution order as the legacy UnitLegacy_service::getUnitaryValueClientPostPaid path: customized_packages.unitary_value for the client and credit type, then the latest approved new-purchase payment_items.unity_value, then the loose Avulso package unitary_value. The resolved tariff must be written to actions_has_fees before invoking the SMS Lambda; it must not default to zero when a valid tariff exists.
