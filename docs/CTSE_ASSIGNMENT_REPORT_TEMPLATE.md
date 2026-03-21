# CTSE Assignment 1 - Project Report Template

**Module**: Current Trends in Software Engineering (SE4010) | 2026 | Semester 1  
**Cloud Computing Assignment**

---

## 1. Shared Architecture Diagram

> **Include the high-level architecture diagram** showing all four microservices, deployment on cloud, communication paths, and shared infrastructure.

See `docs/ARCHITECTURE.md` for the diagram. Copy/export into report.

---

## 2. Microservice Description (Individual – fill per student)

**Assigned Microservice**: ________________ (e.g., User Service, Restaurant Service, Order Service, Delivery Service)

### Functionality
- [List core functions]
- [Endpoints overview]

### Rationale
- [Why this microservice, its role in the overall application]

### Endpoints
| Method | Path | Description |
|--------|------|--------------|
| GET | /health | Health check |
| ... | ... | ... |

---

## 3. Inter-Service Communication

### With [Other Member's Service]
- **Trigger**: When [X happens]
- **Call**: `POST /api/...` 
- **Payload**: { ... }
- **Response**: { ... }

### Example (Delivery + Order)
- Order Service creates delivery when restaurant accepts order
- `POST /api/delivery/deliveries` with orderId, pickup, dropoff
- Delivery Service returns delivery ID, assigns driver

---

## 4. DevOps & Security Practices

### Version Control
- Public repository: [GitHub URL]
- Branch strategy: main/master

### CI/CD
- GitHub Actions: `.github/workflows/ci-cd.yml`
- Build → Test → Push to GHCR
- [Describe pipeline steps]

### Containerization
- Dockerfile per service
- Images hosted on [GHCR/Docker Hub]

### Deployment
- [ECS / Azure Container Apps / GKE]
- Managed container orchestration

### Security
- JWT for authentication
- Helmet, CORS
- IAM roles, security groups (cloud)
- Secrets in environment/Secrets Manager
- **DevSecOps**: SonarCloud in pipeline (`.github/workflows/sonarcloud.yml`)

### API Contract
- OpenAPI specs in `docs/openapi/`

---

## 5. Challenges & Solutions

### Individual
- [Challenge 1]: [Solution]
- [Challenge 2]: [Solution]

### Integration
- [Challenge]: [Solution]

---

## References

- [Any references]
