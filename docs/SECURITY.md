# Security & DevSecOps — Feedo (CTSE SE4010)

This document maps **assignment requirements** (integrate security best practices, least privilege, DevSecOps/SAST) to what is implemented in the repository.

---

## 1. Authentication & authorization

| Practice | Implementation |
|----------|------------------|
| **JWT** | User Service issues tokens; API Gateway validates `Authorization: Bearer` for protected routes. |
| **Role-based access** | Roles: `customer`, `restaurantManager`, `deliveryPerson`, `admin` — enforced in service middleware. |
| **Secrets not in code** | `JWT_SECRET`, `STRIPE_SECRET_KEY`, `INTERNAL_API_KEY`, DB URIs via **environment variables** or cloud **Secrets Manager** (see `deploy/`). |

---

## 2. Network & cloud (assignment: IAM, security groups)

**Typical AWS deployment (ECS/Fargate):**

| Control | Purpose |
|---------|---------|
| **Security groups** | ALB allows `443` from internet; ECS tasks only accept traffic from ALB SG; egress only to MongoDB and internal service URLs. |
| **IAM task roles** | **Least privilege**: task role can read specific Secrets Manager ARNs; no `*` on `s3:*` unless needed. |
| **Execution role** | Pull images from ECR/GHCR, write logs to CloudWatch only. |
| **Private subnets** | Run containers without public IPs; only load balancer in public subnets. |

**Azure Container Apps / GCP Cloud Run:** use managed identity, VNet integration, and ingress restricted to HTTPS.

---

## 3. Data handling

- Passwords **hashed** (bcrypt) in User Service.
- **HTTPS** in production (TLS termination at load balancer / reverse proxy).
- **Payment**: Stripe handles card data (PCI scope reduced); webhooks verified with **Stripe signing secret**.
- **Internal service calls**: optional `x-internal-key` for Notification Service fan-in (`INTERNAL_API_KEY`).

---

## 4. DevSecOps — SAST

| Tool | Location | Setup |
|------|----------|--------|
| **SonarCloud** | `.github/workflows/sonarcloud.yml` | Add repo secret `SONAR_TOKEN`; set `sonar.organization` in `sonar-project.properties`. |
| **Snyk** (optional) | `.github/workflows/snyk.yml` | Add `SNYK_TOKEN` for dependency + container scans (free tier). |

Run Sonar on **main** / **PRs** for continuous quality gates.

---

## 5. CI/CD security

- Images pushed to **GHCR** using **`GITHUB_TOKEN`** (scoped to repository).
- No secrets committed: use **GitHub Actions secrets** for tokens.
- **Dependency installation** in CI uses lockfiles where present (`npm ci`).

---

## 6. Demonstration (viva) talking points

1. **JWT + gateway** — single entry, no direct DB exposure to browser.
2. **SonarCloud / Snyk** — show dashboard and one fixed issue.
3. **Cloud** — show security group diagram + IAM role for ECS task (screenshot from AWS console).
4. **Stripe webhook** — signature verification prevents forged payment events.

---

## References

- `deploy/README.md` — secrets in AWS Secrets Manager pattern  
- `docs/DEPLOYMENT_AND_DEVOPS.md` — Docker & CI overview  
