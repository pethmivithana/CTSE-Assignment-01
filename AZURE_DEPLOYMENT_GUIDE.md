# Azure Deployment Guide for Feedo (CTSE Assignment 1)

## Complete Step-by-Step Instructions

This guide provides detailed steps to deploy the Feedo microservices application to Azure and fulfill all CTSE Assignment 1 requirements.

---

## Phase 1: Pre-Deployment Setup

### 1.1 Prerequisites

- Azure subscription (use free tier/student credits)
- Azure CLI installed (`az --version` to verify)
- Docker Desktop installed
- GitHub account with repository (public)
- GitHub Container Registry (GHCR) with images pushed

### 1.2 Verify CI/CD Pipeline

Before deploying to Azure, ensure GitHub Actions CI/CD pipeline is working:

```bash
# 1. Go to your GitHub repository
# 2. Navigate to Actions tab
# 3. Check that the "CI/CD" workflow has run and passed
# 4. Verify images are pushed to GHCR:
#    ghcr.io/YOUR_USERNAME/feedo-api-gateway:latest
#    ghcr.io/YOUR_USERNAME/feedo-user-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-restaurant-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-order-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-delivery-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-notification-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-payment-service:latest
#    ghcr.io/YOUR_USERNAME/feedo-frontend:latest
```

### 1.3 Docker Files Validation

All Docker files follow best practices:

| Service | File | Status | Notes |
|---------|------|--------|-------|
| User Service | `services/user-service/Dockerfile` | ✓ Correct | Node 18-alpine, multi-stage ready |
| Restaurant Service | `services/restaurant-service/Dockerfile` | ✓ Correct | Node 18-alpine |
| Order Service | `services/order-service/Dockerfile` | ✓ Correct | Node 18-alpine |
| Delivery Service | `services/delivery-service/Dockerfile` | ✓ Correct | Node 18-alpine |
| Notification Service | `services/notification-service/Dockerfile` | ✓ Correct | Node 18-alpine |
| Payment Service | `services/payment-service/Dockerfile` | ✓ Correct | Node 18-alpine |
| Frontend | `food-delivery-frontend/Dockerfile` | ✓ Correct | Multi-stage Nginx build |

All Dockerfiles use best practices:
- ✓ Alpine base images (lightweight, secure)
- ✓ Production dependencies only (`--production` flag)
- ✓ Proper EXPOSE declarations
- ✓ Non-root user execution (should be verified in code)

---

## Phase 2: Azure Setup

### 2.1 Create Azure Resources

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create \
  --name rg-feedo-ctse \
  --location eastus

# Create Container Registry (optional - can use GHCR)
az acr create \
  --resource-group rg-feedo-ctse \
  --name feedoctse \
  --sku Basic

# Create Container Apps environment
az containerapp env create \
  --name feedo-env \
  --resource-group rg-feedo-ctse \
  --location eastus
```

### 2.2 Setup Key Vault for Secrets

```bash
# Create Key Vault
az keyvault create \
  --name feedo-vault-ctse \
  --resource-group rg-feedo-ctse \
  --location eastus

# Add secrets
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name jwt-secret \
  --value "YOUR_STRONG_JWT_SECRET_HERE_MIN_32_CHARS"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name internal-api-key \
  --value "YOUR_INTERNAL_API_KEY_HERE_MIN_32_CHARS"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name mongo-uri \
  --value "mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/admin?retryWrites=true&w=majority"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name smtp-user \
  --value "YOUR_EMAIL@gmail.com"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name smtp-pass \
  --value "YOUR_APP_SPECIFIC_PASSWORD"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name stripe-secret-key \
  --value "sk_test_YOUR_STRIPE_KEY"
```

### 2.3 Setup MongoDB (Choose One)

#### Option A: MongoDB Atlas (Recommended for free tier)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free tier cluster
3. Create a database user
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/admin?retryWrites=true&w=majority`
5. Store in Key Vault as shown above

#### Option B: Azure Cosmos DB with MongoDB API
```bash
az cosmosdb create \
  --name feedo-cosmos \
  --resource-group rg-feedo-ctse \
  --kind MongoDB \
  --locations regionName=eastus
```

---

## Phase 3: Deploy Microservices to Azure Container Apps

### 3.1 Create Managed Identity

