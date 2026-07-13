---
id: sms-dispatch-totals-csv
title: SMS dispatch: populate total_send_sms and generate CSV report
scope: sms-report
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4720806545
github_issue_number: 65
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/65
github_issue_node_id: I_kwDORpoJ688AAAABGWHKkQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/65
github_project_item_id: 203507157
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwhRdU
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=203507157"
github_project_status: Done
---

## Objective

Modify `BroadcastSmsDispatchService.processClaimedAction` to:
1. Stream a CSV file during dispatch (mirroring sms_result inserts)
2. Accumulate `totalSent` counter (only successfully sent rows)
3. Upload CSV to S3 on finish, update `actions.action_report_url` and `actions.total_send_sms`

## File: `src/modules/broadcasts/services/broadcast-sms-dispatch.service.ts`

### Dispatch flow (pseudocode)

```
openCsvStream(header: "phone,status,date,time")
totalSent = 0

LOOP batches:
  rows = loadBatchRows(actionId, batch)
  charged = billing.chargeBatch(credits)

  IF !charged:
    remainingRows = loadRemainingRows(actionId)  // new repo method
    writeCsvRows(stream, remainingRows, "Sem Saldo")
    repo.markRemainingAsNoBalance(actionId)
    break

  invoker.invoke(lambda payload)
  repo.recordSentResults(actionId, rows)
  writeCsvRows(stream, rows, "Enviada")
  totalSent += rows.length
  repo.markBatchProcessed(actionId, batch)

closeCsvStream()
reportUrl = uploadToS3("reports/report_{actionId}.csv")
finishAction(actionId, totalSent, reportUrl)
```

### New repository method: `loadRemainingRows`

```typescript
async loadRemainingRows(actionId: number): Promise<SmsMailingRow[]>
```

```sql
SELECT id, destination, message, credits
FROM `sms_numbers_{actionId}`
WHERE processed = 0
ORDER BY id ASC
```

This is needed so the service can write "Sem Saldo" rows to the CSV before calling `markRemainingAsNoBalance`. Add to `BroadcastSmsDispatchRepository` interface and `SequelizeBroadcastSmsDispatchRepository`.

### Update `finishAction` signature

```typescript
async finishAction(actionId: number, totalSent: number, reportUrl: string | null): Promise<void>
```

```sql
UPDATE actions
SET status_id = :finishedStatus,
    processing_queue = '0',
    total_send_sms = :totalSent,
    action_report_url = :reportUrl,
    updated_at = NOW()
WHERE id = :actionId
```

### CSV details

- Tmp dir: `join(tmpdir(), "broadcast-sms-reports")`
- Filename: `sms-report-{actionId}-{Date.now()}.csv`
- Header: `phone,status,date,time`
- Each row: `row.destination, status, currentDate, currentTime` (use `getBrazilDateTime()`)
- Reuse `escapeCsvValue` / `toCsvLine` / `writeLine` pattern from `broadcast-voice-close.service.ts`
- After stream close: upload via `uploadFileToS3` from `@/infra/aws/s3`
- Clean up tmp file in `finally` block with `rm(filePath, { force: true })`

### S3 upload

```typescript
const key = `reports/report_${actionId}.csv`;
await uploadFileToS3({ bucket: env.aws.bucket, key, filePath, contentType: "text/csv; charset=utf-8" });
const reportUrl = buildS3ObjectUrl(env.aws.bucket, key);
```

### Constraints

- Do NOT create new database tables
- Do NOT change `insertSmsResults` or `markRemainingAsNoBalance` internal behavior
- `totalSent` counts ONLY rows that went to Lambda (status "Enviada"), NOT "Sem Saldo" rows
- If `env.aws.bucket` is falsy (dev mode): skip CSV stream entirely, pass `reportUrl = null` to `finishAction`
- If S3 upload fails: log error, pass `reportUrl = null`, do NOT fail the dispatch
- CSV must include BOTH "Enviada" and "Sem Saldo" rows (complete picture for the client)
