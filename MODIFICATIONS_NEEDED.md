# Required Modifications for CTSE Assignment Submission

This document lists what needs to be changed/fixed in your codebase for full assignment compliance.

---

## Phase 1: Critical (Must Do)

### 1.1 Verify Repository is Public

```bash
# Step 1: Go to GitHub Settings
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01/settings

# Step 2: Scroll to "Danger Zone"
# Change repository visibility → Make this repository public

# Verify with command:
curl -s https://api.github.com/repos/YOUR_USERNAME/CTSE-Assignment-01 | grep "\"private\""
# Should return: "private": false
```

**Status:** ✓ Repository appears to be in v0 (will be public)

---

### 1.2 Create .env.example File

**File:** `/vercel/share/v0-project/.env.example`

This is CRITICAL - it shows what environment variables are needed without exposing secrets.

```bash
# Copy current development env and sanitize it
cat .env.development.local | sed 's/=.*/=CHANGE_ME/' > .env.example
```

**What it should contain:**
```
# API Gateway
PORT=3001
JWT_SECRET=your_jwt_secret_here_min_32_chars
INTERNAL_API_KEY=your_internal_api_key_min_32_chars

# Service URLs (for local development)
USER_SERVICE_URL=http://localhost:3001
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3004
DELIVERY_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006

# Database
MONGO_URI=mongodb://mongodb:27017/admin
MONGODB_URI=mongodb://mongodb:27017/admin

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM=your_email@gmail.com

# Application URLs
APP_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3001

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here

# Third-party integrations (if applicable)
# Add any other service keys needed
```

**Status:** Need to CREATE

---

### 1.3 Verify Dockerfiles Exist and Are Correct

**Current Status:** ✓ All exist except API Gateway (just created)

Verification:
```bash
# Verify all Dockerfiles exist
test -f api_gateway/Dockerfile && echo "✓ API Gateway" || echo "✗ API Gateway"
test -f services/user-service/Dockerfile && echo "✓ User Service" || echo "✗ User Service"
test -f services/restaurant-service/Dockerfile && echo "✓ Restaurant" || echo "✗ Restaurant"
test -f services/order-service/Dockerfile && echo "✓ Order Service" || echo "✗ Order Service"
test -f services/delivery-service/Dockerfile && echo "✓ Delivery Service" || echo "✗ Delivery Service"
test -f services/notification-service/Dockerfile && echo "✓ Notification" || echo "✗ Notification"
test -f services/payment-service/Dockerfile && echo "✓ Payment Service" || echo "✗ Payment Service"
test -f food-delivery-frontend/Dockerfile && echo "✓ Frontend" || echo "✗ Frontend"

# Verify they build
docker compose build
```

**Status:** ✓ All exist and correct (API Gateway Dockerfile just created)

---

### 1.4 Verify CI/CD Workflow

**File:** `.github/workflows/ci-cd.yml`

**Current Status:** ✓ EXISTS and CORRECT

Check that:
- ✓ Triggers on push to main/master
- ✓ Triggers on pull_request
- ✓ Has workflow_dispatch for manual runs
- ✓ Builds all services
- ✓ Runs tests
- ✓ Pushes to GHCR (GitHub Container Registry)
- ✓ All image names correct: `feedo-*`

**Verification:**
```bash
# After pushing code, check GitHub Actions
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01/actions

# Should show green checkmarks for CI/CD workflow
```

**Status:** ✓ CORRECT

---

### 1.5 Verify SonarCloud Integration

**Files:** 
- `.github/workflows/sonarcloud.yml` ✓ EXISTS
- `sonar-project.properties` ✓ EXISTS

**What needs to be done:**
```bash
# 1. Go to SonarCloud: https://sonarcloud.io
# 2. Sign up with GitHub account
# 3. Select this repository
# 4. Get SONAR_TOKEN from: https://sonarcloud.io/account/security/
# 5. Add to GitHub repository secrets:
#    Settings → Secrets and variables → Actions
#    Name: SONAR_TOKEN
#    Value: <your_token_from_sonarcloud>

# 6. In sonar-project.properties, update:
sonar.organization=YOUR_SONARCLOUD_ORG
```

