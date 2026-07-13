---
id: auto-recharge-ui-adjustments
title: "Auto-recharge UI adjustments: colors, order, and quantity presets"
scope: auto-recharge-recurring-consolidation
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKogI8
github_project_item_id: 201191885
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv98c0
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201191885"
github_project_status: Todo
---

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
