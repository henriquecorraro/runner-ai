# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: leads-page-add-delete-soft-delete-iconbutton-per-lead-row
- Repositories: platform-front
- Result: Added trash IconButton to each lead row with delete confirmation dialog. On confirm, calls DELETE /leads/:id and invalidates the leads query cache.
- Validation: npm run lint ✓ ; npm run build ✓
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: platform-api unchanged (soft-delete route already exists). Three files modified: src/service/leads/leads-service.ts (added deleteLead export), src/hooks/tables/useLeadColumns.tsx (added onDelete option and actions column), src/pages/Leads/components/LeadsContent.tsx (added delete mutation, confirmation dialog, and handleDeleteLead callback).
