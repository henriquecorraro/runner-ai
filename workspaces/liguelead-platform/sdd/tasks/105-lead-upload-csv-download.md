---
id: lead-upload-csv-download
title: Lead list upload: download original CSV via backend proxy
scope: lead-lists
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - npm run typecheck
  - npm test
  - npm run build
depends_on:
  - lead-upload-s3-storage
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKoc08
github_project_item_id: 201133770
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv9Dso
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201133770"
github_project_status: Done
---

## Endpoint: GET /lead-lists/uploads/:fileId/download

Backend proxies the original CSV file from S3 to the client. Do NOT expose the S3 URL directly.

---

### platform-api

#### Route

File: `src/modules/lead-lists/routes/lead-lists.routes.ts`

Add:
```typescript
leadListsRouter.get(
  "/uploads/:fileId/download",
  asyncHandler((request, response) => leadListsController.downloadUpload(request as RequestWithAuthSession, response)),
);
```

#### Controller method

File: `src/modules/lead-lists/controllers/lead-lists.controller.ts`

```typescript
async downloadUpload(request: RequestWithAuthSession, response: Response): Promise<void> {
  const authSession = getRequestAuthSession(request);
  const params = parseParams(request, leadListUploadFileIdParamSchema);
  const result = await downloadLeadListUploadUseCase({ clientId: authSession.clientId, fileId: params.fileId });

  response
    .status(200)
    .setHeader("content-type", "text/csv; charset=utf-8")
    .setHeader("content-disposition", `attachment; filename="${result.filename}"`)
    .send(result.body);
}
```

Add `leadListUploadFileIdParamSchema` to schemas:
```typescript
export const leadListUploadFileIdParamSchema = z.object({ fileId: z.string().uuid() });
```

#### Use-case

File: `src/modules/lead-lists/use-cases/lead-list-uploads.use-cases.ts`

```typescript
export async function downloadLeadListUploadUseCase(input: {
  clientId: number;
  fileId: string;
}): Promise<{ filename: string; body: Buffer }> {
  const fileInfo = await leadsFileInfoRepository.findById(input.fileId, input.clientId);

  if (!fileInfo) {
    throw new NotFoundError("Upload file not found", "LEAD_UPLOAD_NOT_FOUND");
  }

  if (!fileInfo.s3Key) {
    throw new NotFoundError("Upload file not available for download", "LEAD_UPLOAD_NO_S3_KEY");
  }

  const body = await downloadFileFromS3({ bucket: env.aws.bucket, key: fileInfo.s3Key });

  return { filename: fileInfo.name ?? `upload-${fileInfo.id}.csv`, body };
}
```

#### Constraints

- Validate `clientId` ownership — `findById` already scopes by clientId.
- Return 404 if `s3Key` is null (legacy uploads before this feature).
- Follow existing pattern from `getBroadcastScheduleReportDownloadUseCase`.

---

### middleware

File: `src/domains/lead-lists/routes.ts`

Add route definition:
```typescript
{
  method: "GET",
  path: "/lead-lists/uploads/:fileId/download",
  auth: { required: true, strategy: "session" },
  target: "NEW_BACKEND_URL",
  inputSchema: downloadLeadListUploadInputSchema,
  outputSchema: downloadLeadListUploadOutputSchema,
}
```

File: `src/domains/lead-lists/contracts.ts`

Add schemas:
```typescript
export const downloadLeadListUploadInputSchema = z.object({
  params: z.object({ fileId: z.string().uuid() }),
});

export const downloadLeadListUploadOutputSchema = z.string();
```

Update imports in `routes.ts`.

---

### platform-front

#### Service

File: `src/service/leads_lists/leads-lists-service.ts`

```typescript
export const downloadLeadListUploadCsv = async (fileId: string): Promise<{ blob: Blob; filename: string }> => {
  const response = await api.get<Blob>(`/lead-lists/uploads/${fileId}/download`, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    filename: getFilenameFromContentDisposition(response.headers['content-disposition']) ?? `upload-${fileId}.csv`,
  };
};
```

Import `getFilenameFromContentDisposition` from broadcasts service or extract to shared util.

#### Types

File: `src/service/leads_lists/leads-lists-service.types.ts`

Add `s3Key?: string | null` to `TLeadListUploadItem` (used to conditionally show button).

#### Table column

File: `src/hooks/tables/useUploadsColumns.tsx`

Add a final column with a download icon button:
```tsx
{
  header: '',
  id: 'download',
  cell: ({ row }) => {
    if (!row.original.s3Key) return null;

    return (
      <IconButton onClick={() => handleDownload(row.original.fileId)} title="Baixar CSV original">
        <DownloadSimpleIcon size={18} />
      </IconButton>
    );
  },
}
```

Use `DownloadSimpleIcon` from `@phosphor-icons/react` (already in project).

The `handleDownload` function triggers `downloadLeadListUploadCsv(fileId)` → creates a temporary `<a>` element to download the blob. Follow exact pattern from `triggerCsvDownload` in `BroadcastScheduleDetailsView.tsx`.

---

## Validation

- platform-api: `npm run typecheck && npm test && npm run build`
- middleware: `npm run build && npm test && npm run docs:openapi`
- platform-front: `npm run lint && npm run build`
