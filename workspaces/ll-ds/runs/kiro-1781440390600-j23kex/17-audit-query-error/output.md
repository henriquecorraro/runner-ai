# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-query-error
- Repositories: platform-front, design-system
- Result: Verdict KEEP_IN_APP — QueryError is purely presentational (no business logic, no app-specific imports), but DS already exports `Alert` with `variant="danger"` covering the same error-display pattern (title + description + action area). Migrating QueryError as a separate DS component would create duplication. Instead, platform-front should replace QueryError usages with DS `Alert` (after adding onClick action support to Alert if needed).
- Validation: Code inspection confirmed QueryError has zero app-specific dependencies (only imports DS Button and DS foundation tokens). DS Alert reviewed and confirmed as functional equivalent for error display.
- Docs Updated: none
- Gaps: DS Alert currently only supports link-based actions (`href`), not callback-based actions (`onClick`). A small enhancement to Alert would allow full replacement of QueryError.
- Needs Rework: no
- Notes: QueryError is used in 18+ pages across platform-front. A separate migration task to replace it with DS Alert (once Alert supports onClick actions) is recommended.