**Status:** Workflow exists, needs SONAR_TOKEN setup

---

### 1.6 Verify Snyk Integration (Optional)

**File:** `.github/workflows/snyk.yml` ✓ EXISTS

**What needs to be done (Optional):**
```bash
# 1. Go to Snyk: https://snyk.io
# 2. Sign up with GitHub
# 3. Connect this repository
# 4. Get SNYK_TOKEN
# 5. Add to GitHub repository secrets:
#    Name: SNYK_TOKEN
#    Value: <your_token_from_snyk>
```

**Status:** Workflow exists, optional setup

---

## Phase 2: Important (Should Do)

### 2.1 Create/Update README.md

**File:** `/vercel/share/v0-project/README.md`

Ensure it includes:

- [ ] **Project Description**
  - Feedo: A food delivery microservices application
  - Built with Node.js, Express, MongoDB
  - Demonstrates modern DevOps practices

- [ ] **Quick Start (Local)**
  ```bash
  docker compose up -d
  # Access frontend at http://localhost:3000
  # API Gateway at http://localhost:3001
  ```

- [ ] **Architecture Overview**
  - Link to `docs/ARCHITECTURE.md`
  - Brief description of services

- [ ] **Azure Deployment**
  - Link to `AZURE_DEPLOYMENT_GUIDE.md`
  - Quick steps

- [ ] **CI/CD Pipeline**
  - GitHub Actions automatically builds and tests
  - Images pushed to GHCR
  - Link to `.github/workflows/ci-cd.yml`

- [ ] **Security**
  - Link to `docs/SECURITY.md`
  - Highlights: JWT, bcrypt, secrets in Key Vault

- [ ] **Tech Stack**
  - Node.js 18
  - Express
  - MongoDB
  - Docker
  - Azure Container Apps

- [ ] **Contributing**
  - How to set up for development
  - Commit message conventions

**Status:** Need to verify/enhance

---

### 2.2 Update deployment/README.md

**File:** `deploy/README.md`

Add section for Azure Container Apps (currently focuses on AWS):

```markdown
## Azure Container Apps Deployment

For complete Azure deployment instructions, see: `AZURE_DEPLOYMENT_GUIDE.md`

### Quick Summary
1. Create resource group: `az group create --name rg-feedo-ctse --location eastus`
2. Create Container Apps environment
3. Deploy services using Azure CLI
4. Configure secrets in Key Vault
5. Enable HTTPS on public endpoints
```

**Status:** Should enhance with Azure focus

---

### 2.3 Create/Verify .dockerignore Files

**Files needed:**
- `.dockerignore` ✓ EXISTS (root)
- `api_gateway/.dockerignore` - MISSING
- `services/*/dockerignore` - Most missing

**Create them:**
```dockerfile
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.example
.DS_Store
dist
build
coverage
logs
```

**Status:** Should create for each service

---

### 2.4 Add API Gateway Health Check

Ensure API Gateway has health endpoint:

**File:** `api_gateway/server.js` (or main file)

