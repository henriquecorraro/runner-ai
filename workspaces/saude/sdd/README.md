# Saude SDD

This ecosystem centralizes execution planning for the Saude clinical audio platform while keeping code and stable human documentation inside the owning repository.

## Structure

- `tasks/`: executable ecosystem tasks for this project queue
- `runs/`: runner history for isolated executions when explicitly requested
- `skills/`: optional ecosystem-local skills

## Repository

### saude

- root: `/home/rick/projetos/saude`
- scope: backend API, frontend clinical recording interface, OpenAI transcription and guidance orchestration
- validation:
  - `npm run typecheck --workspace backend`
  - `npm run build --workspace frontend`

## Task Status

1. `implemented` `bootstrap-clinical-audio-platform`
   Bootstrap the initial Saude platform with a platform-api-style backend, a clean health-oriented frontend, OpenAI transcription, and clinical guidance orchestration hooks.

2. `implemented` `containerize-backend-and-mysql`
   Containerize backend and MySQL

3. `implemented` `design-clinical-data-model-by-professional-and-patient`
   Design clinical data model by professional and patient

4. `implemented` `implement-professional-auth-with-redis-sessions-and-sequelize`
   Implement professional auth with Redis sessions and Sequelize

5. `implemented` `refresh-healthcare-ui-theme`
   Refresh healthcare UI theme

6. `implemented` `identify-patient-after-first-transcription`
   Identify patient after first transcription
