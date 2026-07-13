---
id: refresh-healthcare-ui-theme
title: Refresh healthcare UI theme
scope: frontend-theme
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck --workspace frontend
  - npm run build --workspace frontend
docs_targets:
  - docs/architecture.md
---

Refresh the frontend visual theme for the Saude clinical workflow. Before implementation, review current healthcare UI references and accessibility guidance, especially around blue-based medical trust palettes, restrained gray surfaces, sufficient contrast, and readable lightweight typography. Replace the current green-forward palette with a healthcare-oriented sky-blue/navy system: light clinical background surfaces, navy text, sky/medical-blue gradients for primary emphasis, blue primary buttons, neutral gray borders and secondary text, and red/amber reserved only for clinical urgency or warnings. Update typography to a thinner/lighter-feeling font stack or imported web font suitable for a clinical SaaS interface, while preserving readability for long clinical shifts. Apply the theme consistently across authentication screens, chat bubbles, recording controls, transcription blocks, guidance cards, segmented controls, and responsive states. Keep the existing chat workflow and functionality intact. Validate mobile and desktop layout, text contrast, and production build.
