# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Batch: broadcast-schedule-dialer-materialization
- Repositories: `platform-api`
- Tasks: `broadcast-schedule-dialer-materialization`
- Result: Voice schedule creation now materializes `dialer.dialer_campaigns`, updates `actions.dialer_campaign_id`, recreates `dialer_mailings.dialer_numbers_<id>`, and mirrors interactive DTMF rows into `dialer.dialer_numbers_action`.
- Validation: `npm run typecheck` OK; `npm run build` OK; `npm test` OK; focused `npx vitest run tests/broadcast-sends.repository.spec.ts` OK.
- Docs Updated: `platform-api/docs/human/modules/broadcasts.md`; `platform-api/docs/human/modules/broadcast-legacy-flow.md`
- Gaps: Variable-audio voice scheduling (`variable = true`) is still rejected because per-recipient TTS queue materialization is not implemented in the new flow.
- Needs Rework: Per-recipient `url_audio_start` generation for variable voice broadcasts when that legacy runtime dependency is needed.
- Notes: Runtime recipient resolution now combines legacy `audience.lists` and lead-manager `audience.leadLists`, applies removals, and deduplicates the dialer queue by phone number.
