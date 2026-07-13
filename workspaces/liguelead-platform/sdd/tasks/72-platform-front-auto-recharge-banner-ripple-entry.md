---
id: platform-front-auto-recharge-banner-ripple-entry
title: Build auto-recharge banner CTA with ripple entry
scope: platform-front
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
docs_targets:
  - docs/features/credit-purchase.md
---

## Target

```text
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.tsx
/home/rick/projetos/platform-front/src/components/AutoRechargeSection/AutoRechargeSection.styles.ts
/home/rick/projetos/platform-front/src/pages/CreditPurchase/CreditPurchase.tsx
/home/rick/projetos/platform-front/src/pages/CreditPurchase/CreditPurchase.styles.ts
/home/rick/projetos/platform-front/docs/features/credit-purchase.md
```

## Requirements

| Area | Requirement |
|------|-------------|
| Banner placement | Replace the inline `Nova regra` form entry in `AutoRechargeSection` with a full-width CTA banner at the top of the section. |
| Visual reference | Match the background language of the `Volume customizado?` banner in `CreditPurchase`, then make it more energetic for auto recharge. |
| Background | Use layered CSS background effects only. Include subtle animated sheen/noise/line movement. Do not use gradient orbs or decorative blobs. |
| Interaction | On click, run a polished ripple effect from pointer location, then open the auto-recharge wizard modal. |
| Motion | Respect `prefers-reduced-motion`; disable continuous background animation and ripple expansion when reduced motion is enabled. |
| Accessibility | Make the banner a real `button`; support keyboard activation; preserve visible focus state. |
| Copy | Use short Portuguese product copy. No instructional paragraphs. |
| Existing list | Keep the existing configured-rule list below the banner. |
| Styles | Move AutoRechargeSection inline styles into `AutoRechargeSection.styles.ts`. |

## Banner Content

| Element | Text |
|---------|------|
| Eyebrow | `Recarga automática` |
| Title | `Nunca pare por falta de crédito` |
| Body | `Configure uma régua simples: dia fixo ou saldo mínimo, valor de recarga e cartão salvo.` |
| CTA | `Configurar agora` |

## Ripple Behavior

```ts
type Ripple = {
  id: number
  x: number
  y: number
  size: number
}
```

Rules:

- Calculate `x` and `y` from the click position relative to the banner bounds.
- Calculate `size` as `Math.max(width, height) * 2`.
- Remove ripple after animation ends.
- Open modal after the ripple starts, with a short delay no longer than `180ms`.
- Do not block modal opening if animation events do not fire.

## Validation

```bash
npm run lint
npm run build
```