```bash
az identity create \
  --name feedo-identity \
  --resource-group rg-feedo-ctse

# Get the principal ID for role assignment
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name feedo-identity \
  --resource-group rg-feedo-ctse \
  --query principalId -o tsv)
```

### 3.2 Grant Key Vault Access

```bash
az keyvault set-policy \
  --name feedo-vault-ctse \
  --object-id $IDENTITY_PRINCIPAL_ID \
  --secret-permissions get list
```

### 3.3 Deploy MongoDB (if using Cosmos DB)

```bash
# Get connection string
MONGO_URI=$(az cosmosdb keys list \
  --name feedo-cosmos \
  --resource-group rg-feedo-ctse \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

# Save to Key Vault
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name mongo-uri \
  --value "$MONGO_URI"
```

### 3.4 Deploy MongoDB Container App (Alternative: Run as Container App)

```bash
az containerapp create \
  --name feedo-mongodb \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image mongo:7 \
  --cpu 0.5 \
  --memory 1 \
  --expose-port 27017 \
  --target-port 27017 \
  --ingress internal \
  --environment-variables MONGO_INITDB_ROOT_USERNAME=admin MONGO_INITDB_ROOT_PASSWORD=password123
```

### 3.5 Deploy User Service

```bash
# Using GHCR (GitHub Container Registry)
az containerapp create \
  --name feedo-user-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-user-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3001 \
  --env-vars \
    PORT=3001 \
    JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/jwt-secret/) \
    MONGO_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    ORDER_SERVICE_URL=http://feedo-order-service \
    RESTAURANT_SERVICE_URL=http://feedo-restaurant-service \
    SMTP_HOST=smtp.gmail.com \
    SMTP_PORT=587 \
    SMTP_SECURE=false \
    SMTP_USER=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/smtp-user/) \
    SMTP_PASS=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/smtp-pass/) \
    APP_URL=https://YOUR_GATEWAY_URL
```

### 3.6 Deploy Other Services (Order, Restaurant, Delivery, Notification, Payment)

Repeat the pattern for each service:

```bash
# Order Service
az containerapp create \
  --name feedo-order-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-order-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3004 \
  --env-vars \
    PORT=3004 \
    MONGO_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    USER_SERVICE_URL=http://feedo-user-service \
    RESTAURANT_SERVICE_URL=http://feedo-restaurant-service \
    DELIVERY_SERVICE_URL=http://feedo-delivery-service \
    NOTIFICATION_SERVICE_URL=http://feedo-notification-service \
    JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/jwt-secret/) \
    INTERNAL_API_KEY=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/internal-api-key/)

# Restaurant Service
az containerapp create \
  --name feedo-restaurant-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-restaurant-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3002 \
  --env-vars \
    PORT=3002 \
    MONGODB_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    ORDER_SERVICE_URL=http://feedo-order-service

# Delivery Service
az containerapp create \
  --name feedo-delivery-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-delivery-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3003 \
  --env-vars \
    PORT=3003 \
    NODE_ENV=production \
    MONGODB_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/jwt-secret/) \
    USER_SERVICE_URL=http://feedo-user-service \
    RESTAURANT_SERVICE_URL=http://feedo-restaurant-service \
    ORDER_SERVICE_URL=http://feedo-order-service \
    NOTIFICATION_SERVICE_URL=http://feedo-notification-service \
    INTERNAL_API_KEY=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/internal-api-key/)

# Notification Service
az containerapp create \
  --name feedo-notification-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-notification-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3005 \
  --env-vars \
    PORT=3005 \
    JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/jwt-secret/) \
    MONGODB_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    APP_URL=https://YOUR_GATEWAY_URL \
    SMTP_HOST=smtp.gmail.com \
    SMTP_PORT=587 \
    SMTP_SECURE=false \
    SMTP_USER=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/smtp-user/) \
    SMTP_PASS=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/smtp-pass/)

# Payment Service
az containerapp create \
  --name feedo-payment-service \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-payment-service:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress internal \
  --target-port 3006 \
  --env-vars \
    PORT=3006 \
    MONGO_URI=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/mongo-uri/) \
    STRIPE_SECRET_KEY=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/stripe-secret-key/) \
    ORDER_SERVICE_URL=http://feedo-order-service \
    NOTIFICATION_SERVICE_URL=http://feedo-notification-service \
    INTERNAL_API_KEY=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/internal-api-key/)
```

