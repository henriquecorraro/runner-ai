---
id: rcs-agents-migration
title: RCS Agents: create database migration
scope: rcs-agents
status: open
repositories:
  - platform-api
validation:
  - SQL file exists at migrations/028-create-rcs-agents.sql
  - SQL is valid MySQL syntax
  - npm run typecheck passes
  - npm run build passes
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4833309135
github_issue_number: 117
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/117
github_issue_node_id: I_kwDORpoJ688AAAABIBZxzw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/117
github_project_item_id: 210018292
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyEn_Q
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=210018292"
github_project_status: Todo
---

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
