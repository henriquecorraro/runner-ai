---
id: identify-patient-after-first-transcription
title: Identify patient after first transcription
scope: patient-flow
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck --workspace backend
  - npm run build --workspace backend
  - npm run build --workspace frontend
docs_targets:
  - docs/database.md
  - docs/architecture.md
---

After the first encounter transcription, require the professional to identify the patient before continuing the clinical workflow. Add backend endpoints for listing the authenticated professional's patients, creating a patient, and assigning or moving the current encounter to a selected patient. Add a lightweight patient-suggestion step that derives partial patient form data from the transcription text when possible, without overwriting user edits. Update the frontend to open a modal after the first transcription with two paths: select an existing patient from a dropdown or create a new patient with partially prefilled fields from the transcription. Once the patient is selected or created, keep the encounter linked to that patient and continue to patient context and guidance. Preserve auth-based professional ownership; no explicit professional id should be returned in API responses.
