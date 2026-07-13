---
id: lead-list-upload-block-international-numbers
title: Lead List Upload Blocks International Numbers
scope: lead-list-upload-phone-validation
status: done
repositories:
  - platform-api
  - middleware
  - platform-front
validation:
  - npm run typecheck
  - npm run build
  - npm test
  - middleware:npm test
  - platform-front:npm run lint
  - platform-front:npm run build
docs_targets:
  - platform-api:docs/human/modules/lead-lists.md
  - middleware:docs/domains/README.md
  - platform-front:docs/features/leads-and-lists.md
---

## Goal

Adjust the `platform-api` lead-list upload pipeline so CSV uploads do not register international phone numbers.

## Affected Behavior

`POST /lead-lists/upload` and the `worker:leads-upload` processor must continue accepting upload files, inferring columns, normalizing Brazilian numbers, deduplicating leads, and updating progress. The change is limited to phone validation during processing:

- Brazilian numbers remain accepted with DDI `55`.
- Rows with an explicit DDI different from `55` must be ignored as invalid.
- Rows whose phone value embeds an international country code different from `55` must be ignored as invalid.
- Ignored international rows must not create `leads`, must not attach leads to `leads_lists_map`, must not increment `leads_summary`, and must not be counted as duplicates.

For upload status accounting, international rows should be exposed separately from generic invalid rows through `progress.totalInternationalNumbers`, so the user can see that the file contained rejected international records.

## Implementation Constraints

- Keep the current default DDI behavior for local Brazilian numbers without a DDI column: missing or blank DDI still resolves to `55`.
- Avoid accepting an international number by stripping or reinterpreting the country code as a local Brazilian phone.
- Preserve existing parsing behavior for headers, CSV rows, email/name/surname inference, file cleanup, Redis progress, and duplicate detection.
- Apply the rule before persistence and before summary increments, preferably at the normalization boundary used by the upload processor.
- Return the international rejection count from the Redis-backed upload progress/status contract and keep middleware/frontend contracts aligned.
- Add focused test coverage in `tests/lead-list-upload-processor.service.spec.ts` or the closest existing upload processor test file.
- Cover at least these cases:
  - explicit DDI `55` with valid Brazilian phone is accepted;
  - blank or missing DDI with valid Brazilian phone is accepted;
  - explicit DDI different from `55` is rejected;
  - embedded international prefix/country code different from `55` is rejected;
  - rejected international rows do not affect lead creation, list membership, duplicate totals, or summaries.

## Docs Alignment

Update repository human docs to document the upload phone rule and status behavior: the upload flow only registers Brazilian numbers and exposes rejected international rows separately in upload progress.

## Validation Expectations

- TypeScript typecheck must pass.
- The project must build successfully.
- The existing automated test suite must keep passing.
- Upload processor tests must prove international numbers are rejected before any lead persistence or summary update happens.
