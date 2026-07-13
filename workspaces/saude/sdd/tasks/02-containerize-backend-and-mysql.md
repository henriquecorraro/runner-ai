---
id: containerize-backend-and-mysql
title: Containerize backend and MySQL
scope: dev-infra
status: implemented
repositories:
  - saude
validation:
  - npm run typecheck
  - docker compose up -d --build
  - curl http://localhost:3333/health
  - "docker compose exec -T mysql mysql -usaude -psaude_dev_password -e \"SHOW DATABASES LIKE 'saude';\""
docs_targets:
  - README.md
  - docs/architecture.md
---

Add Docker development infrastructure for the Saude backend and a local MySQL database, including Dockerfile, compose service definitions, environment variables, documentation, and validation that the backend health endpoint and database are reachable.
