# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-header
- Repositories: platform-front, design-system
- Result: **KEEP_IN_APP** — Header is a domain-specific composition that embeds `NotificationsDropdown` (uses app queries via `@/hooks/queries/notifications.queries`, `react-router-dom`) and `UserUnitsDropdown` (app-specific context). It is not a pure presentational shell; it orchestrates app-specific features. No equivalent Header exists in design-system.
- Validation: Code inspection of Header.tsx confirms app-specific imports (`@/components/NotificationsDropdown`, `@/components/UserUnitsDropdown`). NotificationsDropdown confirmed to use `useNavigate` and app query hooks.
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: The styled wrapper (`HeaderWrapper`) could theoretically be extracted as a generic `AppBar` layout primitive for the DS, but the component as a whole must stay in platform-front due to its domain children.
