# CTSE Assignment 1 (2026) — Requirement Coverage

Official objectives (abbreviated) vs this repository.

| # | Assignment requirement | Where implemented |
|---|------------------------|-------------------|
| 1 | **Microservice prototype** (secure, DevOps, cloud) | Entire `Feedo` repo; services under `services/` |
| 2 | **4 students / 4 microservices** (cohesive app) | Map in `docs/INTEGRATION_AND_GROUP_DEMO.md`; code has User, Restaurant, Order, Delivery + Payment, Notification, Gateway |
| 3 | **Independently deployable** | Dockerfile per service; `docker-compose.yml`; `deploy/aws-ecs/` |
| 4 | **Integrate & communicate** | HTTP between services (see `orderIntegration`, `notificationService`, `deliveryService` clients) |
| 5 | **Version control — public repo** | Push to GitHub (student makes repo public) |
| 6 | **CI/CD automate build & deploy** | `.github/workflows/ci-cd.yml` → build, test, push **GHCR** |
| 7 | **Docker containerize** | Each `services/*/Dockerfile`, `api_gateway/Dockerfile`, `food-delivery-frontend/Dockerfile` |
| 8 | **Container registry** | Images: `ghcr.io/<owner>/feedo-*` (see CI workflow) |
| 9 | **Cloud orchestration** (ECS, AKS, GKE, etc.) | `deploy/README.md`, `deploy/aws-ecs/*.json`, `deploy/azure/` |
| 10 | **Internet-accessible** | ALB / public ingress + env URLs (document in deploy README) |
| 11 | **Security** (IAM, SG, least privilege) | `docs/SECURITY.md`, ECS task defs with roles |
| 12 | **Secure data handling** | JWT, bcrypt, Stripe webhook signing, internal API key |
| 13 | **SAST — SonarCloud or Snyk** | `sonar-project.properties`, `.github/workflows/sonarcloud.yml`, `.github/workflows/snyk.yml` |
| 14 | **Report deliverables** | `docs/ARCHITECTURE.md`, `docs/CTSE_ASSIGNMENT_REPORT_TEMPLATE.md`, this file |
| 15 | **OpenAPI / Swagger** | `docs/openapi/*.yaml` |
| 16 | **Demo: deployed prototype** | Deploy stack from GHCR + compose/cloud |
| 17 | **Demo: inter-service communication** | See integration doc |
| 18 | **Demo: CI/CD walkthrough** | GitHub Actions tab |
| 19 | **Demo: security explanation** | `docs/SECURITY.md` |

**Free tier:** Use AWS/Azure/GCP free credits and smallest Fargate/Container Apps SKUs as documented in `deploy/README.md`.
