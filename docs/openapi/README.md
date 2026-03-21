# Feedo API Documentation (OpenAPI 3) — CTSE deliverable

API contracts for **each microservice** as required by the assignment (“API contract OpenAPI/Swagger for your service’s endpoints”).

## Specification files

| Service | File | Base path (behind gateway) |
|---------|------|----------------------------|
| API Gateway (route map) | `api-gateway-overview.yaml` | `http://localhost:3001` |
| User Service | `user-service.yaml` | `/auth`, `/users`, … |
| Restaurant Service | `restaurant-service.yaml` | `/api/restaurants` |
| Order Service | `order-service.yaml` | `/api/orders` |
| Delivery Service | `delivery-service.yaml` | `/api/delivery` |
| Payment Service | `payment-service.yaml` | `/api/payments` |
| Notification Service | `notification-service.yaml` | `/api/notifications` |

## View / validate

- **Swagger Editor:** [editor.swagger.io](https://editor.swagger.io/) — paste YAML.
- **VS Code:** “OpenAPI (Swagger) Editor” extension.
- **CLI lint:** from repo root (uses `redocly.yaml`):  
  `npx @redocly/cli lint docs/openapi/*.yaml`  
  Expect some **warnings** (e.g. missing `operationId` on stubs); exit code **0** means valid.

## Note

Paths reflect **gateway-relative** URLs where marked “Via API Gateway”. Direct service ports (e.g. order `3004`) are listed under `servers` for local debugging.

## Assignment coverage

Full requirement mapping: **`docs/CTSE_ASSIGNMENT_COVERAGE.md`**
