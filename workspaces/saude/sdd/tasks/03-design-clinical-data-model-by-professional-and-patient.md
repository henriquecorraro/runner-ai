---
id: design-clinical-data-model-by-professional-and-patient
title: Design clinical data model by professional and patient
scope: database
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck --workspace backend
  - npm run build --workspace backend
  - "docker compose exec -T mysql mysql -usaude -psaude_dev_password saude -e \"SHOW TABLES;\""
docs_targets:
  - docs/architecture.md
  - docs/database.md
---

Create the initial database structure for storing clinical audio workflow data scoped by the authenticated healthcare professional and separated by patient. The design should support nurses, physicians, and other professionals while keeping each consultation linked to one professional identity and one patient identity. Include tables or models for professionals/users, patients, encounters/consultations, audio recordings, transcriptions, patient context notes, generated clinical guidance, and audit metadata. Define ownership and access rules so a logged-in professional only accesses their own patients/encounters unless future team-sharing permissions are explicitly added. Add migrations/DDL, backend persistence integration, and repository/service boundaries that match the platform-api-style backend structure already used in this project. Update docs with entity relationships, privacy assumptions, and validation commands.
