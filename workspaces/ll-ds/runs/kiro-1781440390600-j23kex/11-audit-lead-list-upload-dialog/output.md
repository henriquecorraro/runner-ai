# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-lead-list-upload-dialog
- Repositories: platform-front, design-system
- Result: Verdict KEEP_IN_APP — LeadListUploadDialog is a domain-specific component containing heavy business logic (lead list creation via API, CSV file upload mutation, upload status polling, query cache invalidation) and depends on 9+ app-specific imports (services, hooks, stores, utilities). The DS already exports the generic primitives it uses (Dialog, FileInput, Button, Checkbox, TextField). No migration needed.
- Validation: Code inspection of all 3 files in LeadListUploadDialog/; confirmed DS exports Modal/Dialog and FileInput; verdict is KEEP_IN_APP with concrete evidence from imports and business logic analysis.
- Docs Updated: none
- Gaps: none
- Needs Rework: false
- Notes: App-specific dependencies flagged: useAppAlert, useListsQuery, useLeadListUploadStatusQuery, createLeadList, uploadLeadList, DropdownSelect, sanitizeTagName, getApiErrorMessage, leadsCountQueryKey, listsQueryKey, uploadsQueryKey. Component orchestrates full lead-list upload workflow including list creation, file upload, and real-time status polling — none of which is generic/reusable UI.
