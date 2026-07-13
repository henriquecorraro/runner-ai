---
id: broadcast-voice-close-and-billing-worker
title: Fechar broadcasts de ligacao e cobrar chamadas atendidas
scope: broadcast
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-voice-close-worker.spec.ts
  - npm test -- tests/broadcast-voice-billing.service.spec.ts
  - npm run typecheck
docs_targets:
  - docs/human/modules/broadcasts.md
  - docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - broadcast-voice-start-worker
---

# Task: Fechar broadcasts de ligacao e cobrar chamadas atendidas

## Goal

Criar um worker dedicado para fechar envios de ligacao iniciados (`status_id = 4`) e cobrar as chamadas atendidas a partir da tabela dinamica `dialer_mailings.dialer_numbers_<dialer_campaign_id>`.

## Business Rules

Buscar envios de ligacao simples/interativa com:

- `actions.status_id = 4` (`Iniciado`)
- `actions.types_id IN (1, 2)`
- `actions.dialer_id = 2`
- `actions.dialer_campaign_id IS NOT NULL`
- `actions.deleted = 0`

Para cada envio:

1. Verificar a janela de encerramento usando horario Brasil.
2. Se chegou o horario limite:
   - fechar o envio alterando `actions.status_id` para `7`
   - registrar transicao em `actions_has_status`
   - alterar `dialer.dialer_campaigns.status` para `3`
   - cobrar as chamadas atendidas da tabela dinamica.
3. Se ainda nao chegou o horario limite:
   - consultar a tabela dinamica com `COUNT(*)` de linhas onde `status IN (0, 1)`.
   - Se existir qualquer linha, o discador ainda esta trabalhando e nada deve ser feito.
   - Se nao existir linha pendente, considerar envio terminado antes do limite:
     - cobrar chamadas atendidas
     - alterar `actions.status_id` para `7`
     - registrar transicao em `actions_has_status`
     - alterar `dialer.dialer_campaigns.status` para `3`.

## Billing Rules

- Cobrar apenas ligacoes atendidas.
- A referencia inicial para atendida deve ser `call_status = 'ANSWER'` e `billsec > 0`.
- Cobrar `1` credito a cada `30` segundos por ligacao atendida.
- Usar arredondamento para cima: `ceil(billsec / 30)`, com minimo de `1` credito para atendidas.
- Evitar cobranca duplicada:
  - considerar `tariffed = 0` como pendente de cobranca quando possivel.
  - apos cobrar, marcar as linhas cobradas como `tariffed = 1`.
- Atualizar totais da action conforme resultado materializado:
  - `credits_voice`
  - `total_voz`
  - `total_send_voice`
- A cobranca deve seguir o boundary/infra de billing existente no modulo, consumindo creditos do tipo Ligacao (`credits_types` Ligacao) e escrevendo rastreabilidade equivalente aos fluxos novos/legados.

## Operational Notes

- A tabela dinamica esperada fica em `dialer_mailings.dialer_numbers_<dialer_campaign_id>`.
- O discador atualiza campos como `call_status`, `status`, `billsec`, `call_start`, `call_end`, `captured_dtmf`, `playback_time` e `updated_at`.
- Se a tabela dinamica nao existir, tratar como erro operacional observavel, sem derrubar o loop do worker inteiro.
- Usar horario Brasil calculado pela API, nao depender do timezone da sessao MySQL.

## Expected Outcome

O worker fecha automaticamente campanhas de voz quando passam do limite ou quando o discador nao tem mais linhas pendentes, cobra chamadas atendidas uma unica vez e encerra tambem a campanha no banco `dialer` com status `3`.
