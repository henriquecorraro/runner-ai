---
id: bootstrap-clinical-audio-platform
title: Bootstrap clinical audio platform
scope: bootstrap
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck --workspace backend
  - npm run build --workspace frontend
docs_targets:
  - docs/architecture.md
  - README.md
---

Bootstrap the initial Saude project in `/home/rick/projetos/saude` with a TypeScript Express backend following platform-api-style boundaries, a clean healthcare-oriented frontend from scratch, OpenAI audio transcription, and a guidance endpoint prepared for web search or vector-store retrieval. Keep the first version focused on local developer usability and safe clinical decision-support wording.
