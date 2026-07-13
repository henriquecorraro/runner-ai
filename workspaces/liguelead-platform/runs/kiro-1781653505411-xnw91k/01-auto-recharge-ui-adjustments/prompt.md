You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: auto-recharge-ui-adjustments
Title: Auto-recharge UI adjustments: colors, order, and quantity presets

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
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
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### auto-recharge-ui-adjustments
Task id: auto-recharge-ui-adjustments
Task title: Auto-recharge UI adjustments: colors, order, and quantity presets
Task status: open
Task scope: auto-recharge-recurring-consolidation
Task validation: npm run lint ; npm run build

```md
## Fixes to apply

### 1. Rule list calendar icon — use primary color

File: `src/components/AutoRechargeSection/AutoRechargeSection.tsx`

In `renderRuleCard`, when `rule.triggerType === "recurring"`, the `RuleCardIcon` must NOT use `getToneProps(rule.creditTypeId)`. Use a neutral/primary color instead (e.g. no tone props, or a fixed primary accent).

### 2. Swap SMS and SMS Flash theme colors

File: `src/theme/credit-products.theme.ts`

Swap color values between `sms` and `smsFlash` objects. Keep `creditTypeId` and `label` unchanged on each.

| Object | Before | After |
|--------|--------|-------|
| `sms` (creditTypeId: 1) | yellow/amber (#F5A800) | purple (#8B5CF6) |
| `smsFlash` (creditTypeId: 3) | purple (#8B5CF6) | yellow/amber (#F5A800) |

Swap ALL color fields: accent, accentHover, surface, surfaceSoft, surfaceDark, border, text.

### 3. Modal step 1 — use primary color

File: `src/components/AutoRechargeSection/AutoRechargeSection.tsx`

When `activeStep` is the first step (trigger type choice in new flow, or product step in current flow), `selectedProductTheme` and `selectedToneProps` must return a primary/neutral theme, not a product-specific one. The default fallback in `getCreditProductThemeByCreditTypeId` currently returns `creditProductThemes.sms` — the modal must not use that at step 1.

### 4. Product order in CREDIT_TYPES array

File: `src/components/AutoRechargeSection/AutoRechargeSection.tsx`

Reorder `CREDIT_TYPES`:
```typescript
const CREDIT_TYPES = [
  { id: 2, label: "Ligação", description: "Chamadas de voz", icon: <PhoneCallIcon .../> },
  { id: 1, label: "SMS", description: "Mensagens tradicionais", icon: <ChatCircleTextIcon .../> },
  { id: 3, label: "SMS Flash", description: "Mensagem em tela", icon: <LightningIcon .../> },
]
```

### 5. Quantity presets and max range

File: `src/components/AutoRechargeSection/AutoRechargeSection.tsx`

```typescript
const CREDIT_PRESETS = [100000, 200000, 250000]
const MAX_METER_CREDITS = 250000
```

Replace the preset grid with: an editable text input (showing current `rechargeAmount`, capped at 250000, min 100, integer-only) followed by 3 preset buttons (100000, 200000, 250000).

Update `clampRechargeAmountInput` to use max 250000.

## Constraints

- Do NOT change API contracts, service layer, or query hooks.
- Do NOT change creation/update logic.
- Preserve all existing functionality (edit dialog, retry, delete, etc.).
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781653505411-xnw91k/01-auto-recharge-ui-adjustments/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: auto-recharge-ui-adjustments
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
