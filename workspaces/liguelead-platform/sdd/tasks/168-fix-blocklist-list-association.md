---
id: fix-blocklist-list-association
title: Fix blocklist: associate leads with readonly blocklist list when marked as blocked
scope: leads
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
github_issue_repo: ligue-lead-tech/platform-api
github_issue_id: 4737875171
github_issue_number: 77
github_issue_url: https://github.com/ligue-lead-tech/platform-api/issues/77
github_issue_node_id: I_kwDORpoJ688AAAABGmY84w
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-api/issues/77
github_project_item_id: 204477745
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgwwFTE
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=204477745"
github_project_status: Done
---

## Bug

When a lead is marked as `blocklist: true` (via update or blocklist upload), it is NOT added to the client's readonly "blocklist" lead list (`leads_lists_map`). The readonly list summary (`totalBlocklist`, `totalLeads`) is never updated.

## Root cause

Two code paths set `blocklist = true` on leads but neither associates them with the readonly blocklist list:

1. `updateLeadUseCase` — sets `leads.blocklist = true` only
2. `lead-list-upload-processor.service.ts` — marks leads as blocked and adds them to `job.leadListId` (user-selected list), not the readonly blocklist list

## Fix

### 1. Add helper: `LeadListsRepository.findBlocklistList(clientId)`

File: `src/modules/lead-lists/repositories/lead-lists.repository.ts`

```typescript
async findBlocklistList(clientId: number): Promise<{ id: string } | null> {
  const row = await LeadListModel.findOne({
    where: { clientId, slug: 'blocklist', isReadonly: true },
    attributes: ['id'],
  });
  return row ? { id: row.id } : null;
}
```

### 2. Fix `updateLeadUseCase`

File: `src/modules/leads/use-cases/leads.use-cases.ts`

After the `leadsRepository.update(...)` call, when `input.blocklist` changes:

```typescript
if (input.blocklist !== undefined && input.blocklist !== currentLead.blocklist) {
  const blocklistList = await leadListsRepository.findBlocklistList(input.clientId);
  if (blocklistList) {
    if (input.blocklist) {
      const alreadyInList = await leadListsRepository.existsLeadInList(blocklistList.id, input.id);
      if (!alreadyInList) {
        await leadListsRepository.addLeadToList(blocklistList.id, input.id);
        await leadListsRepository.incrementLeadListSummaryTotals({
          clientId: input.clientId,
          listId: blocklistList.id,
          totalLeadsDelta: 1,
          totalBlocklistDelta: 1,
        });
      }
    } else {
      await leadListsRepository.removeLeadFromList(blocklistList.id, input.id);
      await leadListsRepository.incrementLeadListSummaryTotals({
        clientId: input.clientId,
        listId: blocklistList.id,
        totalLeadsDelta: -1,
        totalBlocklistDelta: -1,
      });
    }
  }
  // Also update GENERAL list blocklist counter
  await leadListsRepository.incrementLeadListSummaryTotals({
    clientId: input.clientId,
    listId: GENERAL_LEAD_LIST_ID,
    totalLeadsDelta: 0,
    totalBlocklistDelta: input.blocklist ? 1 : -1,
  });
}
```

### 3. Fix `lead-list-upload-processor.service.ts`

File: `src/modules/lead-lists/services/lead-list-upload-processor.service.ts`

After `bulkMarkBlocklist` and `addLeadsToList(job.leadListId, ...)`, when `job.isBlocklist`:

```typescript
if (job.isBlocklist) {
  const blocklistList = await leadListsRepository.findBlocklistList(job.clientId);
  if (blocklistList && blocklistList.id !== job.leadListId) {
    const allBlockedIds = [...leadsToCreate.map(l => l.id), ...leadIdsToMarkBlocklist];
    if (allBlockedIds.length > 0) {
      await leadListsRepository.addLeadsToList(blocklistList.id, allBlockedIds);
      await leadListsRepository.incrementLeadListSummaryTotals({
        clientId: job.clientId,
        listId: blocklistList.id,
        totalLeadsDelta: allBlockedIds.length,
        totalBlocklistDelta: allBlockedIds.length,
      });
    }
  }
}
```

### 4. Verify `removeLeadFromList` exists in repository

Ensure `LeadListsRepository` has a method to remove a lead from a list:
```typescript
async removeLeadFromList(listId: string, leadId: string): Promise<void> {
  await LeadListLeadModel.destroy({ where: { leadListId: listId, leadId } });
}
```

## Constraints

- The readonly blocklist list has `is_readonly = 1` — bypass the readonly check internally (repository-level direct call, not via `addLeadToListUseCase` which rejects readonly lists)
- Use `INSERT IGNORE` / `addLeadsToList` which handles duplicates gracefully
- Do NOT change the upload flow for non-blocklist uploads
- Do NOT change the readonly protection on the public API endpoint

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
