You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-leads-page
Title: i18n: Translate Leads page

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

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### i18n-translate-leads-page
Task id: i18n-translate-leads-page
Task title: i18n: Translate Leads page
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Leads page and all sub-components. Namespace: `leads`.

## Files to modify

- `src/pages/Leads/Leads.tsx`
- `src/pages/Leads/components/LeadsContent.tsx`
- `src/pages/Leads/components/LeadsSummaryCards.tsx`
- `src/hooks/tables/useLeadColumns.tsx`

## Namespace: `leads`

### `src/i18n/locales/pt-BR/leads.json`

```json
{
  "title": "Leads",
  "subtitle": "Consulte e acompanhe os leads cadastrados.",
  "uploadButton": "Upload de leads",
  "summary": {
    "total": "Total de leads",
    "withoutEmail": "Sem email",
    "blocked": "Bloqueados",
    "newLast7Days": "novos nos últimos 7 dias",
    "ofTotal": "do total",
    "loadingTitle": "Carregando métricas",
    "loadingDescription": "Aguarde enquanto os dados são preparados."
  },
  "table": {
    "columns": {
      "lead": "Lead",
      "tags": "Tags",
      "source": "Fonte",
      "createdAt": "Criado em"
    },
    "sourceManual": "Manual",
    "searchPlaceholder": "Buscar nome, telefone ou e-mail",
    "filterByTag": "Filtrar por tag",
    "filterBySource": "Filtrar por fonte",
    "filterByPeriod": "Filtrar por período",
    "allSources": "Todas as fontes",
    "allPeriods": "Todos os períodos",
    "last7Days": "Últimos 7 dias",
    "last30Days": "Últimos 30 dias",
    "last60Days": "Últimos 60 dias",
    "last90Days": "Últimos 90 dias",
    "emptyTitle": "Nenhum lead encontrado.",
    "footerText": "{{count}} leads no total",
    "ariaLabel": "Tabela de leads",
    "createTagFromFilter": "Criar tag a partir do filtro"
  },
  "error": {
    "title": "Não foi possível carregar os leads",
    "description": "Houve uma falha ao buscar os dados. Tente novamente em instantes."
  }
}
```

### `src/i18n/locales/es-ES/leads.json`

```json
{
  "title": "Leads",
  "subtitle": "Consulte y acompañe los leads registrados.",
  "uploadButton": "Upload de leads",
  "summary": {
    "total": "Total de leads",
    "withoutEmail": "Sin email",
    "blocked": "Bloqueados",
    "newLast7Days": "nuevos en los últimos 7 días",
    "ofTotal": "del total",
    "loadingTitle": "Cargando métricas",
    "loadingDescription": "Espere mientras se preparan los datos."
  },
  "table": {
    "columns": {
      "lead": "Lead",
      "tags": "Tags",
      "source": "Fuente",
      "createdAt": "Creado en"
    },
    "sourceManual": "Manual",
    "searchPlaceholder": "Buscar nombre, teléfono o e-mail",
    "filterByTag": "Filtrar por tag",
    "filterBySource": "Filtrar por fuente",
    "filterByPeriod": "Filtrar por período",
    "allSources": "Todas las fuentes",
    "allPeriods": "Todos los períodos",
    "last7Days": "Últimos 7 días",
    "last30Days": "Últimos 30 días",
    "last60Days": "Últimos 60 días",
    "last90Days": "Últimos 90 días",
    "emptyTitle": "Ningún lead encontrado.",
    "footerText": "{{count}} leads en total",
    "ariaLabel": "Tabla de leads",
    "createTagFromFilter": "Crear tag a partir del filtro"
  },
  "error": {
    "title": "No fue posible cargar los leads",
    "description": "Hubo una falla al buscar los datos. Intente nuevamente en instantes."
  }
}
```

### `src/i18n/locales/en/leads.json`

```json
{
  "title": "Leads",
  "subtitle": "View and track registered leads.",
  "uploadButton": "Upload leads",
  "summary": {
    "total": "Total leads",
    "withoutEmail": "Without email",
    "blocked": "Blocked",
    "newLast7Days": "new in the last 7 days",
    "ofTotal": "of total",
    "loadingTitle": "Loading metrics",
    "loadingDescription": "Please wait while data is being prepared."
  },
  "table": {
    "columns": {
      "lead": "Lead",
      "tags": "Tags",
      "source": "Source",
      "createdAt": "Created at"
    },
    "sourceManual": "Manual",
    "searchPlaceholder": "Search name, phone or email",
    "filterByTag": "Filter by tag",
    "filterBySource": "Filter by source",
    "filterByPeriod": "Filter by period",
    "allSources": "All sources",
    "allPeriods": "All periods",
    "last7Days": "Last 7 days",
    "last30Days": "Last 30 days",
    "last60Days": "Last 60 days",
    "last90Days": "Last 90 days",
    "emptyTitle": "No leads found.",
    "footerText": "{{count}} leads total",
    "ariaLabel": "Leads table",
    "createTagFromFilter": "Create tag from filter"
  },
  "error": {
    "title": "Could not load leads",
    "description": "There was a failure fetching data. Try again shortly."
  }
}
```

## Key substitutions

- `LeadsContent.tsx`: replace `DATE_OPTIONS` labels, `emptyTitle`, `footerText`, `searchPlaceholder`, `ariaLabel`, dropdown aria-labels, error strings.
- `LeadsSummaryCards.tsx`: replace card labels, loading text, `toLocaleString('pt-BR')` with `formatNumber()`.
- `useLeadColumns.tsx`: replace header strings and `formatSource` default. Replace `toLocaleDateString('pt-BR')` with `formatDate()`.
- `Leads.tsx`: replace title, subtitle, button text.

## Formatting

- Replace `data.total.toLocaleString('pt-BR')` with `formatNumber(data.total)` from `@/i18n/formatters`.
- Replace `new Date(...).toLocaleDateString('pt-BR')` with `formatDate(...)`.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/06-i18n-translate-leads-page/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-leads-page
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
