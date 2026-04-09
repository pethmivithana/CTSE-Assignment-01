# CTSE Assignment 1 - Quick Start Guide

**For the Student:** Follow this guide step-by-step to complete and submit your assignment.

---

## TL;DR - What You Have

✓ **Microservices Architecture** - 8 services working together
✓ **Docker Setup** - All services containerized with correct Dockerfiles
✓ **CI/CD Pipeline** - GitHub Actions auto-builds and tests
✓ **Cloud Ready** - Deployment guide for Azure
✓ **Security** - JWT auth, Key Vault, HTTPS
✓ **Documentation** - Complete guides and templates

---

## Step 1: Make Repository Public (5 minutes)

```bash
# Go to GitHub Settings
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01/settings

# Find "Danger Zone" section at bottom
# Click "Make this repository public"

# Verify:
curl https://api.github.com/repos/YOUR_USERNAME/CTSE-Assignment-01 | grep private
# Should show: "private": false
```

**Why:** Assignment requires public repository for graders to access code.

---

## Step 2: Test Locally (10 minutes)

```bash
# Navigate to project
cd /vercel/share/v0-project

# Start all services
docker compose up -d

# Wait 30 seconds for MongoDB to start
sleep 30

# Test health endpoints
curl http://localhost:3001/health           # API Gateway
curl http://localhost:3000                  # Frontend (should return HTML)

# View logs for errors
docker compose logs -f api-gateway

# Stop when done
docker compose down
```

**Expected:** All services start without errors, health endpoints respond.

**Status:** ✓ Everything should work

---

## Step 3: Push to GitHub (5 minutes)

```bash
# Check what's changed
git status

# Add all changes
git add .

# Commit with meaningful message
git commit -m "feat: CTSE assignment - complete microservices with Docker and Azure deployment"

# Push to GitHub
git push origin main

# Verify on GitHub
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01
```

**Watch CI/CD Pipeline:**
1. Go to Actions tab
2. Should see "CI/CD" workflow running
3. Wait 5-10 minutes for it to complete
4. All checks should be green ✓

---

## Step 4: Setup Azure (20 minutes)

### 4.1 Create Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-feedo-ctse --location eastus

# Create Container Apps environment
az containerapp env create \
  --name feedo-env \
  --resource-group rg-feedo-ctse \
  --location eastus

# Create Key Vault
az keyvault create \
  --name feedo-vault-ctse \
  --resource-group rg-feedo-ctse \
  --location eastus
```

### 4.2 Add Secrets

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 32)
INTERNAL_API_KEY=$(openssl rand -base64 32)

echo "Your JWT_SECRET: $JWT_SECRET"
echo "Your INTERNAL_API_KEY: $INTERNAL_API_KEY"

# Add to Key Vault
az keyvault secret set --vault-name feedo-vault-ctse --name jwt-secret --value "$JWT_SECRET"
az keyvault secret set --vault-name feedo-vault-ctse --name internal-api-key --value "$INTERNAL_API_KEY"

# Add other secrets
az keyvault secret set --vault-name feedo-vault-ctse --name mongo-uri \
  --value "mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/admin?retryWrites=true&w=majority"

az keyvault secret set --vault-name feedo-vault-ctse --name smtp-user --value "your_email@gmail.com"
az keyvault secret set --vault-name feedo-vault-ctse --name smtp-pass --value "your_app_password"
```

### 4.3 Deploy Services

**Use the full guide:** See `AZURE_DEPLOYMENT_GUIDE.md` Phase 3 for detailed commands.

Quick summary:
```bash
# Deploy each service (examples):
az containerapp create --name feedo-user-service --resource-group rg-feedo-ctse ...
az containerapp create --name feedo-order-service --resource-group rg-feedo-ctse ...
# ... (continue for all services and frontend)
```

**Pro Tip:** Copy-paste commands from `AZURE_DEPLOYMENT_GUIDE.md` - they're ready to use!

---

## Step 5: Verify Deployment (5 minutes)

