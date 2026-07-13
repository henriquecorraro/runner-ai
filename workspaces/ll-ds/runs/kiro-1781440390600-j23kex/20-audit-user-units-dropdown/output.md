# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-user-units-dropdown
- Repositories: platform-front, design-system
- Result: Verdict — **KEEP_IN_APP**. The component is domain-specific: it calls `useMeQuery()` (app API hook), uses `useNavigate` (app routing), invokes `clearAuthSession()` (app auth service), and renders domain data (user units/credits, plan name, logout). It is not a generic UI primitive.
- Validation: Code inspection completed; no build required (audit-only task)
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: The design-system has no equivalent dropdown. The styles layer uses DS foundation tokens and radix-ui primitives, but the component itself is tightly coupled to app-specific hooks (`useMeQuery`), services (`clearAuthSession`), and routing (`useNavigate('/auth/login')`). It cannot be extracted without removing all meaningful logic, at which point only a generic radix dropdown shell remains (already available via radix-ui directly).
