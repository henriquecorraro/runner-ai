You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: ll-ds
Task: refactor-create-list-from-filter-modal-use-modal
Title: Refactor CreateListFromFilterModal to use useModal hook

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Default validation: npm run lint ; npm run build

### refactor-create-list-from-filter-modal-use-modal
Task id: refactor-create-list-from-filter-modal-use-modal
Task title: Refactor CreateListFromFilterModal to use useModal hook
Task status: open
Task scope: ds-usemodal-refactor
Task validation: npm run build passes ; No open/onOpenChange props on this component ; useModal('create-list-from-filter') used in component and call sites

```md
## Reference

- Hook location: `src/hooks/useModal.tsx`
- Provider already mounted in `src/main.tsx` (wraps entire app)
- Working example: `src/components/AutoRechargeSection/AutoRechargeSection.tsx` uses `useModal('auto-recharge')`
- API: `const { isOpen, data, open, close, toggle } = useModal<DataType>('modal-id')`
- `open(payload?)` opens modal, optionally passing typed data
- `close()` closes modal, preserves data
- `data` is the typed payload passed via `open()`
- Dialog component reads state via hook internally; parent opens via same hook ID
- Do NOT pass `open`/`onClose`/`trigger` props — use hook exclusively
- `DeleteConfirmationDialog` used in `AutoRechargeSection` still uses old prop pattern — that is its own task, do NOT touch it in other tasks


## Objective

Refactor `CreateListFromFilterModal` to use `useModal('create-list-from-filter')` hook instead of receiving `open`/`onOpenChange` props.

## Current Pattern

```typescript
type Props = { open: boolean, onOpenChange: (open: boolean) => void, ... }
// Parent manages state
```

## Target Pattern

```typescript
const { isOpen, close, data } = useModal<CreateListFromFilterData>('create-list-from-filter')
// No open/onOpenChange props — reads from hook
// Parent calls useModal('create-list-from-filter').open(data)
```

## Steps

1. In `src/components/Dialogs/CreateListFromFilterModal/CreateListFromFilterModal.tsx`:
   - Import `useModal` from `@/hooks/useModal`
   - Replace `open`/`onOpenChange` props with `useModal('create-list-from-filter')`
   - Any data passed via props (filters, counts, etc.) should be passed via `useModal.open(data)` and read from `data`
2. Update all parent call sites:
   - Remove local state managing this modal
   - Use `useModal('create-list-from-filter').open({ ...data })` to open
3. Keep all business logic unchanged

## Files

- `src/components/Dialogs/CreateListFromFilterModal/CreateListFromFilterModal.tsx`
- Find all usages: `grep -r "CreateListFromFilterModal" src/`

## Validation

```bash
cd /home/rick/projetos/platform-front && npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/ll-ds/runs/kiro-1781449473366-mftpyk/05-refactor-create-list-from-filter-modal-use-modal/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: refactor-create-list-from-filter-modal-use-modal
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
