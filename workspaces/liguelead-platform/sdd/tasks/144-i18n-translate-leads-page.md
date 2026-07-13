---
id: i18n-translate-leads-page
title: i18n: Translate Leads page
scope: i18n
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-translate-shared-global-components-common-namespace
  - i18n-create-locale-aware-formatters-helper
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710485137
github_issue_number: 89
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/89
github_issue_node_id: I_kwDORqaAXc8AAAABGMRMkQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/89
github_project_item_id: 202913892
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYOGQ
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913892"
github_project_status: Done
---

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
