# CTSE Assignment 1 (2026) - Complete Execution Plan

This document provides a step-by-step plan to complete and submit Assignment 1 according to SE4010 requirements.

---

## Part A: Pre-Submission Verification (Due before deadline)

### A1: Repository Setup

- [ ] **GitHub Repository is PUBLIC**
  - Go to repository Settings → General → Change repository visibility to Public
  - Verify with: `curl https://api.github.com/repos/YOUR_USERNAME/CTSE-Assignment-01 | grep -i private`

- [ ] **All code is committed and pushed**
  ```bash
  git status  # Should show "nothing to commit, working tree clean"
  git log --oneline -10  # Should show commits
  ```

- [ ] **README.md exists and documents:**
  - How to run locally: `docker compose up`
  - How to deploy to Azure: Reference `AZURE_DEPLOYMENT_GUIDE.md`
  - Architecture overview
  - Service endpoints and ports

### A2: Docker Files Validation

All Docker files are correct and follow best practices:

| Service | File | Check | Status |
|---------|------|-------|--------|
| **API Gateway** | `api_gateway/Dockerfile` | ✓ Created/Updated | ✓ DONE |
| **User Service** | `services/user-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Restaurant Service** | `services/restaurant-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Order Service** | `services/order-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Delivery Service** | `services/delivery-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Notification Service** | `services/notification-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Payment Service** | `services/payment-service/Dockerfile` | ✓ Alpine base | ✓ DONE |
| **Frontend** | `food-delivery-frontend/Dockerfile` | ✓ Multi-stage | ✓ DONE |

**Verification:**
```bash
# Build all images locally to verify Dockerfiles are correct
docker compose build

# Should complete without errors
```

### A3: CI/CD Pipeline Setup

- [ ] **GitHub Actions CI/CD Workflow Active**
  - File: `.github/workflows/ci-cd.yml` ✓ EXISTS
  - Navigate to: GitHub → Actions → CI/CD workflow
  - Verify workflow triggers on push and PR
  - Status should show: ✓ PASSING

- [ ] **Images pushed to GitHub Container Registry (GHCR)**
  ```bash
  # Verify images exist
  curl -s https://api.github.com/users/YOUR_USERNAME/packages | grep feedo
  
  # Should show:
  # - feedo-api-gateway
  # - feedo-user-service
  # - feedo-restaurant-service
  # - feedo-order-service
  # - feedo-delivery-service
  # - feedo-notification-service
  # - feedo-payment-service
  # - feedo-frontend
  ```

- [ ] **SonarCloud Integration**
  - File: `.github/workflows/sonarcloud.yml` ✓ EXISTS
  - Status: 
    - [ ] SonarCloud account created
    - [ ] Repository connected
    - [ ] SONAR_TOKEN added to GitHub secrets
    - [ ] First analysis run completed

- [ ] **Snyk Security Scanning** (Optional but recommended)
  - File: `.github/workflows/snyk.yml` ✓ EXISTS
  - Status:
    - [ ] Snyk account created
    - [ ] SNYK_TOKEN added to GitHub secrets

### A4: Local Testing

```bash
# Test 1: Run with Docker Compose
cd /vercel/share/v0-project
docker compose build
docker compose up -d

# Wait 30 seconds for services to start
sleep 30

# Test 2: Verify services are running
curl http://localhost:3001/health           # API Gateway
curl http://localhost:3000                  # Frontend
curl http://localhost:3002/health           # Restaurant Service
curl http://localhost:3003/health           # Delivery Service

# Test 3: Test inter-service communication
# Register a user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "name": "Test User",
    "role": "customer"
  }'

# Expected: 201 Created with JWT token

# Test 4: Check logs for errors
docker compose logs -f api-gateway    # Check for any errors
docker compose logs -f user-service
docker compose logs -f order-service

