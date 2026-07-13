---
id: lead-upload-s3-storage
title: Lead list upload: store CSV in S3 instead of local /tmp
scope: lead-lists
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoYU0
github_project_item_id: 201082366
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv8Rf4
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201082366"
github_project_status: Done
---

## Problem

In EKS, the API pod saves uploaded CSV to `/tmp/lead-list-uploads/` and enqueues a job with `localFilePath`. The worker pod runs on a different node/pod and cannot access that path → `ENOENT`. Local and staging (single EC2) work because API and worker share the same filesystem.

## Solution

Upload CSV to S3 immediately after multer writes it locally. Worker downloads from S3 before processing. Persist S3 key in `leads_file_info` table for auditability. Do NOT delete the S3 object after processing.

## Implementation

### 1. Database migration

Add column `s3_key` to `leads_file_info`:

```sql
ALTER TABLE leads_file_info ADD COLUMN s3_key VARCHAR(512) NULL AFTER name;
```

### 2. Model + Entity

File: `src/modules/lead-lists/models/leads-file-info.model.ts`

Add:
```typescript
@AllowNull(true)
@Column({
  type: DataType.STRING(512),
  field: "s3_key",
})
declare s3Key: string | null;
```

File: `src/modules/lead-lists/entities/leads-file-info.entity.ts`

Add `s3Key: string | null;` to type.

File: `src/modules/lead-lists/repositories/leads-file-info.repository.ts`

- Add `s3Key` to `toEntity` mapper.
- Accept `s3Key` in `create()` input and pass it to `LeadsFileInfoModel.create`.

### 3. Queue job type

File: `src/modules/lead-lists/services/lead-list-upload-queue.service.ts`

Replace `localFilePath: string` with `s3Key: string` in `LeadListUploadJob` type.

### 4. Upload use-case (API pod side)

File: `src/modules/lead-lists/use-cases/lead-list-uploads.use-cases.ts`

In `createLeadListUploadUseCase`, after `leadsFileInfoRepository.create(...)`:

```typescript
import { uploadFileToS3 } from "@/infra/aws/s3";
import { env } from "@/infra/config/env";
import { unlink } from "fs/promises";

const s3Key = `lead-uploads/${fileInfo.id}/${input.file.originalname}`;

await uploadFileToS3({
  bucket: env.aws.audioBucket,
  key: s3Key,
  filePath: input.file.path,
  contentType: "text/csv",
});

await unlink(input.file.path).catch(() => undefined);
```

Pass `s3Key` to `leadsFileInfoRepository.create()` and to `queueService.enqueue()` (replace `localFilePath`).

### 5. Processor (Worker pod side)

File: `src/modules/lead-lists/services/lead-list-upload-processor.service.ts`

At the start of `process()`:

```typescript
import { downloadFileFromS3 } from "@/infra/aws/s3";
import { writeFile, unlink } from "fs/promises";
import { env } from "@/infra/config/env";

const fileBuffer = await downloadFileFromS3({
  bucket: env.aws.audioBucket,
  key: job.s3Key,
});
const localTmpPath = `/tmp/lead-list-uploads/${job.fileInfoId}.csv`;
await mkdir(dirname(localTmpPath), { recursive: true });
await writeFile(localTmpPath, fileBuffer);
```

- Use `localTmpPath` for `createReadStream` (existing logic).
- At the end (both success and error paths), `unlink(localTmpPath)` — already done for `job.localFilePath`, just update the reference.
- Do NOT delete the S3 object.

### 6. S3 key pattern

```
lead-uploads/{fileInfoId}/{originalFilename}
```

Bucket: same as `env.aws.audioBucket` (single bucket for audios, reports, uploads — separated by prefix).

### 7. Env vars

No new env var needed. Reuse `AWS_S3_BUCKET_AUDIOS` (already configured in all environments).

## Constraints

- Do NOT add a new S3 bucket env var; reuse existing `audioBucket`.
- Do NOT delete S3 objects after processing — keep for audit.
- Multer still writes to local `/tmp` first (memory-based multer upload is not needed for large CSVs).
- The middleware `lead-list-upload.middleware.ts` remains unchanged.
- Existing tests must pass — mock `uploadFileToS3`/`downloadFileFromS3` in test setup.

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
