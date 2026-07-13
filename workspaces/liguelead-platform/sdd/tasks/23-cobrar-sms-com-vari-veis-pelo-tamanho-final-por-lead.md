---
id: cobrar-sms-com-vari-veis-pelo-tamanho-final-por-lead
title: "Cobrar SMS com variáveis pelo tamanho final por lead"
scope: broadcasts
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test -- --runInBand broadcast-sms-mailing-materializer
docs_targets:
  - docs/human/broadcasts.md
---

Ajustar a cobrança de broadcasts SMS e SMS Flash com variáveis para considerar o custo após materializar as variáveis por destinatário.

Contexto observado no platform-api:
- `BroadcastSmsMailingMaterializerService` já materializa `{name}` e `{email}` por recipient antes do envio e grava em `sms_numbers_{actionId}.message`.
- Também deve passar a materializar `{phone}`/`[phone]` com o telefone normalizado do destinatário.
- A tabela temporária já possui coluna `credits`.
- `BroadcastSmsDispatchService` já carrega `credits` por linha e cobra o lote somando `rows.reduce((total, row) => total + row.credits, 0)`.
- Hoje `insertSmsMailingRows` grava `credits: sms.credits` fixo para todos os destinatários, então templates com variável podem ficar subcobrados quando a mensagem final passa de 160 caracteres.

Implementação sugerida:
1. No materializador, depois de definir a mensagem final de cada destinatário, calcular `calculateSmsCredits(processSmsContent(finalMessage))` ou reutilizar um helper que normalize e calcule exatamente como o envio faz.
2. Gravar `credits_{index}` individual no INSERT em vez de um único `:credits` compartilhado.
3. Para SMS sem variável, manter caminho barato usando crédito do template, idealmente calculado/normalizado uma vez por lote ou por template, sem recalcular por lead.
4. Cobrir SMS normal e SMS Flash, pois ambos passam pelo mesmo materializador e dispatcher (`types_id` 3 e 4).
5. Adicionar testes focados no materializador/helper para validar: mensagem sem variável mantém crédito estático; mensagem com variável curta fica 1 crédito; mensagem com variável longa passa para 2+ créditos; placeholders `{name}`, `[name]`, `{email}`, `[email]`, `{phone}`, `[phone]`.

Observações de performance:
- Preferir calcular no momento da materialização, porque a mensagem final já está em memória e persistida por lead.
- Evitar recalcular no dispatcher, que é o caminho crítico do envio e da cobrança em lote.
- O custo extra fica O(n) simples sobre os recipients, junto do loop de insert já existente, sem consulta adicional por lead.
