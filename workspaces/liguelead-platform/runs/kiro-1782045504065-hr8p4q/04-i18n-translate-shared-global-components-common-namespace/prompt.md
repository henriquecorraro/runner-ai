You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-shared-global-components-common-namespace
Title: i18n: Translate shared global components (common namespace)

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

### i18n-translate-shared-global-components-common-namespace
Task id: i18n-translate-shared-global-components-common-namespace
Task title: i18n: Translate shared global components (common namespace)
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
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
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/04-i18n-translate-shared-global-components-common-namespace/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-shared-global-components-common-namespace
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