Add this route:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});
```

**Status:** Verify it exists

---

## Phase 3: Nice to Have (Polish)

### 3.1 Create Architecture Diagram

**File:** `docs/ARCHITECTURE_DIAGRAM.md` (new file)

Include:
- Mermaid diagram (copy from AZURE_DEPLOYMENT_GUIDE.md)
- ASCII art representation
- Description of each service
- Communication paths
- Data flow

**Status:** Already in multiple places, should consolidate

---

### 3.2 Create Deployment Architecture Diagram

Show Azure infrastructure:
```
┌─────────────────────────────────────────────┐
│          Azure Resource Group               │
│         (rg-feedo-ctse)                     │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Container Apps Environment          │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │ Public (Ingress External)       │ │  │
│  │  │ - API Gateway (3001)            │ │  │
│  │  │ - Frontend (80/443)             │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │ Private (Ingress Internal)      │ │  │
│  │  │ - User Service (3001)           │ │  │
│  │  │ - Restaurant Service (3002)     │ │  │
│  │  │ - Order Service (3004)          │ │  │
│  │  │ - Delivery Service (3003)       │ │  │
│  │  │ - Notification Service (3005)   │ │  │
│  │  │ - Payment Service (3006)        │ │  │
│  │  └────────────────────────────────┘ │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Azure Key Vault                     │  │
│  │  - jwt-secret                        │  │
│  │  - mongo-uri                         │  │
│  │  - stripe-secret-key                 │  │
│  │  - smtp-credentials                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Networking (NSG)                    │  │
│  │  - Allow 443 from internet           │  │
│  │  - Internal service-to-service       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│     External: MongoDB Atlas / Cosmos DB     │
└─────────────────────────────────────────────┘
```

**Status:** Should create

---

### 3.3 Create Deployment Checklist

**File:** `DEPLOYMENT_CHECKLIST.md` (new)

Quick reference for deployment process.

**Status:** Already provided as part of CTSE_ASSIGNMENT_COMPLETION.md

---

### 3.4 Add Kubernetes Example (Optional)

For completeness, could add:
- `deploy/kubernetes/deployment.yaml` - Example K8s deployment

**Status:** Optional, already have Docker Compose and Azure

---

## Phase 4: Testing & Verification

### 4.1 Test Local Deployment

```bash
# 1. Build and run locally
docker compose build
docker compose up -d

# 2. Wait for services to start
sleep 30

# 3. Test health endpoints
curl http://localhost:3001/health
curl http://localhost:3000
curl http://localhost:3002/health
curl http://localhost:3003/health

# 4. Test user registration
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "name": "Test User"
  }'

# 5. Check logs for errors
docker compose logs -f

# 6. Clean up
docker compose down
```

**Expected Results:**
- ✓ All services start without errors
- ✓ Health endpoints return 200 OK
- ✓ User registration works
- ✓ No error logs

**Status:** Should test before submission

---

### 4.2 Test GitHub Actions

```bash
# 1. Push code to main branch
git add .
git commit -m "feat: final submission"
git push origin main

# 2. Go to Actions tab
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01/actions

# 3. Verify CI/CD workflow runs and passes
# 4. Check images pushed to GHCR
```

**Expected Results:**
- ✓ Workflow runs automatically
- ✓ All jobs pass (lint, test, build, push)
- ✓ Images appear in GHCR

**Status:** Should test before submission

---

### 4.3 Test Azure Deployment

Follow steps in `AZURE_DEPLOYMENT_GUIDE.md`

**Expected Results:**
- ✓ All services deployed and running
- ✓ API Gateway accessible from internet
- ✓ Services can communicate internally
- ✓ Frontend displays correctly

**Status:** Should test before submission

---

## Summary Checklist

### Critical (Must Do Before Submission)
- [ ] Repository is public on GitHub
- [ ] All Dockerfiles present and correct
- [ ] CI/CD workflow running and passing
- [ ] Docker images pushed to GHCR
- [ ] Services deployed to Azure
- [ ] Inter-service communication works
- [ ] API endpoints responding

### Important (Should Do)
- [ ] .env.example file created
- [ ] README.md complete and clear
- [ ] AZURE_DEPLOYMENT_GUIDE.md present
- [ ] CTSE_ASSIGNMENT_COMPLETION.md present
- [ ] Security practices documented
- [ ] Architecture diagram included

### Nice to Have
- [ ] Deployment architecture diagram
- [ ] Additional documentation
- [ ] Code comments explaining business logic
- [ ] Performance optimizations

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker build fails | Check Dockerfile syntax with `docker build .` |
| GHCR push fails | Verify GitHub token and image names |
| Azure deployment fails | Check Azure CLI commands and resource group exists |
| Services can't communicate | Verify service URLs in env vars match container app names |
| Frontend blank page | Check REACT_APP_API_URL points to correct gateway |

