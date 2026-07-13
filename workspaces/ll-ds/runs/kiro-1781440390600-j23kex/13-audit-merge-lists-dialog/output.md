# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-merge-lists-dialog
- Repositories: platform-front, design-system
- Result: Verdict is **KEEP_IN_APP**. MergeListsDialog is a domain-specific feature component that directly calls app services (`mergeLists`, `getMergeProgress`), uses app-specific hooks (`useAppAlert`, `useListsQuery`), manages merge progress polling via react-query, and is entirely coupled to the leads/tags domain. The DS already provides the `Dialog` shell it consumes. No migration needed.
- Validation: Code inspection confirms app-specific imports (`@/service/leads_lists/leads-lists-service`, `@/hooks/queries/leads-lists.queries`, `@/hooks/useAppAlert`); DS already exports `Dialog` as alias for `Modal`.
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: Component uses DS `Dialog` and `TextField` correctly. The styled sub-components (ProgressBar, etc.) are layout-specific to this feature and not candidates for DS extraction.
