---
id: provisionar-cr-ditos-de-broadcasts-agendados-por-tipo
title: "Provisionar créditos de broadcasts agendados por tipo"
scope: broadcast-billing
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- --runInBand broadcast-billing
  - npm test -- --runInBand broadcast-scheduling
docs_targets:
  - docs/human/broadcasts.md
  - docs/human/broadcast-billing.md
depends_on:
  - cobrar-sms-com-vari-veis-pelo-tamanho-final-por-lead
---

Implementar provisionamento explícito de créditos para broadcasts agendados, considerando o consumo futuro antes de permitir novos agendamentos.

Problema:
- Quando um cliente agenda um broadcast futuro, o saldo ainda não é consumido no momento do agendamento.
- Se ele agenda outro broadcast antes do primeiro executar, a validação precisa considerar o saldo disponível menos o que já está reservado pelos agendamentos abertos.
- Hoje há uma solução parcial baseada em `actions.cost_provisioned`, mas esse campo único perde o detalhamento por tipo de crédito e fica frágil para chamadas com interação SMS, SMS Flash e SMS variável.

Contexto observado no platform-api:
- `BroadcastBalanceService.check` já desconta `listOpenProvisionedCredits` do saldo disponível.
- `BroadcastBalanceRepository.listOpenProvisionedCredits` hoje deriva provisionados de `actions.cost_provisioned`, `actions.types_id`, `actions.total_shipping` e interações.
- `BroadcastCostEstimatorService.estimate` já retorna `creditTypeBreakdown` com `creditsTypeId` e `quantity`, que é o formato correto para provisionar.
- `scheduleBroadcastActionUseCase` salva `costPrediction` e `costProvisioned` como totais no `actions` criado.

Implementação sugerida:
1. Criar uma tabela dedicada, por exemplo `action_provisions` ou `broadcast_action_provisions`, com pelo menos: `id`, `actions_id`, `credits_types_id`, `quantity`, `created_at`, `updated_at`.
2. Adicionar índices/constraint para consulta e integridade: índice por `(actions_id)`, índice por `(credits_types_id)`, e preferencialmente unique `(actions_id, credits_types_id)`.
3. No agendamento, após criar a action/send e dentro da mesma transação, gravar uma linha por item de `estimate.creditTypeBreakdown`.
   - Broadcast ligação simples: uma linha de ligação.
   - Ligação com interação SMS: uma linha de ligação e uma linha de SMS.
   - SMS: uma linha de SMS.
   - SMS Flash: uma linha de SMS Flash.
4. Alterar `BroadcastBalanceRepository.listOpenProvisionedCredits` para somar `action_provisions.quantity` agrupado por `credits_types_id`, juntando com `actions` para filtrar somente agendamentos/provisionamentos abertos do cliente.
5. Definir status elegíveis para provisionamento aberto mantendo a regra atual como ponto de partida: `actions.status_id IN (2, 3)` e execução futura/pendente.
6. Remover a dependência lógica de `actions.cost_provisioned` para cálculo por tipo; manter o campo apenas como legado/compatibilidade de resposta se necessário.
7. Quando o broadcast começar a rodar e o disparo assumir a cobrança real, deletar os registros de provisionamento daquela action.
   - Para SMS/SMS Flash, remover os provisionamentos quando o dispatcher processar/finalizar a action, já que a cobrança real ocorre por lote em `BroadcastSmsDispatchService`.
   - Para ligação, remover os provisionamentos no ponto equivalente em que o disparo/runtime passa a consumir ou registrar o custo real.
   - Para cancelamento/status finalizado sem disparo, também remover ou garantir que deixem de contar explicitamente.
8. Para SMS variável, garantir que o provisionamento use o custo real materializado por lead. Se a materialização já ocorrer no agendamento, somar os `credits` da tabela `sms_numbers_{actionId}`; se a estimativa ainda for anterior à materialização, alinhar a ordem para provisionar depois da materialização ou recalcular o breakdown a partir dela.

Observação técnica:
- A tabela dedicada é melhor que evoluir `actions.cost_provisioned`, porque o custo é naturalmente multi-dimensional por tipo de crédito. Ela evita CASEs frágeis no SQL e deixa `BroadcastBalanceService` continuar simples: disponível bruto menos provisionado agrupado por tipo.
- O ciclo esperado é: criar provisionamento no agendamento; considerar esse provisionamento em novos agendamentos; deletar o provisionamento quando o broadcast disparar/cobrar de fato.
- Para performance, a consulta de saldo deve ser um `SUM(quantity) GROUP BY credits_types_id` com join filtrado em `actions.clients_id`, `status_id` e data/hora pendente.
