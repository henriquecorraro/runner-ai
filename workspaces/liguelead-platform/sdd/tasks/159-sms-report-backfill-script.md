---
id: sms-report-backfill-script
title: Script: backfill SMS report CSV for 2026 finished broadcasts
scope: sms-report
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4721351117
github_issue_number: 67
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/67
github_issue_node_id: I_kwDORpoJ688AAAABGWoZzQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/67
github_project_item_id: 203532459
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwhqKs
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=203532459"
github_project_status: Done
---

## Objective

Create `scripts/backfill-sms-reports.ts` that generates CSV reports for all finished SMS/SMS Flash broadcasts from 2026 that lack a report file.

## Selection criteria

```sql
SELECT id, total_shipping
FROM actions
WHERE types_id IN (3, 4)
  AND status_id = 7
  AND deleted = 0
  AND date >= '2026-01-01'
  AND action_report_url IS NULL
ORDER BY id ASC
```

## Per-action processing

1. Query `sms_result` paginated by id:
```sql
SELECT phone, status, date, time
FROM sms_result
WHERE actions_id = :actionId
ORDER BY id ASC
LIMIT :pageSize
```
2. Stream CSV to tmp file with header: `phone,status,date,time`
3. Count rows with status = 'Enviada' as `totalSent`
4. Upload CSV to S3: `reports/report_{actionId}.csv`
5. Update actions:
```sql
UPDATE actions
SET total_send_sms = :totalSent,
    action_report_url = :reportUrl,
    updated_at = NOW()
WHERE id = :actionId
```

## CLI interface

```
npx tsx scripts/backfill-sms-reports.ts [--dry-run] [--batch-size=50] [--concurrency=2]
```

- `--dry-run`: select and count but do not upload or update
- `--batch-size`: actions per iteration (default 50)
- `--concurrency`: parallel action processing (default 2, max 4)

## Pattern

Follow `scripts/backfill-voice-report-kpis.ts` structure:
- Use sequelize directly (no queue table needed — simpler than voice)
- Page through sms_result with PAGE_SIZE=5000
- Reuse CSV helpers (escapeCsvValue, toCsvLine, writeLine)
- Upload with `uploadFileToS3` from `@/infra/aws/s3`
- Log progress per action
- Close sequelize connections in finally block

## Constraints

- Do NOT create a queue table — iterate directly over actions
- Skip actions where `sms_result` has 0 rows (log warning)
- If S3 upload fails for one action, log error and continue to next
- Clean up tmp files in finally blocks
