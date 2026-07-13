# SPEC: RCS Agents Registration Form — Legacy (areadocliente)

## Objetivo

Implementar no projeto legado (areadocliente / PHP) o formulário de cadastro multi-step de Agentes RCS, replicando o fluxo que está sendo desenvolvido no platform-front (React + TypeScript). O formulário permite que clientes preencham dados necessários para registrar um agente RCS junto ao Google/operadoras.

---

## Contexto Técnico

### Projeto novo (platform-front) — referência
- Framework: React + TypeScript + styled-components
- Componentes: `@liguelead/design-system` (TextField, FileInput, Button, etc.)
- State: React Query + useState (form local)
- Stepper com 7 passos
- Auto-save em cada navegação de step
- Upload direto via POST multipart

### Projeto legado (areadocliente)
- PHP (CodeIgniter 3 ou similar)
- jQuery / Bootstrap
- MySQL direto (areadocliente database)
- Autenticação via sessions (clients_id)

---

## Database Schema

A tabela `rcs_agents` será criada na database `areadocliente` com a seguinte estrutura:

```sql
CREATE TABLE IF NOT EXISTS rcs_agents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT NOT NULL,
  protocol_number VARCHAR(20) NOT NULL,
  status ENUM('rascunho','enviado','em_analise','aprovado','reprovado','editado') NOT NULL DEFAULT 'rascunho',
  rejection_reason TEXT NULL,
  internal_notes TEXT NULL,
  status_updated_by INT NULL,
  -- Step 1: Empresa
  contact_name VARCHAR(255) NULL,
  contact_email VARCHAR(255) NULL,
  company_name VARCHAR(255) NULL,
  legal_name VARCHAR(255) NULL,
  company_website VARCHAR(500) NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'BR',
  -- Step 2: Identidade
  sender_name VARCHAR(255) NULL,
  sender_description VARCHAR(100) NULL,
  brand_color CHAR(7) NULL,
  logo_url VARCHAR(500) NULL,
  banner_url VARCHAR(500) NULL,
  -- Step 3: Contato
  phone VARCHAR(30) NULL,
  phone_label VARCHAR(100) NULL,
  public_email VARCHAR(255) NULL,
  public_email_label VARCHAR(100) NULL,
  public_website VARCHAR(500) NULL,
  public_website_label VARCHAR(100) NULL,
  privacy_policy_url VARCHAR(500) NULL,
  terms_url VARCHAR(500) NULL,
  -- Step 4: Serviço
  send_type ENUM('promotional','otp','transactional','multi') NULL,
  use_case TEXT NULL,
  -- Step 5: Experiência
  message_triggers TEXT NULL,
  user_interactions TEXT NULL,
  -- Step 6: Consentimento
  optin_methods JSON NULL,
  optin_description TEXT NULL,
  optin_evidence_url VARCHAR(500) NULL,
  optin_url VARCHAR(500) NULL,
  optout_message TEXT NULL,
  -- Step 7: Testes
  test_devices JSON NULL,
  -- Timestamps
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uniq_rcs_agents_protocol (protocol_number),
  INDEX idx_rcs_agents_client_id (client_id),
  INDEX idx_rcs_agents_status (status)
);
```

### Notas do schema
- `test_devices`: JSON array de strings (max 5 telefones)
- `optin_methods`: JSON array de strings. Valores válidos: `sms`, `website`, `app`, `paper`, `verbal`, `other`
- `protocol_number`: formato `RCS-{YYYYMMDD}-{5 dígitos zero-padded}`
- `internal_notes` e `status_updated_by` são para backoffice (não expostos ao cliente)
- Todos os campos de step são nullable (começam como rascunho parcial)
- `send_type` é imutável após primeira submissão (constraint de aplicação, não DB)
- SEM foreign key para `clients` (padrão legacy)

---

## Formulário Multi-Step (7 passos)

### Step 1 — Empresa
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| contact_name | text | ✅ | Nome do responsável |
| contact_email | email | ✅ | Email do responsável |
| company_name | text | ✅ | Nome fantasia |
| legal_name | text | ✅ | Razão social |
| company_website | url | ✅ | Site da empresa |
| country | hidden | — | Fixo "BR" |

**Ação extra**: botão "Preencher com dados do cadastro" → puxa dados de `clients` (company_name, trading_name, website, whatsapp_contact, name, responsible).

