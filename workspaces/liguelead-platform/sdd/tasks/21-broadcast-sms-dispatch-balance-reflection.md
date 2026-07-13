---
id: broadcast-sms-dispatch-balance-reflection
title: Reflect broadcast SMS batch billing in credits and balance correctly
scope: broadcast-sms
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- --run tests/broadcast-sms-dispatch.service.spec.ts tests/broadcast-sends.repository.spec.ts tests/broadcast-mailing-populator.service.spec.ts
docs_targets:
  - /home/rick/projetos/platform-api/docs/human/modules/broadcasts.md
  - /home/rick/projetos/platform-api/docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - broadcast-sms-dispatch-worker-batch-billing
  - broadcast-sms-dispatch-postpaid-tariff-resolution
  - broadcast-sms-dispatch-payment-item-fees
---

Implementar a regra de reflexo financeiro da cobrança batch a batch do broadcast SMS nas tabelas legadas de saldo.

Regras:
- Pré-pago: ao consumir units do lote, registrar actions_has_fees com unit_id/payment_item_id, atualizar as quantidades em units, consolidar credits com SUM(units.quantity) e consolidar balances com SUM(units.quantity * units.unity_value) para o client e credit type.
- Pós-pago: não negativar units e não subtrair credits. Registrar actions_has_fees com a tarifa pós-paga resolvida e subtrair somente o custo financeiro do lote em balances.value para o client e credit type correspondente.
- Custo pós-pago do lote: quantidade de créditos consumidos * tarifa unitária resolvida.

Implementação realizada:
- UnitBatchBillingService passou a recalcular credits e balances no fluxo pré-pago.
- UnitBatchBillingService passou a debitar apenas balances no fluxo pós-pago, removendo o decremento de credits.
- Testes cobrem que pré-pago recalcula credits/balances e que pós-pago não atualiza credits, apenas balances com o custo calculado.
