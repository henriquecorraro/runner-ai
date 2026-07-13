# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: persist-voice-report-engagement-and-status-analytics
- Repositories: platform-api
- Result: Implemented voice report engagement analytics (audio_duration_seconds, fully_listened_count) and status distribution buckets (answered, not_answered, busy_congestion, invalid_no_route) with full persistence in BroadcastVoiceCloseService and backfill script.
- Validation: npm run typecheck ✓ | npm test -- broadcast-voice-close-worker broadcast-sends.repository voice-report-kpi-backfill broadcast-scheduling.use-cases ✓ (46 passed) | npm run build ✓
- Docs Updated: docs/human/modules/broadcasts.md
- Gaps: none
- Needs Rework: no
- Notes: Migration 023 adds audio_duration_seconds and fully_listened_count columns to action_voice_reports and creates action_voice_report_status_buckets table. The GET /broadcasts/schedules/:id/report response now includes engagement and statusDistribution fields. A pre-existing test was fixed (requestedBy in pause use case).
