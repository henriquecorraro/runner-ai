---
id: rcs-agents-frontend-ds-refactor
title: RCS Agents: refactor frontend to use Design System components
scope: rcs-agents
status: open
repositories:
  - platform-front
validation:
  - npm run lint passes
  - npm run build passes
  - No custom FormInput/FormLabel/FormTextarea/FormError in RcsAgentForm.tsx
  - "TextField from @liguelead/design-system used for all text inputs"
  - "Badge from @liguelead/design-system used for status badges"
  - "PageTitleRow + PageHeaderIcon used for page headers"
depends_on:
  - rcs-agents-frontend
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4833744495
github_issue_number: 137
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/137
github_issue_node_id: I_kwDORqaAXc8AAAABIB0Wbw
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/137
github_project_item_id: 210045465
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyFChk
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=210045465"
github_project_status: Testing
---

Refactor `src/pages/RcsAgents/` to use Design System components and match platform header/layout patterns.

## What to change

### 1. Listing page (`RcsAgents.tsx`)

Replace custom table markup with `Table` component from `@liguelead/design-system`.

Replace `PageHeaderTitle` custom styled component with standard pattern:

```typescript
import PageTitle from '@/components/PageTitle/PageTitle'
import { PageHeaderIcon, PageTitleRow } from '@/components/PageTitle/PageHeaderIcon'
import { ChatText } from '@phosphor-icons/react' // or appropriate RCS icon
```

Header pattern (follow Broadcasts.tsx):
```tsx
<PageTitleRow>
  <PageHeaderIcon icon={<ChatText size={22} weight="fill" />} />
  <PageTitle>{t('title')}</PageTitle>
</PageTitleRow>
```

Replace `StatusBadge` styled component with `Badge` from DS:
```tsx
import { Badge } from '@liguelead/design-system'

// Status color map
const STATUS_BADGE: Record<RcsAgentStatus, { color: string; bg: string }> = {
  rascunho: { color: 'neutral700', bg: 'neutral100' },
  enviado: { color: 'info700', bg: 'info100' },
  em_analise: { color: 'warning700', bg: 'warning100' },
  aprovado: { color: 'success700', bg: 'success100' },
  reprovado: { color: 'danger700', bg: 'danger100' },
  editado: { color: 'plankton700', bg: 'plankton100' },
}

<Badge color={STATUS_BADGE[agent.status].color} bg={STATUS_BADGE[agent.status].bg}>
  {t(`status.${agent.status}`)}
</Badge>
```

### 2. Form page (`RcsAgentForm.tsx`)

Replace ALL custom `FormInput` styled elements with `TextField` from DS:
```tsx
import { TextField } from '@liguelead/design-system'

// Before:
<FormLabel>{t('form.fields.contactName')}</FormLabel>
<FormInput value={...} onChange={...} disabled={readonly} $hasError={...} />
{errors.contactName && <FormError>{errors.contactName}</FormError>}

// After:
<TextField
  label={t('form.fields.contactName')}
  value={data.contactName ?? ''}
  onChange={e => updateField('contactName', e.target.value)}
  disabled={readonly}
  error={Boolean(errors.contactName)}
  helperText={errors.contactName}
/>
```

Replace ALL `FormTextarea` with `TextField` (using `as="textarea"` if supported) or keep a styled `textarea` but wrapped in a `Field` component that uses DS spacing/fonts/borders matching `TextField` visual style (same border, radius, focus ring).

Replace custom `CheckboxGroup`/`CheckboxItem` with `Checkbox` from DS:
```tsx
import { Checkbox } from '@liguelead/design-system'

{OPTIN_METHODS.map(method => (
  <Checkbox
    key={method}
    label={t(`form.fields.optinMethodOptions.${method}`)}
    checked={(data.optinMethods ?? []).includes(method)}
    onChange={e => { ... }}
    disabled={readonly}
  />
))}
```

Replace custom `FileUploadArea` with `FileInput` from DS:
```tsx
import { FileInput } from '@liguelead/design-system'

<FileInput
  label={t('form.fields.logo')}
  helperText="PNG/JPG, 224×224px, max 50KB"
  error={Boolean(errors.logoUrl)}
  accept="image/png,image/jpeg"
  onFileChange={(file) => { if (file) handleFileUpload('logo', file) }}
  disabled={readonly}
/>
```

Replace page header in form with the same `PageTitleRow` + `PageHeaderIcon` pattern.

### 3. Styles file (`RcsAgents.styles.ts`)

Remove unused styled components that are now replaced by DS components:
- `FormInput`, `FormLabel`, `FormError`, `FormTextarea`, `FormHint`
- `StatusBadge`, `PageHeaderTitle`, `PageHeader` (replaced by standard components)
- `CheckboxGroup`, `CheckboxItem`
- `FileUploadArea`, `FileUploadLabel`

Keep:
- `StepperContainer`, `StepItem`, `StepNumber`, `StepLabel`, `StepDivider` (stepper is custom)
- `FormActions`, `FormCard`, `FormContainer`, `FormFieldsGrid`
- `SuccessContainer`, `SuccessTitle`, `SuccessProtocol`
- `ReadonlyBanner`
- `ColorPickerWrapper`, `ColorSwatch` (color picker is custom)
- `DeviceInputRow`, `RemoveDeviceButton`
- `IntroCard`, `IntroTitle`, `IntroDescription` (intro empty state)
- `FilePreview`, `FilePreviewName`, `UploadProgress`
- `RejectionTooltip`, `ActionButton`
- `PageContainer`, `PageContentCard`

### 4. FormFieldsGrid layout

Use 2-column grid on desktop, 1-column on mobile. Fields with `$fullWidth` span both columns.

```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 16px;

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

## Do NOT

- Do NOT change form logic, API calls, validation, state management
- Do NOT remove or alter business behavior
- Do NOT change route paths
- Do NOT change i18n keys (keep existing ones working)
- Do NOT change service layer
