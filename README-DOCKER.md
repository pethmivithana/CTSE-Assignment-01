# Running Feedo with Docker

This guide explains how to run the Feedo microservice-based ecommerce application using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

## Quick Start

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **API Gateway:** http://localhost:3001
   - **MongoDB:** localhost:27017 (for direct DB access if needed)

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| API Gateway | 3001 | Main API entry point, routes to microservices |
| Restaurant Service | 3002 | Menu items, restaurant orders |
| Delivery Service | 3003 | Delivery management |
| Order Service | 3004 | Order processing (internal) |
| Notification Service | 3005 | Notifications (internal) |
| MongoDB | 27017 | Shared database |

## Environment Variables

Create a `.env` file in the project root to override defaults:

```env
# JWT (shared across services)
JWT_SECRET=your_secure_jwt_secret_here

# SMTP - Email verification (User Service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
SMTP_FROM=noreply@feedo.com
```

Copy from `.env.example` and update with your values.

## Building from Scratch

To rebuild all images (e.g., after code changes):

```bash
docker-compose up -d --build
```

## Running Individual Services

To run only specific services:

```bash
# Just database and API gateway
docker-compose up -d mongodb api-gateway user-service frontend

# Full stack
docker-compose up -d
```

## Troubleshooting

- **Services not starting:** Ensure MongoDB is healthy before other services. Use `docker-compose logs mongodb` to check.
- **Connection refused:** Wait 30-60 seconds for all services to initialize.
- **Frontend can't reach API:** Ensure you're accessing the app at http://localhost:3000 (the frontend is configured to call the API at localhost:3001).
