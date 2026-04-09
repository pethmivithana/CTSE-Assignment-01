# CTSE Assignment - Copy-Paste Ready Commands

Use this guide to copy and paste commands directly. All commands are ready to use.

---

## Section 1: GitHub Setup

### 1.1 Push Code to GitHub

```bash
# Navigate to project
cd /path/to/CTSE-Assignment-01

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "feat: CTSE assignment submission - complete microservices with Docker and Azure deployment"

# Push to GitHub
git push origin main
```

### 1.2 Verify Repository is Public

```bash
# Replace YOUR_USERNAME with actual username
curl -s https://api.github.com/repos/YOUR_USERNAME/CTSE-Assignment-01 | grep "\"private\":"

# Expected output: "private": false
```

### 1.3 Add GitHub Secrets

```bash
# Go to GitHub repository settings:
# https://github.com/YOUR_USERNAME/CTSE-Assignment-01/settings/secrets/actions

# Add these secrets:
# Name: SONAR_TOKEN
# Value: (get from https://sonarcloud.io/account/security/)

# Name: SNYK_TOKEN  (optional)
# Value: (get from https://snyk.io)
```

---

## Section 2: Local Testing (Docker)

### 2.1 Build and Run Locally

```bash
# Navigate to project root
cd /path/to/CTSE-Assignment-01

# Build all images
docker compose build

# Start all services
docker compose up -d

# Wait for services to start
sleep 30

# Check if services are running
docker compose ps

# Expected: All services should be "Up"
```

### 2.2 Test Health Endpoints

```bash
# Test API Gateway
curl http://localhost:3001/health

# Expected: {"status":"ok"} or similar

# Test Frontend
curl http://localhost:3000

# Expected: Should return HTML content

# Test other services
curl http://localhost:3002/health  # Restaurant
curl http://localhost:3003/health  # Delivery
curl http://localhost:3004/health  # Order
curl http://localhost:3005/health  # Notification
curl http://localhost:3006/health  # Payment
```

### 2.3 View Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api-gateway
docker compose logs -f user-service
docker compose logs -f order-service

# Stop viewing logs: Press Ctrl+C
```

### 2.4 Stop and Cleanup

```bash
# Stop all services
docker compose down

# Remove all data (CAREFUL - deletes databases)
docker compose down -v

# Remove everything including images
docker compose down -v --remove-orphans
```

---

## Section 3: Azure Setup

### 3.1 Initial Azure Login and Resource Group

```bash
# Login to Azure
az login

# Check which subscription is active
az account show

# If multiple subscriptions, select one
az account set --subscription "SUBSCRIPTION_ID"

# Create resource group
az group create \
  --name rg-feedo-ctse \
  --location eastus

# Verify resource group created
az group list --query "[?name=='rg-feedo-ctse']"
```

### 3.2 Create Container Apps Environment

```bash
# Create environment
az containerapp env create \
  --name feedo-env \
  --resource-group rg-feedo-ctse \
  --location eastus

# Wait for creation to complete (2-3 minutes)
# Verify:
az containerapp env show \
  --name feedo-env \
  --resource-group rg-feedo-ctse
```

### 3.3 Create Key Vault and Add Secrets

```bash
# Create Key Vault
az keyvault create \
  --name feedo-vault-ctse \
  --resource-group rg-feedo-ctse \
  --location eastus

# Generate strong secrets (you'll need these)
JWT_SECRET=$(openssl rand -base64 32)
INTERNAL_API_KEY=$(openssl rand -base64 32)

echo "Save these values:"
echo "JWT_SECRET=$JWT_SECRET"
echo "INTERNAL_API_KEY=$INTERNAL_API_KEY"

# Add JWT Secret
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name jwt-secret \
  --value "$JWT_SECRET"

# Add Internal API Key
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name internal-api-key \
  --value "$INTERNAL_API_KEY"

# Add MongoDB URI (get from MongoDB Atlas)
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name mongo-uri \
  --value "mongodb+srv://username:password@cluster.mongodb.net/admin?retryWrites=true&w=majority"

# Add SMTP credentials
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name smtp-user \
  --value "your_email@gmail.com"

az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name smtp-pass \
  --value "your_app_specific_password"

# Add Stripe key
az keyvault secret set \
  --vault-name feedo-vault-ctse \
  --name stripe-secret-key \
  --value "sk_test_your_stripe_key"

# Verify secrets added
az keyvault secret list --vault-name feedo-vault-ctse --query "[].name"
```

---

## Section 4: Deploy Microservices

### 4.1 Create Managed Identity (Required for Key Vault access)

```bash
# Create identity
az identity create \
  --name feedo-identity \
  --resource-group rg-feedo-ctse

# Get identity principal ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name feedo-identity \
  --resource-group rg-feedo-ctse \
  --query principalId -o tsv)

echo "Principal ID: $IDENTITY_PRINCIPAL_ID"

# Grant Key Vault access
az keyvault set-policy \
  --name feedo-vault-ctse \
  --object-id $IDENTITY_PRINCIPAL_ID \
  --secret-permissions get list
```

### 4.2 Deploy User Service

```bash
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
    RESTAURANT_SERVICE_URL=http://feedo-restaurant-service