# Test 5: Clean up
docker compose down
```

---

## Part B: Pre-Azure Setup (Do BEFORE Azure deployment)

### B1: Prepare for Azure Deployment

- [ ] **Create .env file for Azure** (DO NOT commit sensitive values)
  ```bash
  cp .env.development.local .env.azure
  ```

- [ ] **Generate strong secrets**
  ```bash
  # JWT_SECRET (min 32 chars)
  openssl rand -base64 32
  
  # INTERNAL_API_KEY (min 32 chars)
  openssl rand -base64 32
  ```

- [ ] **Prepare Azure credentials**
  - [ ] Azure subscription active (free tier OK)
  - [ ] Azure CLI installed: `az --version`
  - [ ] Logged in: `az login`

- [ ] **Prepare MongoDB**
  - Option A (Recommended): MongoDB Atlas free tier
    - [ ] Create account at mongodb.com/cloud/atlas
    - [ ] Create free M0 cluster
    - [ ] Get connection string
  - Option B: Azure Cosmos DB
    - [ ] Create Cosmos DB instance
    - [ ] Get MongoDB connection string

- [ ] **Prepare external services credentials**
  - [ ] Stripe keys (test mode)
  - [ ] Gmail App Password for SMTP
  - [ ] Any other third-party API keys

---

## Part C: Azure Deployment (5-7 steps, ~30 minutes)

Follow the **AZURE_DEPLOYMENT_GUIDE.md** exactly in order:

### C1: Azure Setup (Phase 1 & 2)
```bash
# Step 1: Create resource group
az group create --name rg-feedo-ctse --location eastus

# Step 2: Create Container Apps environment
az containerapp env create --name feedo-env \
  --resource-group rg-feedo-ctse --location eastus

# Step 3: Create Key Vault
az keyvault create --name feedo-vault-ctse \
  --resource-group rg-feedo-ctse --location eastus

# Step 4: Add secrets to Key Vault
az keyvault secret set --vault-name feedo-vault-ctse \
  --name jwt-secret --value "YOUR_JWT_SECRET"

az keyvault secret set --vault-name feedo-vault-ctse \
  --name mongo-uri --value "YOUR_MONGODB_CONNECTION_STRING"

# ... (continue with other secrets)
```

### C2: Deploy MongoDB
```bash
# Using MongoDB Atlas (recommended for free tier)
# OR deploy as Container App (see AZURE_DEPLOYMENT_GUIDE.md Phase 3.4)
```

### C3: Deploy Microservices
```bash
# Deploy each service using `az containerapp create` commands
# Follow Phase 3.5-3.8 in AZURE_DEPLOYMENT_GUIDE.md

# Services to deploy in order:
# 1. User Service
# 2. Restaurant Service
# 3. Order Service
# 4. Delivery Service
# 5. Notification Service
# 6. Payment Service
# 7. API Gateway
# 8. Frontend
```

### C4: Verify Deployment
```bash
# Check all services are running
az containerapp list --resource-group rg-feedo-ctse \
  --query "[*].{Name:name, Status:properties.provisioningState}"

