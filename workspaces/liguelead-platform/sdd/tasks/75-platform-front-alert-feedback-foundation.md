---
id: platform-front-alert-feedback-foundation
title: Create shared alert feedback hook
scope: platform-front-alert-feedback
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - platform-front/docs/features/feedback-alerts.md
---

## Files

```text
src/components/AppAlertHost/*
src/hooks/useAppAlert.ts
src/layouts/*
src/main.tsx or src/App.tsx
platform-front/docs/features/feedback-alerts.md
```

## DS Reference

```text
node_modules/@liguelead/design-system/src/package/components/Alert/Alert.tsx
node_modules/@liguelead/design-system/src/package/components/Alert/index.ts
node_modules/@liguelead/design-system/src/package/components/index.ts
```

```ts
type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

type AlertProps = {
  buttonLabel?: string
  children?: ReactNode
  className?: string
  description?: string
  hasButton?: boolean
  href?: string
  openNewTab?: boolean
  title?: string
  variant?: AlertVariant
}
```

## Requirements

- Create shared alert feedback system using `Alert` from `@liguelead/design-system`.
- Export hook: `useAppAlert()`.
- Support variants: `success`, `danger`, `warning`, `info`, `default`.
- Support methods: `showAlert(input)`, `showSuccess(message, options?)`, `showError(message, options?)`, `showWarning(message, options?)`, `showInfo(message, options?)`, `dismissAlert(id)`, `clearAlerts()`.
- Support input shape:

```ts
type AppAlertInput = {
  title?: string
  message: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  timeoutMs?: number
  action?: {
    label: string
    onClick: () => void
  }
}
```

- Render alerts globally in platform layout area.
- Render each alert with DS `Alert`.
- Pass `title`, `description`, and `variant` directly to DS `Alert`.
- Implement close/dismiss UI in the host wrapper around DS `Alert`; do not modify DS package files.
- Implement `action` in the host wrapper when `action.onClick` is provided; DS `Alert` only supports link-style `href` button.
- Alerts must not block interaction.
- Auto-dismiss non-error alerts by default.
- Keep danger alerts visible until timeout or close when timeout is explicitly configured.
- Provide close/dismiss action.
- Deduplicate identical alerts shown within a short interval.
- Do not use `window.alert`, `window.confirm`, or page-local browser alerts.
- Keep API usable from pages, dialogs, mutations, and shared components.
- Do not replace persistent page state panels, empty states, form validation messages, or modal success screens with global alerts.
- Use global alerts for operation feedback only: mutation success, mutation failure, explicit user-triggered load/refresh/export/copy feedback.

## Documentation

- Document usage examples.
- Document variant mapping.
- Document default timeout behavior.
- Document migration rule: replace ad hoc status boxes only when they are operation feedback, not persistent page content.
- Document DS `Alert` source path and supported props.
- Document host-owned extensions: close button, auto-dismiss, dedupe, and callback action.