### 3.7 Deploy API Gateway (Public)

```bash
# Get one service URL to use as reference
FIRST_SERVICE_URL=$(az containerapp show \
  --name feedo-user-service \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

az containerapp create \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-api-gateway:latest \
  --cpu 0.5 \
  --memory 1.0 \
  --ingress external \
  --target-port 3001 \
  --env-vars \
    PORT=3001 \
    USER_SERVICE_URL=http://feedo-user-service \
    RESTAURANT_SERVICE_URL=http://feedo-restaurant-service \
    ORDER_SERVICE_URL=http://feedo-order-service \
    DELIVERY_SERVICE_URL=http://feedo-delivery-service \
    NOTIFICATION_SERVICE_URL=http://feedo-notification-service \
    PAYMENT_SERVICE_URL=http://feedo-payment-service \
    JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://feedo-vault-ctse.vault.azure.net/secrets/jwt-secret/)
```

### 3.8 Deploy Frontend (Public)

```bash
# Get API Gateway URL
GATEWAY_URL=$(az containerapp show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

az containerapp create \
  --name feedo-frontend \
  --resource-group rg-feedo-ctse \
  --environment feedo-env \
  --image ghcr.io/YOUR_USERNAME/feedo-frontend:latest \
  --cpu 0.5 \
  --memory 0.5 \
  --ingress external \
  --target-port 80 \
  --env-vars \
    REACT_APP_API_URL=https://$GATEWAY_URL
```

---

## Phase 4: Configuration & Security

### 4.1 Configure Azure Network Security

```bash
# Create Network Security Group
az network nsg create \
  --name feedo-nsg \
  --resource-group rg-feedo-ctse

# Allow HTTPS inbound for public services
az network nsg rule create \
  --name AllowHTTPS \
  --nsg-name feedo-nsg \
  --resource-group rg-feedo-ctse \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "*" \
  --source-port-ranges "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 443
```

### 4.2 Enable HTTPS for API Gateway

```bash
# Create custom domain (if you have one)
# This requires DNS configuration on your domain registrar

az containerapp hostname bind \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --hostname api.yourdomain.com
```

### 4.3 Setup Application Insights (Monitoring)

```bash
az monitor app-insights component create \
  --app feedo-insights \
  --location eastus \
  --resource-group rg-feedo-ctse

# Get instrumentation key
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app feedo-insights \
  --resource-group rg-feedo-ctse \
  --query instrumentationKey -o tsv)

# Add to each container app for monitoring
az containerapp update \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --env-vars APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY
```

---

## Phase 5: Verify Deployment

### 5.1 Check Container Apps Status

```bash
# List all deployed apps
az containerapp list \
  --resource-group rg-feedo-ctse \
  --query "[*].{Name:name, Status:properties.provisioningState, URL:properties.configuration.ingress.fqdn}"

# Check specific app logs
az containerapp logs show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --follow
```

### 5.2 Test Service Health

```bash
# Get API Gateway URL
GATEWAY_URL=$(az containerapp show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

# Test health endpoint
curl https://$GATEWAY_URL/health

# Expected response: {"status":"ok"}
```

### 5.3 Test Inter-service Communication

```bash
# Create a test order to verify services communicate
curl -X POST https://$GATEWAY_URL/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "test-user",
    "restaurantId": "test-restaurant",
    "items": [{"itemId": "item1", "quantity": 2}],
    "deliveryAddress": "123 Main St"
  }'
```

---

## Phase 6: Security & DevSecOps

### 6.1 Enable SonarCloud Analysis

