# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-notifications-dropdown
- Repositories: platform-front, design-system
- Result: Verdict — **KEEP_IN_APP**. The NotificationsDropdown component is deeply coupled to application-specific business logic: it directly uses 6 app-specific React Query hooks (`useClientNotificationsQuery`, `useClearClientNotificationsMutation`, `useDeleteClientNotificationMutation`, `useMarkAllClientNotificationsReadMutation`, `useMarkClientNotificationReadMutation`, `useUnreadClientNotificationsCountQuery`) from `@/hooks/queries/notifications.queries`, imports app-specific types from `@/service/notifications/notifications-service.types`, and uses `useNavigate` for app-route navigation on notification click. The component owns data-fetching, mutation orchestration, and route-level navigation — all domain-specific concerns. No equivalent exists in the design-system.
- Validation: Verdict is clearly stated as KEEP_IN_APP; justification references concrete evidence (6 app-specific query hooks, app service types, app router usage).
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: The styled primitives (DropdownTrigger, NotificationBadge, etc.) use design-system foundations and Radix primitives — those building blocks are already in DS scope. Only the composed, data-connected NotificationsDropdown itself stays in the app.