```

### 4.3 Deploy Restaurant Service

```bash
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
```

### 4.4 Deploy Order Service

```bash
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
```

### 4.5 Deploy Delivery Service

```bash
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
```

### 4.6 Deploy Notification Service

```bash
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
```

### 4.7 Deploy Payment Service

```bash
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

### 4.8 Deploy API Gateway (PUBLIC)

```bash
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

### 4.9 Deploy Frontend (PUBLIC)

```bash
# First, get the API Gateway URL
GATEWAY_URL=$(az containerapp show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

# Then deploy frontend
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

echo "Frontend deployed at: https://$GATEWAY_URL"
```

---

## Section 5: Verification Commands

### 5.1 Check Deployment Status

```bash
# List all container apps
az containerapp list \
  --resource-group rg-feedo-ctse \
  --query "[*].{Name:name, Status:properties.provisioningState}"

# Check specific app status
az containerapp show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.provisioningState

# Expected: "Succeeded"
```

### 5.2 Get Service URLs

```bash
# API Gateway URL
GATEWAY_URL=$(az containerapp show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "API Gateway: https://$GATEWAY_URL"

# Frontend URL
FRONTEND_URL=$(az containerapp show \
  --name feedo-frontend \
  --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Frontend: https://$FRONTEND_URL"

# Save to file
cat > azure-urls.txt << EOF
API Gateway: https://$GATEWAY_URL
Frontend: https://$FRONTEND_URL
EOF
```

### 5.3 Test APIs

```bash
# Replace with actual URL
GATEWAY_URL="https://feedo-api-gateway-XXXX.azurecontainerapps.io"

# Test health
curl $GATEWAY_URL/health

# Test user registration
curl -X POST $GATEWAY_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "name": "Test User"
  }'
```

### 5.4 View Container Logs

```bash
# API Gateway logs
az containerapp logs show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --follow

# Stop following: Ctrl+C

# Get last 50 lines
az containerapp logs show \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --tail 50
```

---

## Section 6: Cleanup (Only if removing everything)

### 6.1 Delete Specific Services

```bash
# Delete one app
az containerapp delete \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse

# Delete multiple apps
for app in feedo-api-gateway feedo-user-service feedo-order-service; do
  az containerapp delete --name $app --resource-group rg-feedo-ctse
done
```

### 6.2 Delete Entire Resource Group (CAREFUL!)

```bash
# This deletes EVERYTHING - use only when completely done
az group delete \
  --name rg-feedo-ctse \
  --yes --no-wait
```

---

## Section 7: Troubleshooting Commands

### 7.1 Check Docker Image Exists

```bash
# Check if image is in GHCR
docker pull ghcr.io/YOUR_USERNAME/feedo-api-gateway:latest

# If it fails, check GitHub Actions to see if build passed
```

### 7.2 Check Azure Connectivity

```bash
# Test Azure CLI connection
az account show

# List resource groups
az group list --query "[].name"

# Check if container apps are accessible
az containerapp list --resource-group rg-feedo-ctse
```

### 7.3 Rebuild Failed Service

```bash
# Delete and recreate
az containerapp delete --name feedo-api-gateway --resource-group rg-feedo-ctse --yes

# Wait 30 seconds

# Recreate with correct settings
# (Use command from Section 4.8 above)
```

### 7.4 Update Environment Variables

```bash
# Update env vars for existing container app
az containerapp update \
  --name feedo-api-gateway \
  --resource-group rg-feedo-ctse \
  --set-env-vars \
    KEY1=value1 \
    KEY2=value2
```

---

## Section 8: Quick Reference

### Useful Variables (Save these)

```bash
# Save your GitHub username
GITHUB_USERNAME="your_username_here"

# Save your Azure resource group
RESOURCE_GROUP="rg-feedo-ctse"

# Save your container environment
CONTAINER_ENV="feedo-env"

# Save your Key Vault name
KEY_VAULT="feedo-vault-ctse"

# Use in commands
az containerapp list --resource-group $RESOURCE_GROUP
az keyvault secret list --vault-name $KEY_VAULT
```

### Common Issues Quick Fixes

```bash
# Services can't communicate? Check internal URLs
az containerapp show --name feedo-order-service --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn

# Image not found? Push to GHCR
docker tag feedo-api-gateway ghcr.io/$GITHUB_USERNAME/feedo-api-gateway:latest
docker push ghcr.io/$GITHUB_USERNAME/feedo-api-gateway:latest

# Secrets not working? Check Key Vault permissions
az keyvault set-policy --name $KEY_VAULT --object-id $IDENTITY_PRINCIPAL_ID \
  --secret-permissions get list
```

---

## Final Checklist Commands

```bash
# Run all verification in sequence
echo "1. Checking repository..."
curl -s https://api.github.com/repos/$GITHUB_USERNAME/CTSE-Assignment-01 | grep "\"private\""

echo "2. Checking Azure resources..."
az group show --name rg-feedo-ctse --query name

echo "3. Checking container apps..."
az containerapp list --resource-group rg-feedo-ctse --query "[].name"

echo "4. Checking Key Vault..."
az keyvault secret list --vault-name feedo-vault-ctse --query "[].name"

echo "5. Getting deployment URLs..."
az containerapp show --name feedo-api-gateway --resource-group rg-feedo-ctse \
  --query properties.configuration.ingress.fqdn

echo "✓ All checks complete!"
```

---

**TIP:** Save this file for reference during deployment. All commands are copy-paste ready!