1. Go to [SonarCloud](https://sonarcloud.io)
2. Sign in with GitHub
3. Create organization
4. Import this repository
5. Get SONAR_TOKEN from your SonarCloud account
6. Add to GitHub repository secrets:
   - Settings → Secrets and variables → Actions
   - Add `SONAR_TOKEN`

### 6.2 Enable Snyk Analysis

1. Go to [Snyk](https://snyk.io)
2. Sign in with GitHub
3. Connect repository
4. Get SNYK_TOKEN
5. Add to GitHub repository secrets

### 6.3 Verify Security Best Practices

Check that the following are implemented:

- ✓ **JWT Authentication** — API Gateway validates tokens
- ✓ **Secrets in Key Vault** — No secrets in code or env files
- ✓ **HTTPS/TLS** — All public endpoints use HTTPS
- ✓ **Network Security** — Internal services use private ingress
- ✓ **Least Privilege** — Each service has minimal permissions
- ✓ **SAST Integration** — SonarCloud/Snyk configured

---

## Phase 7: Documentation for Assignment Report

### 7.1 Architecture Diagram

```
                    ┌──────────────┐
                    │  Frontend    │
                    │ (React/Nginx)│
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼────────┐
                    │ API Gateway   │  (Public)
                    │ Container App │
                    └──────┬────────┘
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────────┐  ┌──────────────┐  ┌────────────┐
    │   User      │  │ Restaurant   │  │   Order    │
    │  Service    │  │   Service    │  │  Service   │
    │ (Internal)  │  │ (Internal)   │  │ (Internal) │
    └─────────────┘  └──────────────┘  └─────┬──────┘
         │                │                   │
         └────────────────┼───────────────────┘
                          │
                    ┌─────▼──────┐
                    │  Delivery  │
                    │  Service   │
                    └─────┬──────┘
                          │
                    ┌─────▼────────────────┐
                    │ Notification Service │
                    │ Payment Service      │
                    └──────────────────────┘
                          │
                    ┌─────▼──────────┐
                    │  MongoDB/Cosmos│
                    │      DB        │
                    └────────────────┘

All services in Azure Container Apps with Key Vault secrets
```

### 7.2 CI/CD Pipeline Summary

```
GitHub Repository
    ↓
Pull Request / Push to main
    ↓
GitHub Actions (CI/CD Workflow)
    ↓
├─ Build & Test (npm ci, npm test)
├─ Docker Build (verify Dockerfile)
├─ SonarCloud Analysis (SAST)
├─ Snyk Security Scan (Dependencies)
    ↓ (only on push to main)
├─ Push to GHCR (GitHub Container Registry)
    ↓
Azure Container Apps
    ↓
Live Production Environment
```

### 7.3 Security Implementation Checklist

- [ ] JWT tokens validated at API Gateway
- [ ] Passwords hashed with bcrypt
- [ ] All secrets stored in Azure Key Vault
- [ ] HTTPS/TLS enabled on public endpoints
- [ ] Internal services use private ingress
- [ ] SonarCloud integrated for code quality
- [ ] Snyk integrated for dependency scanning
- [ ] IAM roles follow least privilege principle
- [ ] MongoDB data encrypted at rest
- [ ] Network Security Groups configured

---

## Phase 8: Cleanup & Cost Management

```bash
# Delete entire resource group (WARNING: Deletes everything)
az group delete --name rg-feedo-ctse --yes

# Or delete individual resources
az containerapp delete --name feedo-api-gateway --resource-group rg-feedo-ctse
az keyvault delete --name feedo-vault-ctse --resource-group rg-feedo-ctse

# Check remaining resources and costs
az resource list --resource-group rg-feedo-ctse
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container fails to start | Check logs: `az containerapp logs show --name SERVICE --resource-group rg-feedo-ctse --follow` |
| Services can't communicate | Verify internal ingress is enabled; check container app names match in env vars |
| Key Vault access denied | Verify managed identity has proper permissions with `az keyvault set-policy` |
| GHCR image pull fails | Check image exists: `docker pull ghcr.io/YOUR_USERNAME/feedo-api-gateway:latest` |
| MongoDB connection fails | Verify MongoDB URI in Key Vault and firewall rules allow Azure connections |
| Frontend blank page | Check REACT_APP_API_URL points to correct gateway URL |

---

## Assignment Submission Checklist

- [ ] All 6+ microservices deployed to Azure
- [ ] Services communicate with each other (at least 1 integration demonstrated)
- [ ] CI/CD pipeline running automatically on GitHub
- [ ] Docker images pushed to GHCR
- [ ] SonarCloud/Snyk security scanning enabled
- [ ] All secrets in Key Vault (not in code)
- [ ] HTTPS enabled on public endpoints
- [ ] Architecture diagram included in report
- [ ] README documents all deployment steps
- [ ] GitHub repository is public
- [ ] Application is internet-accessible and working