```bash
# List all deployed services
az containerapp list --resource-group rg-feedo-ctse \
  --query "[*].{Name:name, Status:properties.provisioningState}"

# Get API Gateway URL
GATEWAY_URL=$(az containerapp show --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

# Test API Gateway
curl https://$GATEWAY_URL/health

# Open frontend in browser
FRONTEND_URL=$(az containerapp show --name feedo-frontend \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Frontend: https://$FRONTEND_URL"
echo "API: https://$GATEWAY_URL"
```

**Expected:** Both URLs respond with 200 OK, frontend loads in browser.

---

## Step 6: Create Assignment Report (30 minutes)

### Using the Template

```bash
# The template is already prepared:
# docs/CTSE_ASSIGNMENT_REPORT_TEMPLATE.md

# Create your report by filling in sections:
# 1. Architecture Diagram (copy from AZURE_DEPLOYMENT_GUIDE.md)
# 2. Your Assigned Service Description
# 3. Inter-service Communication Example
# 4. DevOps Implementation
# 5. Security Measures
# 6. Challenges & Solutions
```

### What to Include

**Must Include:**
- ✓ Architecture diagram (ASCII, Mermaid, or Visio)
- ✓ Service description (your assigned microservice)
- ✓ How services communicate with example
- ✓ DevOps practices used
- ✓ Security implementation

**Should Include:**
- ✓ Screenshots of GitHub Actions
- ✓ Screenshot of Azure deployment
- ✓ Running application proof
- ✓ Code snippets showing best practices

**Nice to Have:**
- ✓ Performance metrics
- ✓ SonarCloud results
- ✓ Deployment time measurements

---

## Step 7: Prepare for 10-Minute Viva (30 minutes)

### Practice These Demonstrations

```
Timing: 10 minutes total
- 0:00-1:00 - Explain architecture
- 1:00-2:00 - Show GitHub repository
- 2:00-3:00 - Show deployed Azure services
- 3:00-5:00 - Demonstrate inter-service communication
- 5:00-7:00 - Explain security implementation
- 7:00-10:00 - Code walkthrough and questions
```

### Have These Ready

1. **GitHub Repository**
   - URL: https://github.com/YOUR_USERNAME/CTSE-Assignment-01
   - Show: Code, Dockerfiles, CI/CD workflow
   - Click: Actions → See successful CI/CD runs

2. **Azure Deployed Application**
   - API Gateway URL: https://feedo-api-gateway-XXXX.azurecontainerapps.io
   - Frontend URL: https://feedo-frontend-XXXX.azurecontainerapps.io
   - Show: Services running in Azure Portal

3. **Inter-Service Communication**
   - Example: Place an order, see notification sent
   - Show: Logs proving service calls
   - Explain: Order → Delivery → Notification flow

4. **Security Features**
   - Show: Azure Key Vault (without showing secrets)
   - Explain: JWT validation in API Gateway
   - Point out: HTTPS on public endpoints

5. **Code Explanation**
   - Explain your assigned microservice
   - Show: Key endpoints and logic
   - Demonstrate: How it integrates with others

---

## File Reference

### Critical Files (Already Created)

| File | Purpose | Status |
|------|---------|--------|
| `AZURE_DEPLOYMENT_GUIDE.md` | Complete Azure deployment steps | ✓ Created |
| `CTSE_ASSIGNMENT_COMPLETION.md` | Full assignment checklist | ✓ Created |
| `MODIFICATIONS_NEEDED.md` | List of required changes | ✓ Created |
| `api_gateway/Dockerfile` | Missing Dockerfile | ✓ Created |
| `.env.example` | Environment variables template | ✓ Created |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline | ✓ Exists |
| `docker-compose.yml` | Local development setup | ✓ Exists |
| `docs/ARCHITECTURE.md` | Architecture documentation | ✓ Exists |
| `docs/SECURITY.md` | Security implementation | ✓ Exists |
| `docs/DEPLOYMENT_AND_DEVOPS.md` | DevOps practices | ✓ Exists |

### Configuration Files

