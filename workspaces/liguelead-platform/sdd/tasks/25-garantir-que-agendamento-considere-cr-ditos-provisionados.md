---
id: garantir-que-agendamento-considere-cr-ditos-provisionados
title: "Garantir que agendamento considere créditos provisionados"
scope: broadcast-billing
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- tests/broadcast-scheduling.use-cases.spec.ts tests/broadcast-billing.service.spec.ts tests/broadcast-balance.repository.spec.ts
docs_targets:
  - docs/human/modules/broadcasts.md
---

Garantir que o fluxo de agendamento de broadcasts considere créditos já provisionados por agendamentos abertos antes de permitir um novo schedule.

Contexto esperado:
- `/broadcasts/actions/:id/schedule-estimate` e `/broadcasts/actions/:id/schedules` devem usar `BroadcastBalanceService.check`.
- `BroadcastBalanceService.check` deve subtrair `listOpenProvisionedCredits(clientId)` de `listAvailableCredits(clientId)` por `credits_types_id`.
- `BroadcastBalanceRepository.listOpenProvisionedCredits` deve ler `action_provisions` agrupado por tipo de crédito, filtrando actions futuras/pendentes do cliente.
- Ao criar um novo schedule, `BroadcastSendsRepository.create` deve gravar uma linha por item de `estimate.creditTypeBreakdown` em `action_provisions` dentro da mesma transação.

Execução:
- Verificar se o comportamento já está implementado.
- Se faltar cobertura, adicionar teste no agendamento para provar que saldo bruto suficiente é bloqueado quando parte dele já está provisionada em outro agendamento.