### Step 2 — Identidade Visual
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| sender_name | text | ✅ | Nome exibido no RCS |
| sender_description | textarea (max 100 chars) | ✅ | Descrição curta |
| brand_color | color picker | ✅ | Hex (#RRGGBB) |
| logo | file upload | ✅ | PNG/JPG, max 50KB, 224×224px |
| banner | file upload | ✅ | PNG/JPG, max 200KB, 1440×448px |

### Step 3 — Informações de Contato
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| phone | tel | ✅ | Telefone público |
| phone_label | text | ✅ | Label do telefone |
| public_email | email | ❌ | Email público |
| public_email_label | text | ❌ | Label do email |
| public_website | url | ❌ | Website público |
| public_website_label | text | ❌ | Label do website |
| privacy_policy_url | url | ✅ | URL política de privacidade |
| terms_url | url | ✅ | URL termos de uso |

### Step 4 — Tipo de Serviço
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| send_type | radio group | ✅ | promotional / otp / transactional / multi |
| use_case | textarea | ✅ | Descrição do caso de uso |

**Tipos de envio**:
- `promotional` — Mensagens promocionais e marketing
- `otp` — Senhas e verificações de segurança
- `transactional` — Notificações transacionais
- `multi` — Múltiplos tipos combinados

**Regra**: se agente já foi submetido antes (status `reprovado`), `send_type` fica readonly/disabled.

### Step 5 — Experiência do Usuário
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| message_triggers | textarea | ✅ | O que dispara mensagens |
| user_interactions | textarea | ❌ | Como usuário interage |

### Step 6 — Consentimento (Opt-in)
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| optin_methods | checkbox group | ✅ | Métodos: sms, website, app, paper, verbal, other |
| optin_description | textarea | ✅ | Como o opt-in é coletado |
| optin_evidence | file upload | ✅ | PNG/JPG/PDF, max 10MB |
| optin_url | url | ❌ | URL da página de opt-in |
| optout_message | textarea | ✅ | Mensagem de opt-out |

### Step 7 — Dispositivos de Teste
| Campo | Tipo | Required para submit | Observação |
|-------|------|---------------------|------------|
| test_devices | array de telefones (max 5) | ❌ | Botão "+" para adicionar, "−" para remover |

---

## Comportamento do Formulário

### Fluxo de criação
1. Usuário acessa `/rcs/agentes/novo`
2. Ao clicar "Salvar rascunho" ou "Próximo" pela primeira vez → POST cria registro com status `rascunho`, gera `protocol_number`
3. Navegações subsequentes → PATCH atualiza campos
4. URL muda para `/rcs/agentes/{id}` após criação

### Fluxo de edição/continuação
1. Usuário acessa `/rcs/agentes/{id}`
2. Dados carregados, formulário preenchido
3. Se `status IN (rascunho, reprovado)` → editável
4. Se `status NOT IN (rascunho, reprovado)` → readonly

### Auto-save
- Ao clicar "Próximo" ou "Anterior": salva campos atuais via PATCH antes de navegar
- Campos obrigatórios para SALVAR RASCUNHO (Step 1): `contact_name`, `contact_email`, `company_name`, `legal_name`

### Submit (envio do cadastro)
- Disponível apenas no último step (7)
- Valida TODOS os campos required preenchidos
- Se faltar campo → volta ao step com erro, destaca campos
- Transição: `rascunho → enviado`, `reprovado → editado`
- Exibe tela de sucesso com número de protocolo

### Upload de arquivos
- Upload imediato ao selecionar arquivo
- Mostra progresso (barra ou spinner)
- Exibe thumbnail para imagens
- Exibe nome do arquivo para PDFs
- Armazena no S3, retorna URL que é gravada no campo correspondente

### Validações de arquivo
| Tipo | Formatos | Tamanho max | Dimensões |
|------|----------|-------------|-----------|
| Logo | PNG, JPG | 50 KB | 224×224 px |
| Banner | PNG, JPG | 200 KB | 1440×448 px |
| Evidência opt-in | PNG, JPG, PDF | 10 MB | — |

---

## Backend (PHP direto no banco)

O legado **NÃO** consome middleware nem platform-api. Ele fala **diretamente** com o banco `areadocliente` via PHP (CodeIgniter models/controllers).

### Controllers necessários

| Controller | Método | Rota (CI) | Descrição |
|------------|--------|-----------|-----------|
| Rcs_agents | index | /rcs/agentes | Listagem de agentes |
| Rcs_agents | create | /rcs/agentes/novo | Página de criação |
| Rcs_agents | edit($id) | /rcs/agentes/{id} | Página de edição/visualização |
| Rcs_agents | save | /rcs/agentes/salvar (POST/AJAX) | Cria ou atualiza rascunho |
| Rcs_agents | submit($id) | /rcs/agentes/{id}/submeter (POST/AJAX) | Submete para análise |
| Rcs_agents | upload($id) | /rcs/agentes/{id}/upload (POST/AJAX) | Upload de arquivo |

### Model: Rcs_agents_model

Operações diretas no MySQL (tabela `rcs_agents`):

```php
// Criar rascunho
function create($client_id, $data) → INSERT + gerar protocol_number

// Listar por cliente
function list_by_client($client_id) → SELECT WHERE client_id = ? ORDER BY created_at DESC

// Buscar por ID (validar ownership)
function get_by_id($id, $client_id) → SELECT WHERE id = ? AND client_id = ?

// Atualizar campos (só se status IN rascunho, reprovado)
function update($id, $client_id, $data) → UPDATE WHERE id = ? AND client_id = ? AND status IN (...)

// Submeter (validar campos, transitar status)
function submit($id, $client_id) → valida required fields, UPDATE status

// Atualizar URL de arquivo
function update_file_url($id, $client_id, $field, $url) → UPDATE campo específico
```

### Regras de negócio no PHP

1. **Ownership**: toda query filtra por `client_id` da sessão
2. **Status editável**: PATCH/update só funciona se `status IN ('rascunho', 'reprovado')`
3. **send_type imutável**: se o agente já foi submetido antes (status era != rascunho em algum momento), não permite alterar `send_type`. Na prática: se `status = 'reprovado'`, o send_type veio de um submit anterior → bloquear
4. **Submit validation**: verificar que TODOS os campos required estão preenchidos antes de transitar status
5. **Protocol number**: gerar no momento do INSERT

### Upload de arquivos

Upload via AJAX para o controller PHP → valida tipo/tamanho/dimensões → envia para S3 (usar lib AWS SDK já presente no projeto) → retorna URL → grava no campo correspondente.

### Respostas de erro (JSON para AJAX)
| Condição | Resposta |
|----------|----------|
| Agente não encontrado ou não pertence ao cliente | 404 + `{error: "not_found"}` |
| Status não editável | 409 + `{error: "not_editable"}` |
| Transição de status inválida | 409 + `{error: "invalid_transition"}` |
| Campos obrigatórios faltando | 422 + `{error: "validation", fields: [...]}` |
| Validação de arquivo falhou | 422 + `{error: "file_validation", message: "..."}` |
| Não autenticado | Redirect para login |

---

## Página de Listagem

### Colunas da tabela
| Coluna | Fonte |
|--------|-------|
| Nome do agente | `sender_name` (ou "Rascunho" se null) |
| Status | Badge colorido |
| Data de criação | `created_at` formatada |
| Ação | Botão contextual |

### Status → Cor do badge
| Status | Cor | Label |
|--------|-----|-------|
| rascunho | cinza | Rascunho |
| enviado | azul | Enviado |
| em_analise | laranja | Em Análise |
| aprovado | verde | Aprovado |
| reprovado | vermelho | Reprovado |
| editado | roxo | Editado |

### Ações por status
| Status | Ação | Comportamento |
|--------|------|---------------|
| rascunho | "Continuar" | Navega para form editável |
| reprovado | "Corrigir" | Navega para form editável + mostra motivo da rejeição |
| enviado / em_analise / editado | "Visualizar" | Navega para form readonly |
| aprovado | "Visualizar" | Navega para form readonly |

---

## Geração do Número de Protocolo

```
RCS-{YYYYMMDD}-{NNNNN}
```

- `YYYYMMDD` = data de criação
- `NNNNN` = sequencial do dia, zero-padded (5 dígitos)
- Lógica: `SELECT COUNT(*) FROM rcs_agents WHERE DATE(created_at) = CURDATE()` + 1

---

## Sidebar / Menu

Adicionar item "RCS" com sub-item "Agentes" no menu lateral, apontando para `/rcs/agentes`.

---

## Internacionalização

Labels e mensagens devem ser externalizáveis. No projeto legado, usar arrays PHP de tradução ou similar. Idiomas: pt-BR (principal), en, es-ES.

---

## Escopo do legado vs. novo

O legado acessa o **banco `areadocliente` diretamente** via PHP (models/controllers). NÃO passa pelo middleware nem pela platform-api.

A tabela `rcs_agents` é **compartilhada** — tanto o legado (PHP) quanto o platform-api (Node.js) leem e escrevem na mesma tabela. Isso permite que:
- Cliente cadastre no legado → backoffice gerencie (aprovar/reprovar) pelo painel admin
- Quando o platform-front estiver pronto, o mesmo dado já está lá

### Diferença de implementação:
- **Novo (platform-front)** → React SPA → middleware → platform-api → DB
- **Legado (areadocliente)** → PHP controller → DB diretamente

---

## Dependências para implementação

1. ✅ Tabela `rcs_agents` criada no banco `areadocliente` (migration SQL)
2. 🔨 Controller + Model PHP para CRUD
3. 🔨 Views PHP com wizard multi-step
4. 🔨 JavaScript para navegação, AJAX saves, upload

---

## Resumo da Implementação no Legado

1. **Migration SQL**: executar `CREATE TABLE rcs_agents` direto no banco areadocliente
2. **Model PHP**: `Rcs_agents_model` — CRUD direto no MySQL com validação de ownership
3. **Controller PHP**: `Rcs_agents` — rotas para listagem, criação, edição, save (AJAX), submit, upload
4. **Views PHP**: wizard multi-step com HTML/Bootstrap/jQuery
5. **JavaScript**: gerenciar navegação entre steps, salvar via AJAX para controller PHP
6. **Upload**: componente de upload com preview → controller → S3 → URL gravada no banco
7. **Listagem**: tabela com badges de status e ações contextuais
8. **Preenchimento automático**: puxar dados do objeto `client` já disponível na sessão PHP
9. **Color picker**: lib JS simples (Spectrum, Pickr, ou input type=color nativo)
10. **Stepper visual**: indicar passos com ícones e estados (completo, ativo, pendente, erro)
