---
id: i18n-translate-shared-global-components-common-namespace
title: "i18n: Translate shared global components (common namespace)"
scope: i18n
status: open
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
depends_on:
  - i18n-install-and-configure-i18next-with-language-detector
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4710480180
github_issue_number: 87
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/87
github_issue_node_id: I_kwDORqaAXc8AAAABGMQ5NA
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/87
github_project_item_id: 202913594
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwYNzo
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=202913594"
github_project_status: Todo
---

## Scope

Translate all shared/global UI components using `common` namespace.

## Files to modify

- `src/components/Sidebar/Sidebar.constants.tsx`
- `src/components/Sidebar/Sidebar.tsx`
- `src/components/Loading/Loading.tsx`
- `src/components/QueryError/QueryError.tsx`
- `src/components/DeleteConfirmationDialog/DeleteConfirmationDialog.tsx`
- `src/components/NotificationsDropdown/NotificationsDropdown.tsx`
- `src/components/UserUnitsDropdown/UserUnitsDropdown.tsx`
- `src/utils/apiError.ts`

## Translations

### `src/i18n/locales/pt-BR/common.json`

```json
{
  "sidebar": {
    "campaigns": "Campanhas",
    "leadManagement": "Gestão de Leads",
    "leads": "Leads",
    "tags": "Tags",
    "uploads": "Uploads",
    "sends": "Envios",
    "broadcasts": "Broadcasts",
    "schedules": "Agendamentos",
    "audios": "Áudios",
    "sms": "SMS",
    "shortLinks": "Links encurtados",
    "credits": "Créditos",
    "yourCredits": "Seus créditos",
    "buyCredits": "Comprar créditos",
    "history": "Histórico",
    "integrations": "Integrações",
    "collapseMenu": "Recolher menu",
    "expandMenu": "Expandir menu"
  },
  "loading": {
    "auth": {
      "title": "Preparando acesso",
      "description": "Carregando a área de autenticação."
    },
    "page": {
      "title": "Carregando conteúdo",
      "description": "Aguarde enquanto a próxima página é preparada."
    }
  },
  "queryError": {
    "retryButton": "Tentar novamente"
  },
  "deleteConfirmation": {
    "defaultTitle": "Confirmar exclusão",
    "irreversible": "Esta ação não pode ser desfeita.",
    "confirmLabel": "Excluir",
    "deleting": "Excluindo..."
  },
  "notifications": {
    "title": "Notificações",
    "markRead": "Marcar lidas",
    "clear": "Limpar",
    "empty": "Nenhuma notificação por enquanto.",
    "loading": "Carregando notificações...",
    "error": "Não foi possível carregar as notificações."
  },
  "userDropdown": {
    "triggerLabel": "Abrir informações do cliente",
    "client": "Cliente",
    "loading": "Carregando...",
    "noUnits": "Nenhuma unit disponível.",
    "error": "Não foi possível carregar os dados do cliente.",
    "logout": "Sair"
  },
  "errors": {
    "networkError": "Sem conexão com o servidor. Verifique sua internet e tente novamente."
  },
  "actions": {
    "cancel": "Cancelar",
    "save": "Salvar",
    "saving": "Salvando...",
    "edit": "Editar",
    "delete": "Excluir",
    "retry": "Tentar novamente"
  }
}
```

### `src/i18n/locales/es-ES/common.json`

