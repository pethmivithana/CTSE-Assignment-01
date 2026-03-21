# Azure Container Apps — Feedo (CTSE cloud option)

Use **Azure Container Apps** (serverless containers) or **Azure Container Instances** to run images from **GHCR** or Azure Container Registry.

## Prerequisites

- Azure subscription (free tier / student credits)
- Images built and pushed (e.g. `ghcr.io/<user>/feedo-api-gateway:latest`)

## High-level steps

1. **Resource group** — e.g. `rg-feedo-ctse`
2. **Container Apps environment** — VNet integration optional
3. **Deploy each service** as a container app:
   - **Ingress**: External HTTPS for **API Gateway** and **Frontend** only
   - **Internal** ingress for User, Order, Restaurant, Delivery, Payment, Notification (not public)
4. **Secrets** — Store `JWT_SECRET`, `MONGO_URI`, etc. in Azure Key Vault; reference from Container Apps
5. **MongoDB** — Azure Cosmos DB API for MongoDB, or MongoDB Atlas, or VM (document connection string in Key Vault)

## Security (assignment)

- **Managed identity** for pulling from ACR / accessing Key Vault
- **Network**: place internal services in private subnet; only gateway has public endpoint
- **TLS**: Enable HTTPS on public ingress

## Example CLI (illustrative)

```bash
az group create -n rg-feedo -l eastus
az containerapp env create -n feedo-env -g rg-feedo --location eastus
# Create container apps per image — see Azure docs for latest `az containerapp create` syntax
```

## References

- [Azure Container Apps documentation](https://learn.microsoft.com/azure/container-apps/)
- Project env template: `/.env.example`
