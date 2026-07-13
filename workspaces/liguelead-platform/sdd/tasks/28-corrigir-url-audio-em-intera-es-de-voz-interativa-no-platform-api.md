---
id: corrigir-url-audio-em-intera-es-de-voz-interativa-no-platform-api
title: "Corrigir url_audio em interações de voz interativa no platform-api"
scope: broadcasts
status: done
repositories:
  - platform-api
validation:
  - npm test -- tests/broadcast-sends.repository.spec.ts
  - npm run typecheck
docs_targets:
  - platform-api/docs/human/modules/broadcasts.md
  - platform-api/docs/human/modules/broadcast-legacy-flow.md
---

Ao agendar uma ligação com interação, o platform-api deve espelhar a configuração DTMF no banco do discador preservando o áudio de continuação sempre que a interação possuir audioId, independentemente do tipo de destino da interação.

Contexto:
- No legado areadocliente, actions_has_interactions guarda key/audio_id/sms_id/destination, e dialer.dialer_numbers_action recebe dtmf/action/url_audio/campaign_id/sms_id.
- A troca de áudio durante a ligação é governada por dialer_numbers_action.url_audio e não deve depender do destino ser SMS, Blocklist ou Desligar.
- Hoje o platform-api força url_audio = null quando destination === "SMS", impedindo o cenário "digitar 1, tocar próximo áudio, e depois enviar SMS".

Implementação esperada:
- Ajustar BroadcastSendsRepository.insertDialerInteractions para resolver e gravar url_audio a partir de interaction.audioId sempre que houver audioId válido.
- Manter sms_id preenchido apenas para destination === "SMS".
- Manter compatibilidade com actionName legado para Desligar/Audio conforme comportamento atual, exceto se a correção exigir alinhamento adicional.
- Atualizar testes que hoje esperam urlAudio null para SMS, adicionando cobertura para interação SMS com áudio de continuação.
- Atualizar documentação humana do módulo de broadcasts se ela sugerir que SMS não possui url_audio.