```json
{
  "sidebar": {
    "campaigns": "Campañas",
    "leadManagement": "Gestión de Leads",
    "leads": "Leads",
    "tags": "Tags",
    "uploads": "Uploads",
    "sends": "Envíos",
    "broadcasts": "Broadcasts",
    "schedules": "Programaciones",
    "audios": "Audios",
    "sms": "SMS",
    "shortLinks": "Enlaces cortos",
    "credits": "Créditos",
    "yourCredits": "Tus créditos",
    "buyCredits": "Comprar créditos",
    "history": "Historial",
    "integrations": "Integraciones",
    "collapseMenu": "Contraer menú",
    "expandMenu": "Expandir menú"
  },
  "loading": {
    "auth": {
      "title": "Preparando acceso",
      "description": "Cargando el área de autenticación."
    },
    "page": {
      "title": "Cargando contenido",
      "description": "Espere mientras se prepara la próxima página."
    }
  },
  "queryError": {
    "retryButton": "Intentar de nuevo"
  },
  "deleteConfirmation": {
    "defaultTitle": "Confirmar eliminación",
    "irreversible": "Esta acción no se puede deshacer.",
    "confirmLabel": "Eliminar",
    "deleting": "Eliminando..."
  },
  "notifications": {
    "title": "Notificaciones",
    "markRead": "Marcar leídas",
    "clear": "Limpiar",
    "empty": "Ninguna notificación por ahora.",
    "loading": "Cargando notificaciones...",
    "error": "No fue posible cargar las notificaciones."
  },
  "userDropdown": {
    "triggerLabel": "Abrir información del cliente",
    "client": "Cliente",
    "loading": "Cargando...",
    "noUnits": "Ninguna unidad disponible.",
    "error": "No fue posible cargar los datos del cliente.",
    "logout": "Salir"
  },
  "errors": {
    "networkError": "Sin conexión con el servidor. Verifique su internet e intente nuevamente."
  },
  "actions": {
    "cancel": "Cancelar",
    "save": "Guardar",
    "saving": "Guardando...",
    "edit": "Editar",
    "delete": "Eliminar",
    "retry": "Intentar de nuevo"
  }
}
```

### `src/i18n/locales/en/common.json`

```json
{
  "sidebar": {
    "campaigns": "Campaigns",
    "leadManagement": "Lead Management",
    "leads": "Leads",
    "tags": "Tags",
    "uploads": "Uploads",
    "sends": "Sends",
    "broadcasts": "Broadcasts",
    "schedules": "Schedules",
    "audios": "Audios",
    "sms": "SMS",
    "shortLinks": "Short Links",
    "credits": "Credits",
    "yourCredits": "Your credits",
    "buyCredits": "Buy credits",
    "history": "History",
    "integrations": "Integrations",
    "collapseMenu": "Collapse menu",
    "expandMenu": "Expand menu"
  },
  "loading": {
    "auth": {
      "title": "Preparing access",
      "description": "Loading the authentication area."
    },
    "page": {
      "title": "Loading content",
      "description": "Please wait while the next page is prepared."
    }
  },
  "queryError": {
    "retryButton": "Try again"
  },
  "deleteConfirmation": {
    "defaultTitle": "Confirm deletion",
    "irreversible": "This action cannot be undone.",
    "confirmLabel": "Delete",
    "deleting": "Deleting..."
  },
  "notifications": {
    "title": "Notifications",
    "markRead": "Mark as read",
    "clear": "Clear",
    "empty": "No notifications yet.",
    "loading": "Loading notifications...",
    "error": "Could not load notifications."
  },
  "userDropdown": {
    "triggerLabel": "Open client info",
    "client": "Client",
    "loading": "Loading...",
    "noUnits": "No units available.",
    "error": "Could not load client data.",
    "logout": "Logout"
  },
  "errors": {
    "networkError": "No connection to server. Check your internet and try again."
  },
  "actions": {
    "cancel": "Cancel",
    "save": "Save",
    "saving": "Saving...",
    "edit": "Edit",
    "delete": "Delete",
    "retry": "Try again"
  }
}
```

## Substitutions

- `Sidebar.constants.tsx`: replace all hardcoded `label` strings with `t('sidebar.xxx')` keys. Import `useTranslation` in `Sidebar.tsx` and pass translated labels, or make `NAV_SECTIONS` a hook that returns translated entries.
- `Loading.tsx`: replace `LOADING_COPY` dict with `t()` calls.
- `QueryError.tsx`: replace "Tentar novamente" with `t('queryError.retryButton')`.
- `DeleteConfirmationDialog.tsx`: replace hardcoded strings with `t()`.
- `NotificationsDropdown.tsx`: replace all UI strings.
- `UserUnitsDropdown.tsx`: replace all UI strings.
- `apiError.ts`: replace the network error string with a callback or i18n import.

## Constraints

- Do NOT change component behavior or visual styling.
- Sidebar must remain reactive to language changes (re-render on switch).
- `apiError.ts` can import `i18n` directly since it's not a React component.

## Validation

```bash
npm run lint
npm run build
```
