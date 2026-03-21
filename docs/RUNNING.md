# Running Feedo Locally

To avoid 404/502 errors on Delivery Dashboard, **all services must be running**.

## Required Services (start in order)

| Service | Port | Command | Directory |
|---------|------|---------|-----------|
| MongoDB | 27017 | `mongod` or Docker | - |
| User Service | 5002 | `npm start` | `services/user-service` |
| Restaurant Service | 3002 | `npm start` | `services/restaurant-service` |
| Order Service | 3004 | `npm start` | `services/order-service` |
| Delivery Service | 3003 | `npm start` | `services/delivery-service` |
| Payment Service | 3006 | `npm start` | `services/payment-service` |
| Notification Service | 3005 | `npm start` | `services/notification-service` |
| API Gateway | 3001 | `npm start` | `api_gateway` |
| Frontend | 3000 | `npm start` | `food-delivery-frontend` |

## Quick start (Docker)

```bash
docker-compose up -d
```

All services + frontend run. App at http://localhost:3000, API at http://localhost:3001.

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| 502 on `/api/users/me/register-driver` | User service down, or it can't reach Delivery service | Start user-service (5002) and delivery-service (3003) |
| 404 on `/api/delivery/drivers/me` | Driver not found for current user | Admin must approve user, or call register-driver when approved |
| 404 on `/api/delivery/deliveries/available` | Delivery service down or wrong route | Start delivery-service on 3003 |
