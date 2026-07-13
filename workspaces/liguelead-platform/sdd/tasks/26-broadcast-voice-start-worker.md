---
id: broadcast-voice-start-worker
title: Unificar inicio de broadcasts agendados incluindo ligacao
scope: broadcast
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-sms-dispatch.service.spec.ts tests/broadcast-voice-start-worker.spec.ts
  - npm run typecheck
docs_targets:
  - docs/human/modules/broadcasts.md
  - docs/human/modules/broadcast-legacy-flow.md
---

# Task: Unificar inicio de broadcasts agendados incluindo ligacao

## Goal

Estender o worker/servico responsavel por disparos agendados para tambem iniciar envios de ligacao (`types_id` 1 e 2) quando chega a hora de execucao, mantendo um unico ponto operacional para tirar broadcasts do status `3` e colocá-los em execucao.

SMS/SMS Flash continuam no fluxo atual de envio/cobranca por batch. Ligacao entra nesse mesmo orquestrador apenas para iniciar a campanha no dialer; fechamento e cobranca de ligacao ficam em worker exclusivo na task `broadcast-voice-close-and-billing-worker`.

## Business Rules

- O worker unico de disparo deve continuar processando SMS/SMS Flash como hoje.
- No mesmo ciclo, tambem buscar `actions` de ligacao simples/interativa com:
  - `status_id = 3` (`Agendado`)
  - `types_id IN (1, 2)`
  - `dialer_id = 2`
  - `dialer_campaign_id IS NOT NULL`
  - `processing_queue = 0`
  - janela de data/hora pronta para envio (`date <= hoje Brasil`, `start_time <= agora Brasil`)
  - `deleted = 0`
- Ao iniciar um envio de ligacao:
  - alterar `actions.status_id` para `4` (`Iniciado`)
  - registrar transicao em `actions_has_status`
  - alterar `dialer.dialer_campaigns.status` para `2`
- O fluxo deve ser idempotente/concorrencia segura para nao iniciar o mesmo envio duas vezes.
- Nao deve iniciar enquanto a tabela dinamica de mailing ainda estiver sendo populada (`processing_queue = 1`).
- Nao cobrar, fechar ou ler resultados de ligacao neste worker; ele apenas entrega a campanha para o dialer.

## Implementation Notes

- Preferir reaproveitar/renomear o worker novo de SMS quando fizer sentido, por exemplo evoluindo `broadcast-sms-dispatch.service.ts` para um orquestrador de dispatch de broadcasts agendados.
- Separar internamente os handlers por tipo:
  - SMS/SMS Flash: fluxo atual de batch/cobranca/Lambda.
  - Ligacao: start da action e update de `dialer.dialer_campaigns`.
- Manter fechamento e cobranca de ligacao fora deste worker; isso pertence ao worker dedicado da task `broadcast-voice-close-and-billing-worker`.
- Usar horario Brasil calculado pela API, nao depender do timezone da sessao MySQL.
- Atualizar package scripts se necessario.

## Expected Outcome

O worker de disparo agendado vira o ponto unico para iniciar broadcasts prontos. Quando uma ligacao agendada estiver pronta e com mailing carregado, ele move a action para iniciada e libera a campanha no banco `dialer` com status `2`, deixando o fechamento/cobranca para o worker exclusivo de voz.
