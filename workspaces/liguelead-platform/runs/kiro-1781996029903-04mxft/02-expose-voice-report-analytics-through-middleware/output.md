# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: expose-voice-report-analytics-through-middleware
- Repositories: middleware
- Result: Added `engagement` and `statusDistribution` fields to `broadcastVoiceReportSchema` in the existing `GET /broadcasts/schedules/:id/report` proxy route. Updated Zod schemas with strict constraints, test fixtures, and OpenAPI artifacts.
- Validation: `npm run build` ✓ | `npm test` ✓ (42/42 pass) | `npm run docs:openapi` ✓
- Docs Updated: docs/contracts-and-routes/README.md, docs/public-api/openapi.json
- Gaps: none
- Needs Rework: no
- Notes: Also fixed pre-existing test fixture for `getBroadcastScheduleOutputSchema` that was missing `paused`/`pausedAt`/`canPause` fields added by a prior uncommitted user change.
