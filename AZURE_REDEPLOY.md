# Azure Redeployment Instructions

## What Was Fixed

1. **API Gateway now has a root `/` endpoint** - returns status and available endpoints
2. **API Gateway CORS updated** - allows Azure Container Apps domains
3. **Frontend Dockerfile API_URL fixed** - changed from port 3001 to 5001
4. **Frontend API URL in code** - updated to use correct gateway port

---

## Step 1: Rebuild and Push Images to Azure Container Registry

**Windows PowerShell:**

```powershell
# Set variables
$REGISTRY = "feedoregistry"
$LOCATION = "eastus"

# Get registry login server
$REGISTRY_SERVER = (az acr show --resource-group feedo-rg --name $REGISTRY --query loginServer --output tsv)
Write-Host "Registry: $REGISTRY_SERVER"

# Login
az acr login --name $REGISTRY

# Build and push API Gateway
docker build -t $REGISTRY_SERVER/feedo-api-gateway:latest ./api_gateway
docker push $REGISTRY_SERVER/feedo-api-gateway:latest

# Build and push Frontend (with correct API URL)
docker build -t $REGISTRY_SERVER/feedo-frontend:latest `
  --build-arg REACT_APP_API_URL=https://feedo-api-gateway.lemonriver-0aacffa9.centralindia.azurecontainerapps.io `
  ./food-delivery-frontend
docker push $REGISTRY_SERVER/feedo-frontend:latest

# Build and push other services (if they have changes)
docker build -t $REGISTRY_SERVER/feedo-user-service:latest ./services/user-service
docker push $REGISTRY_SERVER/feedo-user-service:latest
```

---

## Step 2: Update Container Apps with New Images

```powershell
# Update API Gateway
az containerapp update --name feedo-api-gateway --resource-group feedo-rg --image $REGISTRY_SERVER/feedo-api-gateway:latest

# Update Frontend  
az containerapp update --name feedo-frontend --resource-group feedo-rg --image $REGISTRY_SERVER/feedo-frontend:latest

# Update User Service
az containerapp update --name feedo-user-service --resource-group feedo-rg --image $REGISTRY_SERVER/feedo-user-service:latest
```

---

## Step 3: Verify Deployments

```powershell
# Get API Gateway URL
$API_GW = (az containerapp show --name feedo-api-gateway --resource-group feedo-rg --query properties.configuration.ingress.fqdn --output tsv)
Write-Host "API Gateway: https://$API_GW"

# Get Frontend URL
$FRONTEND = (az containerapp show --name feedo-frontend --resource-group feedo-rg --query properties.configuration.ingress.fqdn --output tsv)
Write-Host "Frontend: https://$FRONTEND"

# Test API Gateway root endpoint
$response = curl "https://$API_GW/" 
Write-Host $response

# Test health endpoint
$health = curl "https://$API_GW/health"
Write-Host $health
```

---

## Step 4: Update Frontend Environment Variable (if needed)

If your API Gateway URL changes, update the environment variable:

```powershell
az containerapp update --name feedo-frontend --resource-group feedo-rg `
  --set-env-vars REACT_APP_API_URL=https://$API_GW
```

---

## Step 5: Verify Everything Works

### Test API Gateway
```bash
# Should return JSON with available endpoints
curl https://feedo-api-gateway.lemonriver-0aacffa9.centralindia.azurecontainerapps.io/

# Should return health status
curl https://feedo-api-gateway.lemonriver-0aacffa9.centralindia.azurecontainerapps.io/health
```

### Test Frontend
```bash
# Should load the React app
curl https://feedo-frontend.lemonriver-0aacffa9.centralindia.azurecontainerapps.io/
```

### Test in Browser
1. Open: https://feedo-frontend.lemonriver-0aacffa9.centralindia.azurecontainerapps.io
2. Try to Sign Up or Login
3. Open DevTools (F12) → Network tab
4. Check that API calls go to the correct Azure API Gateway domain
5. Should NOT see localhost in any requests

---

## Troubleshooting

### Frontend Still Loading
- Check browser console (F12) for errors
- Verify API_URL is passed correctly: `console.log(process.env.REACT_APP_API_URL)`
- Check Network tab - where are requests going?

### API Gateway Returns 404
- Test: `curl https://your-api-gateway-url/health`
- Should return JSON, not HTML
- If HTML, the container isn't responding correctly

### CORS Errors
- Check browser console for "Access-Control-Allow-Origin" errors
- These mean the API Gateway isn't allowing requests from your frontend domain
- Update CORS in api_gateway/app.js if needed

### Container Not Starting
```bash
# Check logs
az containerapp logs show --name feedo-api-gateway --resource-group feedo-rg --follow

az containerapp logs show --name feedo-frontend --resource-group feedo-rg --follow
```

---

## Quick Commands Reference

```powershell
# Get all Container App URLs
az containerapp list --resource-group feedo-rg --query "[].{name:name, url:properties.configuration.ingress.fqdn}" -o table

# Check container app status
az containerapp show --name feedo-api-gateway --resource-group feedo-rg --query properties.provisioningState

# View real-time logs
az containerapp logs show --name feedo-api-gateway --resource-group feedo-rg --follow
```

---

## What Changed in the Code

1. **api_gateway/app.js**
   - Added root `/` endpoint that returns gateway info
   - Updated CORS to allow Azure Container Apps domains

2. **food-delivery-frontend/Dockerfile**
   - Fixed default REACT_APP_API_URL from `localhost:3001` to `localhost:5001`
   - When deploying to Azure, pass `--build-arg REACT_APP_API_URL=https://your-api-gateway-url`

3. **food-delivery-frontend/src/services/api.js** and **AuthContext.js**
   - Already pointing to port 5001 for local
   - Uses environment variable for deployments

---

## After Redeployment

Once everything is working on Azure:

1. Update your GitHub repository with the fixed files
2. The CI/CD pipeline (GitHub Actions) will automatically redeploy on next push
3. Monitor in GitHub Actions tab

To trigger redeployment manually:
```bash
git add .
git commit -m "Fix API Gateway root route and Frontend API URL"
git push origin main
```
