---
id: implementar-disparo-e-cobran-a-de-sms-de-intera-o-de-voz-no-platform-api
title: "Implementar disparo e cobrança de SMS de interação de voz no platform-api"
scope: broadcasts
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-interaction-queue-worker.spec.ts tests/broadcast-sms-dispatch.service.spec.ts
  - npm run typecheck
docs_targets:
  - platform-api/docs/human/modules/broadcasts.md
  - platform-api/docs/human/modules/broadcast-legacy-flow.md
depends_on:
  - corrigir-url-audio-em-intera-es-de-voz-interativa-no-platform-api
---

Implementar no platform-api o runtime de processamento das interações DTMF que têm destino SMS, alinhando o comportamento legado do areadocliente.

Contexto atual:
- O platform-api já materializa interações em actions_has_interactions e dialer.dialer_numbers_action no agendamento.
- O worker interactive-voice-interactions apenas consome payloads Redis no formato legado `dialer_id;actions_id;dtmf_digit;number;action;sms_id;date;time` e insere linhas válidas em areadocliente.dialer_interactions_queue.
- No legado, DialerLigueLead::processing_queue_interactions processa dialer_interactions_queue, junta com sms, cobra créditos SMS, dispara a Lambda de SMS, grava sms_result/cache de batch e insere interactive_voice_result.
- Queremos trazer ou alinhar essa responsabilidade no platform-api para que SMS de interação seja disparado corretamente sem depender do runtime legado, preservando compatibilidade operacional.

Escopo esperado:
- Criar um serviço/worker no platform-api para processar registros de dialer_interactions_queue agrupados por actions_id, começando pelo caso action/destination SMS.
- Para cada interação SMS, carregar sms.message e sms.credits pelo sms_id, montar payload de Lambda compatível com o disparo legado/atual de SMS.
- Reutilizar ou adaptar o invoker de SMS existente (AwsLambdaSmsGatewayInvoker) quando possível, mantendo gatewayId ativo e formato compatível.
- Cobrar créditos SMS antes do disparo usando a lógica nova de billing por lote/unidade quando possível, ou documentar claramente qualquer bridge necessária com a tabela/serviço legado.
- Atualizar actions.total_sms e actions.total_send_sms de forma compatível com relatórios legados.
- Gravar sms_result com status Enviada para os SMS disparados por interação.
- Gravar interactive_voice_result com option/date/time/actions_id/phone, removendo campos runtime-only como o legado faz.
- Tratar Blocklist/Desligar fora do primeiro recorte se necessário, mas deixar explícito nos testes/docs qual parte ficou implementada.
- Garantir idempotência razoável: filas processadas não devem gerar SMS duplicado em retries simples; se a linha for removida antes do envio, justificar a semântica escolhida.
- Atualizar docs/human/modules/broadcasts.md e docs/human/modules/broadcast-legacy-flow.md para refletir a nova fronteira de responsabilidade.

Pontos de atenção:
- O SMS de interação pode ter áudio de continuação antes do envio; isso é independente do destino e já foi corrigido em task anterior.
- O sms_id em dialer_numbers_action e no callback é o template de SMS a enviar.
- O custo deve usar créditos de SMS, não créditos de voz.
- Não marcar a task como done sem validação funcional do usuário.
