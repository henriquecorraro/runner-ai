---
id: credit-packages-catalog-api
title: Credit packages catalog and registration validation API
scope: credit-purchase
status: done
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm test
  - npm run build
docs_targets:
  - platform-api:docs/human/credit-purchase.md
depends_on:
  - sms-phone-verification-backend
---

## Goal

Implement two API capabilities required before a client can purchase credits:

1. A registration completeness validation endpoint that checks whether the client has all required data to proceed with a purchase.
2. A credit packages listing endpoint that returns available packages filtered by credit type.

Both endpoints require an authenticated session.

## Background

In the legacy system (`areadocliente`), the function `Utils::validateDados(clientId)` checks the `clients` table and returns `{ isValid, message }`. The front calls `POST /api/clientes/validate_dados` before allowing access to the purchase screen. The packages listing lives in `api/Pacotes::pacotes_get()` querying the `packages` table filtered by `credits_types_id`, `profiles_id = 3`, `deleted = 0`, and `reseller_id`.

Key rule: **even clients on the free plan can see and buy credit packages, as long as their registration is complete**.

## Endpoints

### GET /clients/registration-status

Returns whether the authenticated client has completed their registration.

Response:
```json
{
  "complete": true | false,
  "missingFields": ["cpf", "cep", "city", "address", "uf"] // only when complete=false
}
```

Business rules:
- Read the client record from `clients` table using `clientId` from the authenticated session context.
- If `clients.type` is null/empty → incomplete, message: "Client type not defined".
- If `type = 'PF'`, required fields: `cpf` (valid format), `name`, `cep`, `city`, `address`, `uf`.
- If `type = 'PJ'`, required fields: `trading_name`, `company_name`, `cnpj` (valid format).
- CPF validation: 11 digits, standard algorithm.
- CNPJ validation: 14 digits, standard algorithm.
- Return `complete: true` only when all required fields are present and valid.

### GET /credit-packages?creditTypeId=:id

Returns available credit packages for the given credit type.

Response:
```json
{
  "packages": [
    {
      "id": 6,
      "name": "1.000",
      "creditTypeId": 1,
      "rangeStart": 1000,
      "rangeEnd": 1000,
      "unitaryValue": 0.09,
      "order": 1
    }
  ]
}
```

Business rules:
- Query `packages` table: `deleted = 0`, `credits_types_id = :creditTypeId`, `profiles_id = 3`, `reseller_id = 0`.
- Order by `order ASC`.
- Also check `customized_packages` for the authenticated client's `clientId` and the requested `creditTypeId`. If a customized package exists with `unitary_value > 0`, append it to the list with a synthetic id (`custom`) and name `Personalizado`.
- The endpoint does NOT enforce registration completeness — that guard is the frontend's responsibility using the registration-status endpoint. However, it still requires authentication.

## Implementation Constraints

- Create a new module `src/modules/credit-packages/` with standard structure: `routes/`, `controllers/`, `use-cases/`, `contracts/`, `schemas/`.
- Add registration-status under the existing `src/modules/clients/` module (create it if it only has entities/repos, or add to an appropriate existing module). Alternatively, a dedicated `src/modules/registration/` module is acceptable.
- Use raw SQL via sequelize.query (project pattern) — no ORM models.
- CPF/CNPJ validators should be pure utility functions in `src/shared/validators/`.
- Reuse the existing auth middleware that populates `request.sessionContext` with `clientId`.

## Docs Alignment

Create `docs/human/credit-purchase.md` documenting:
- Registration completeness rules (PF vs PJ fields)
- Credit packages listing behavior
- Relationship between plans and credit purchase (free plan can still buy)