```
.dockerignore              # Docker build exclusions
.env.development.local     # Local development secrets (DO NOT COMMIT)
.env.example              # Environment template (COMMIT THIS)
.gitignore                # Git exclusions
docker-compose.yml        # Local Docker setup
sonar-project.properties  # SonarCloud configuration
```

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Docker Compose fails to start | Check Docker is running: `docker ps`. Stop other instances: `docker compose down` |
| Services can't connect | Verify service names in docker-compose.yml match URLs in env vars |
| GHCR push fails in CI/CD | Verify repository is public and GitHub token has correct permissions |
| Azure deployment fails | Check Azure CLI is logged in: `az account show`. Verify quotas. |
| Frontend shows blank page | Check REACT_APP_API_URL points to correct gateway URL |
| Secrets not working in Azure | Verify Key Vault reference syntax in container app |

---

## Verification Checklist (Before Submission)

```bash
# 1. Local test passes
docker compose build && docker compose up -d
# ... test works ...
docker compose down

# 2. GitHub repository is public
curl https://api.github.com/repos/YOUR_USERNAME/CTSE-Assignment-01 | grep "\"private\": false"

# 3. CI/CD pipeline passes
# Check: https://github.com/YOUR_USERNAME/CTSE-Assignment-01/actions
# Should show: All green checks ✓

# 4. Images in GHCR
docker pull ghcr.io/YOUR_USERNAME/feedo-api-gateway:latest
# Should succeed without errors

# 5. Azure deployment works
az containerapp list --resource-group rg-feedo-ctse
# Should list 8 container apps

# 6. Services respond
GATEWAY_URL=$(az containerapp show --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)
curl https://$GATEWAY_URL/health
# Should return: {"status":"ok"}

# 7. Report is complete
# Check: Report includes all required sections
# Check: Screenshots are included
# Check: Professional formatting
```

---

## Submission Checklist

- [ ] Repository is PUBLIC on GitHub
- [ ] All code is pushed to main branch
- [ ] CI/CD workflow shows green ✓
- [ ] Images are in GHCR (ghcr.io/username/feedo-*)
- [ ] Services deployed to Azure and working
- [ ] Assignment report is complete and professional
- [ ] Architecture diagram is included
- [ ] Security measures are documented
- [ ] Inter-service communication is demonstrated
- [ ] Ready for 10-minute viva

---

## Quick Links

| Link | Purpose |
|------|---------|
| GitHub: https://github.com/YOUR_USERNAME/CTSE-Assignment-01 | Your repository |
| Azure Portal: https://portal.azure.com | Cloud resources |
| GitHub Actions: `Your-Repo → Actions tab` | CI/CD pipeline status |
| GHCR: https://ghcr.io/YOUR_USERNAME | Container images |
| SonarCloud: https://sonarcloud.io | Code quality analysis |
| MongoDB Atlas: https://cloud.mongodb.com | Database |

---

## Next Steps (In Order)

1. **NOW:** Make repository public (Step 1)
2. **NEXT:** Test locally (Step 2)
3. **THEN:** Push to GitHub and watch CI/CD (Step 3)
4. **AFTER:** Deploy to Azure (Step 4)
5. **MEANWHILE:** Create assignment report (Step 6)
6. **FINALLY:** Prepare for viva (Step 7)

---

## Need Help?

| Issue | See |
|-------|-----|
| Docker commands | `README-DOCKER.md` |
| Azure deployment | `AZURE_DEPLOYMENT_GUIDE.md` |
| Assignment requirements | `CTSE_ASSIGNMENT_COMPLETION.md` |
| What to change | `MODIFICATIONS_NEEDED.md` |
| Architecture questions | `docs/ARCHITECTURE.md` |
| Security questions | `docs/SECURITY.md` |
| Report template | `docs/CTSE_ASSIGNMENT_REPORT_TEMPLATE.md` |

---

**Good Luck! You've got a great foundation to build on. Follow the steps above and you'll have a complete, professional microservices deployment ready for your viva!**

