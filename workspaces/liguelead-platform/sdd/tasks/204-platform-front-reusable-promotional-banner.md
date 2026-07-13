---
id: platform-front-reusable-promotional-banner
title: Add reusable promotional banner dialog
scope: platform-shell
status: open
repositories:
  - platform-front
validation:
  - platform-front:npm run lint
  - platform-front:npm run build
github_issue_repo: ligue-lead-tech/platform-front
github_issue_id: 4867930573
github_issue_number: 141
github_issue_url: https://github.com/ligue-lead-tech/platform-front/issues/141
github_issue_node_id: I_kwDORqaAXc8AAAABIia5zQ
github_issue_urls:
  - https://github.com/ligue-lead-tech/platform-front/issues/141
github_project_item_id: 212063150
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgyj064
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=212063150"
github_project_status: Testing
---

## Repository

| Repository | Changes |
|---|---|
| platform-front | Add reusable authenticated promotional banner dialog and RCS launch campaign |

## Component

```typescript
type PromotionalBanner = {
  id: string
  imageSrc: string
  imageAlt: string
  destination: string
  dismissal: 'session'
}
```

- Create reusable `PromotionalBannerDialog`.
- Render active promotions inside `PlatformLayout` after authenticated user loading completes.
- Use Radix Dialog primitives.
- Support close button, overlay click, Escape, image CTA, responsive sizing, and accessible title.
- Store dismissal with a versioned campaign-specific `sessionStorage` key.
- Fail open when browser storage is unavailable.
- Do not show the dialog on the campaign destination route.
- Do not couple the reusable component to RCS copy or routes.

## RCS campaign

- Copy `/home/rick/projetos/areadocliente/public/assets/template/images/promotions/pop-up-rcs.png` into `src/assets/promotions/`.
- Configure campaign id `rcs-launch-v1`.
- Navigate to `/rcs/agents/new` when the banner is activated.
- Show once per browser session until dismissed or activated.

## Validation

```bash
cd /home/rick/projetos/platform-front
npm run lint
npm run build
```
