# Feedo - Cloud Deployment

CTSE Assignment: Deploy microservices using managed container orchestration (ECS, Azure Container Apps, GKE).

## Prerequisites

- Docker images pushed to container registry (e.g. ghcr.io from GitHub Actions)
- Cloud provider account (AWS, Azure, GCP) - stay within Free Tier

## AWS ECS (Fargate)

1. Create ECR or use GitHub Container Registry (ghcr.io)
2. Create ECS cluster, VPC, security groups
3. Update `task-definition-delivery.json` with your account ID, region, secrets
4. Create ECS service from task definition

```bash
aws ecs register-task-definition --cli-input-json file://task-definition-delivery.json
aws ecs create-service --cluster feedo-cluster --task-definition feedo-delivery-service ...
```

## Security (per assignment)

- **IAM roles**: Use least-privilege roles for task execution and task role
- **Security groups**: Restrict ingress to ALB only; egress to MongoDB and peer services
- **Secrets**: Store MONGODB_URI, JWT_SECRET in AWS Secrets Manager (not env vars)
- **Network**: Use private subnets for services; public only for ALB

## Docker Compose (local)

```bash
docker compose up -d
```

## Consume images from GitHub Container Registry (GHCR)

After CI pushes to **`ghcr.io/<your-github-username>/feedo-<service>:latest`**:

1. **Login** (PAT with `read:packages`):  
   `echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin`
2. **Pull:**  
   `docker pull ghcr.io/USERNAME/feedo-api-gateway:latest`
3. **Run** the same image in **ECS / Container Apps / Kubernetes** by referencing the full image URI in the task definition / deployment YAML.

Replace placeholders in `deploy/aws-ecs/*.json` with your GitHub username or org and account ID.

## Azure

See **`deploy/azure/README.md`**.

## Additional ECS task definition

- **`task-definition-api-gateway.json`** — API Gateway behind ALB (public), internal URLs for other services (use Cloud Map or env).

## Environment Variables

See `.env.example` in project root. For cloud, use managed secrets where possible.
