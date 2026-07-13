You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: rcs-agents-migration
Title: RCS Agents: create database migration

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### rcs-agents-migration
Task id: rcs-agents-migration
Task title: RCS Agents: create database migration
Task status: open
Task scope: rcs-agents
Task validation: SQL file exists at migrations/028-create-rcs-agents.sql ; SQL is valid MySQL syntax ; npm run typecheck passes ; npm run build passes

```md
Create migration `migrations/028-create-rcs-agents.sql`.

## Table: `rcs_agents`

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

## Notes

- `test_devices` stores JSON array of phone strings (max 5). Do NOT create 5 separate columns.
- `optin_methods` stores JSON array of strings. Valid values: `purchase`, `signup`, `newsletter`, `loyalty`, `other`.
- `protocol_number` format: `RCS-{YYYYMMDD}-{5 digit zero-padded auto-increment per day}` — generation logic is handled in application code, not DB.
- `internal_notes` is for backoffice-only observations (not exposed to client).
- All step fields are nullable because records start as `rascunho` (draft) with partial data.
- `send_type` is immutable after first submission (application-level constraint, not DB).
- Do NOT create foreign key constraints to `clients` table (legacy pattern in this codebase).
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1783471890839-gc0dpz/01-rcs-agents-migration/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: rcs-agents-migration
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
