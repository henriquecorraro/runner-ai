---
id: broadcast-postpaid-consume-balance-first
title: "Cobrar broadcast postpaid consumindo saldo antes da regra pós-paga"
scope: broadcast
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-sms-dispatch.service.spec.ts
  - npm run typecheck
docs_targets:
  - docs/human/modules/broadcast-legacy-flow.md
---

Ao cobrar batches de broadcast SMS/SMS Flash, clientes postpaid devem consumir saldo/unidades disponíveis primeiro, como um cliente prepaid. Quando o saldo/unidades zerarem durante a cobrança, apenas o excedente deve seguir a regra pós-paga, registrando fee sem unit_id/payment_item_id e abatendo o saldo financeiro pelo custo pós-pago.