# Get gateway URL
GATEWAY_URL=$(az containerapp show --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "API Gateway: https://$GATEWAY_URL"
echo "Frontend: https://$(az containerapp show --name feedo-frontend \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)"
```

---

## Part D: Document Everything (Report Creation)

### D1: Create Project Report

Using `docs/CTSE_ASSIGNMENT_REPORT_TEMPLATE.md` as base:

**Section 1: Shared Architecture Diagram**
- [ ] Copy the Mermaid diagram from `AZURE_DEPLOYMENT_GUIDE.md` Phase 7.1
- [ ] Include ASCII art or Visio diagram
- [ ] Label all services, ports, and communication paths
- [ ] Show Azure infrastructure (Container Apps, Key Vault, etc.)

**Section 2: Your Assigned Microservice Description**

Choose ONE service to describe in detail:

```
Example (User Service):

2.1 Overview
- Role: Authentication, user profile management, registration
- Technology: Node.js + Express + MongoDB
- Port: 3001 (internal to gateway)

2.2 API Endpoints
- POST /auth/register - User registration
- POST /auth/login - User login, returns JWT
- GET /profile - Get user profile (requires JWT)
- PUT /profile - Update profile
- GET /users/:id - Get user by ID

2.3 Database Schema
- users collection:
  - _id: ObjectId
  - email: String (unique)
  - password: String (bcrypt hashed)
  - name: String
  - role: enum[customer, restaurantManager, admin]
  - createdAt: Date

2.4 Integration with Other Services
- Called by: API Gateway (all routes), other services
- Calls: None directly (receives HTTP calls)
- Communication: RESTful HTTP JSON

2.5 Security Implementation
- Passwords hashed with bcrypt (rounds: 10)
- JWT tokens issued with 24h expiry
- Rate limiting on login endpoint (5 attempts/15min)
- Input validation on all endpoints
```

**Section 3: Inter-Service Communication Example**

```
3.1 Order Creation Flow

Client (Frontend)
    ↓
POST /api/orders (API Gateway)
    ↓
API Gateway validates JWT
    ↓
POST /orders (Order Service)
    ↓
Order Service:
    1. Validates restaurant exists (calls Restaurant Service)
    2. Creates order document
    3. Calls Delivery Service to create delivery
    4. Calls Notification Service to send order confirmation
    5. Returns order ID

Service Calls:
- Order → Restaurant: GET /restaurants/:id
- Order → Delivery: POST /deliveries
- Order → Notification: POST /notifications/order-placed

Response chain:
Frontend ← API Gateway ← Order Service ← [confirmation from all services]
```

**Section 4: DevOps & CI/CD Implementation**

```
4.1 Version Control (GitHub)
- Repository: public at github.com/YOUR_USERNAME/CTSE-Assignment-01
- Commits: Conventional commits (feat:, fix:, docs:, etc.)
- Branches: feature/* for new features, hotfix/* for bugs

4.2 CI/CD Pipeline
- Trigger: Push to main branch
- Steps:
  1. Checkout code
  2. Install dependencies (npm ci)
  3. Run tests (npm test)
  4. Build Docker images
  5. Run SonarCloud analysis
  6. Push images to GHCR
  7. Deploy to Azure (manual or automated)

4.3 Containerization
- All services in Docker containers
- Images: ghcr.io/YOUR_USERNAME/feedo-*
- Deployment: Azure Container Apps (serverless)

4.4 Container Registry
- GitHub Container Registry (GHCR)
- Automatic push on CI/CD success
- Images tagged: :latest and :SHA
```

**Section 5: Security Implementation**

```
5.1 Authentication & Authorization
- JWT tokens validated at API Gateway
- Role-based access control (RBAC):
  - customer: Can place orders, view own profile
  - restaurantManager: Can manage menu, view orders
  - deliveryPerson: Can view and update deliveries
  - admin: Full access
- Tokens expire after 24 hours

5.2 Network Security
- Azure Network Security Groups (NSGs)
- Public endpoints: API Gateway, Frontend (HTTPS only)
- Internal endpoints: All microservices (private ingress)
- Egress: Only to MongoDB and peer services

5.3 Secrets Management
- Azure Key Vault for all sensitive data
- No secrets in code or environment files
- Secrets injected at container runtime
- Secrets rotation capability

5.4 Data Security
- MongoDB passwords hashed (bcrypt)
- Stripe integration for PCI compliance
- HTTPS/TLS for all communication
- Payload validation and sanitization

5.5 DevSecOps (SAST)
- SonarCloud: Code quality analysis on every commit
- Snyk: Dependency vulnerability scanning
- Quality gate: Block merge if quality issues found
```

**Section 6: Challenges & Solutions**

```
6.1 Individual Challenges
Challenge 1: Docker Compose networking
- Issue: Services couldn't communicate
- Solution: Used named services in MONGO_URI (mongodb://mongodb:27017)
- Learning: Docker networks automatically resolve hostnames

Challenge 2: Environment variable passing
- Issue: Secrets visible in logs
- Solution: Use Azure Key Vault references
- Learning: Twelve-factor app methodology

Challenge 3: MongoDB connection timeout
- Issue: Atlas firewall blocking Azure IPs
- Solution: Added Azure IP range to MongoDB Atlas firewall

6.2 Integration Challenges
Challenge 1: Services calling wrong URLs
- Issue: Hardcoded localhost:PORT in code
- Solution: Use environment variables for service URLs

Challenge 2: JWT validation between services
- Issue: Different JWT_SECRET values
- Solution: Ensure all services use same JWT_SECRET from Key Vault

Challenge 3: CORS issues between frontend and gateway
- Issue: Browser blocking cross-origin requests
- Solution: Configured CORS in API Gateway
```

**Section 7: Deployment Architecture**

```
7.1 Local Development
docker compose up -d
# Services accessible at localhost:3000-3006

7.2 Cloud Deployment (Azure)
Azure Container Registry
    ↓
Azure Container Apps
├─ User Service (port 3001, internal)
├─ Restaurant Service (port 3002, internal)
├─ Order Service (port 3004, internal)
├─ Delivery Service (port 3003, internal)
├─ Notification Service (port 3005, internal)
├─ Payment Service (port 3006, internal)
├─ API Gateway (port 3001, public)
└─ Frontend (port 80/443, public)
    ↓
Azure Key Vault (secrets)
    ↓
MongoDB Atlas (database)
```

### D2: Include Supporting Documents

- [ ] **Screenshots:**
  - [ ] GitHub Actions successful CI/CD run
  - [ ] SonarCloud dashboard with quality metrics
  - [ ] Azure Container Apps deployed services
  - [ ] Inter-service communication test result
  - [ ] Frontend working on Azure

- [ ] **API Documentation:**
  - [ ] OpenAPI/Swagger specs (see `docs/openapi/`)
  - [ ] Sample curl requests for inter-service calls
  - [ ] Authentication flow diagram

- [ ] **Code Artifacts:**
  - [ ] Dockerfile excerpts (showing best practices)
  - [ ] Code snippet showing JWT validation
  - [ ] Security implementation (password hashing, etc.)

---

## Part E: Demonstration Preparation (10-minute viva)

### E1: Prepare Demo Script

```
Time allocation:
- 0:00-1:00 - Explain architecture (use diagram)
- 1:00-2:00 - Show GitHub repository and CI/CD workflow
- 2:00-3:00 - Show deployed services on Azure
- 3:00-5:00 - Demonstrate inter-service communication
- 5:00-7:00 - Show security implementation
- 7:00-8:30 - Show code and explain your assigned service
- 8:30-10:00 - Questions and discussion
```

### E2: Demo Checklist

- [ ] **Have URLs ready:**
  - API Gateway: https://feedo-api-gateway-XXXX.azurecontainerapps.io
  - Frontend: https://feedo-frontend-XXXX.azurecontainerapps.io

- [ ] **Have test credentials ready:**
  - Test user: test@example.com / Password123!
  - Test restaurant account
  - Test delivery account

- [ ] **Prepare test scenarios:**
  - Scenario 1: User registration and login
  - Scenario 2: Browse restaurants and place order
  - Scenario 3: Track delivery in real-time
  - Scenario 4: View order confirmation email

- [ ] **Show CI/CD pipeline:**
  - Navigate to GitHub → Actions
  - Show workflow run
  - Show image push to GHCR
  - Show Azure deployment

- [ ] **Show security measures:**
  - JWT token in browser dev tools
  - Azure Key Vault secrets (without values)
  - Network security groups in Azure
  - SonarCloud quality metrics

### E3: Practice Demo

- [ ] Record yourself explaining the system (5 min)
- [ ] Practice showing GitHub, Azure, and application
- [ ] Test all URLs work and services respond
- [ ] Prepare answers to likely questions:
  - "Why did you choose this architecture?"
  - "How do you ensure security?"
  - "What happens if one service fails?"
  - "How do services communicate?"
  - "What's the deployment process?"

---

## Part F: Final Submission Checklist

### F1: Code Repository

- [ ] **Public GitHub repository:**
  - [ ] Visibility set to Public
  - [ ] All code committed and pushed
  - [ ] README includes setup instructions
  - [ ] .gitignore excludes secrets and node_modules

- [ ] **Dockerfiles:**
  - [ ] All 8 Dockerfiles present and correct
  - [ ] Images build successfully locally
  - [ ] Images pushed to GHCR

- [ ] **CI/CD Configuration:**
  - [ ] `.github/workflows/ci-cd.yml` configured
  - [ ] Workflow triggers on push and PR
  - [ ] All checks passing
  - [ ] Images auto-pushed to GHCR

- [ ] **Documentation:**
  - [ ] `README.md` complete with instructions
  - [ ] `AZURE_DEPLOYMENT_GUIDE.md` with steps
  - [ ] `docs/ARCHITECTURE.md` with diagrams
  - [ ] `docs/SECURITY.md` explaining security
  - [ ] OpenAPI specs in `docs/openapi/`

### F2: Azure Deployment

- [ ] **All services deployed:**
  - [ ] User Service running
  - [ ] Restaurant Service running
  - [ ] Order Service running
  - [ ] Delivery Service running
  - [ ] Notification Service running
  - [ ] Payment Service running
  - [ ] API Gateway running (public)
  - [ ] Frontend running (public)

- [ ] **Services communicating:**
  - [ ] Can create order → triggers delivery creation
  - [ ] Can track order → delivery updates received
  - [ ] Notifications sent on order updates

- [ ] **Security configured:**
  - [ ] Secrets in Key Vault (not in env files)
  - [ ] HTTPS on public endpoints
  - [ ] JWT validation working
  - [ ] SonarCloud analyzing code
  - [ ] Snyk scanning dependencies

### F3: Report

- [ ] **PDF report includes:**
  - [ ] Architecture diagram (Mermaid/Visio/ASCII)
  - [ ] Description of your assigned service
  - [ ] Inter-service communication explanation
  - [ ] DevOps practices overview
  - [ ] Security implementation details
  - [ ] Challenges faced and solutions
  - [ ] Screenshots of deployment and testing

- [ ] **Report formatting:**
  - [ ] Cover page with group member names
  - [ ] Table of contents
  - [ ] Page numbers
  - [ ] References and links
  - [ ] Professional formatting

### F4: Demonstration

- [ ] **Video/Live demo includes:**
  - [ ] Working prototype accessible online
  - [ ] Live inter-service communication demo
  - [ ] GitHub Actions CI/CD pipeline walkthrough
  - [ ] Security measures explanation
  - [ ] Code explanation (your assigned service)
  - [ ] 10 minutes or less

---

## Part G: Submission Instructions

### G1: GitHub Repository

```bash
# Ensure everything is committed
git status

# Push to GitHub
git push origin main

# Verify online at:
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01
```

### G2: Submit via Learning Management System (LMS)

Submit:
1. Link to GitHub repository
2. PDF report (check assignment requirements for format)
3. Video demo link (if recorded)
4. Azure deployment URLs:
   - Frontend: https://...
   - API Gateway: https://...

### G3: Prepare for Viva

- Ensure you can access Azure Console during viva
- Have GitHub open and ready to show code
- Have working deployed application
- Practice 10-minute presentation

---

## Quick Reference: Key Commands

```bash
# Local testing
docker compose build
docker compose up -d
docker compose logs -f api-gateway
docker compose down

# Azure deployment (see AZURE_DEPLOYMENT_GUIDE.md)
az group create --name rg-feedo-ctse --location eastus
az containerapp list --resource-group rg-feedo-ctse

# Git workflow
git add .
git commit -m "feat: description"
git push origin main

# Check GHCR images
curl -s https://api.github.com/users/YOUR_USERNAME/packages | grep feedo
```

---

## Need Help?

| Issue | Resource |
|-------|----------|
| Docker help | `.github/workflows/ci-cd.yml` and `README-DOCKER.md` |
| Azure help | `AZURE_DEPLOYMENT_GUIDE.md` and `deploy/azure/README.md` |
| Architecture | `docs/ARCHITECTURE.md` and `docs/INTEGRATION_AND_GROUP_DEMO.md` |
| Security | `docs/SECURITY.md` |
| Troubleshooting | `docs/SECRET_SCANNING_FIX.md` and `docs/RUNNING.md` |

