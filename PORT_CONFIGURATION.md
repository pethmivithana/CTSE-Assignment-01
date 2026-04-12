# Port Configuration Guide

## Overview
This document shows the exact port structure for local development and Docker deployment.

---

## Local Development (npm start)

When running services locally with `npm start`, each service runs on `localhost`:

| Service | Port | .env Variable | URL |
|---------|------|---------------|-----|
| **API Gateway** | 5001 | `PORT=5001` | `http://localhost:5001` |
| **User Service** | 5002 | `PORT=5002` | `http://localhost:5002` |
| **Restaurant Service** | 3002 | `PORT=3002` | `http://localhost:3002` |
| **Order Service** | 3004 | `PORT=3004` | `http://localhost:3004` |
| **Delivery Service** | 3003 | `PORT=3003` | `http://localhost:3003` |
| **Notification Service** | 3005 | `PORT=3005` | `http://localhost:3005` |
| **Payment Service** | 3006 | `PORT=3006` | `http://localhost:3006` |
| **Frontend** | 3000 | N/A (React) | `http://localhost:3000` |
| **MongoDB** | 27017 | N/A | `mongodb://localhost:27017` |

---

## Docker Deployment

When running with `docker compose`, services communicate using Docker container names:

| Service | Container Port | Container Name | Docker URL |
|---------|-----------------|-----------------|------------|
| **API Gateway** | 5001 | api-gateway | `http://api-gateway:5001` |
| **User Service** | 5002 | user-service | `http://user-service:5002` |
| **Restaurant Service** | 3002 | restaurant-service | `http://restaurant-service:3002` |
| **Order Service** | 3004 | order-service | `http://order-service:3004` |
| **Delivery Service** | 3003 | delivery-service | `http://delivery-service:3003` |
| **Notification Service** | 3005 | notification-service | `http://notification-service:3005` |
| **Payment Service** | 3006 | payment-service | `http://payment-service:3006` |
| **Frontend** | 80 (internal) | frontend | `http://localhost:3000` (external) |
| **MongoDB** | 27017 | mongodb | `mongodb://mongodb:27017` |

### Docker Port Mappings (Host:Container)
```yaml
api-gateway: 5001:5001
restaurant-service: 3002:3002
delivery-service: 3003:3003
frontend: 3000:80
```

---

## Service Configuration Files

### API Gateway - `api_gateway/.env`
```env
PORT=5001
# Local - use localhost
USER_SERVICE_URL=http://localhost:5002
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3004
DELIVERY_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
JWT_SECRET=your_jwt_secret_here
```

### User Service - `services/user-service/.env`
```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/user_db
JWT_SECRET=your_jwt_secret_here
APP_URL=http://localhost:3000
```

### Restaurant Service - `services/restaurant-service/.env`
```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/restaurant_db
JWT_SECRET=your_jwt_secret_here
```

### Order Service - `services/order-service/.env`
```env
PORT=3004
MONGO_URI=mongodb://localhost:27017/order_db
USER_SERVICE_URL=http://localhost:5002
RESTAURANT_SERVICE_URL=http://localhost:3002
DELIVERY_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
```

### Delivery Service - `services/delivery-service/.env`
```env
PORT=3003
USER_SERVICE_URL=http://localhost:5002
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
```

### Notification Service - `services/notification-service/.env`
```env
PORT=3005
USER_SERVICE_URL=http://localhost:5002
RESTAURANT_SERVICE_URL=http://localhost:3002
```

### Payment Service - `services/payment-service/.env`
```env
PORT=3006
ORDER_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
```

### Frontend - `food-delivery-frontend/.env`
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Docker Compose Environment Variables

The `docker-compose.yml` file uses Docker DNS names for inter-service communication:

```yaml
api-gateway:
  environment:
    - PORT=5001
    - USER_SERVICE_URL=http://user-service:5002

order-service:
  environment:
    - PORT=3004
    - USER_SERVICE_URL=http://user-service:5002
    - RESTAURANT_SERVICE_URL=http://restaurant-service:3002

delivery-service:
  environment:
    - PORT=3003
    - USER_SERVICE_URL=http://user-service:5002

frontend:
  environment:
    - REACT_APP_API_URL=http://localhost:5001
```

---

## API Gateway Proxy Configuration

The API Gateway (`api_gateway/app.js`) reads environment variables and proxies to services:

```javascript
const PORT = process.env.PORT || 5001;
// User service: 5002 when running locally (npm start), user-service:5002 in Docker
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:5002';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3004';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3006';
```

---

## Running Services Locally

### Individual Services (separate terminals)

```bash
# Terminal 1 - API Gateway
cd api_gateway
npm install
npm start
# Runs on http://localhost:5001

# Terminal 2 - User Service
cd services/user-service
npm install
npm start
# Runs on http://localhost:5002

# Terminal 3 - Restaurant Service
cd services/restaurant-service
npm install
npm start
# Runs on http://localhost:3002

# Terminal 4 - Order Service
cd services/order-service
npm install
npm start
# Runs on http://localhost:3004

# Terminal 5 - Delivery Service
cd services/delivery-service
npm install
npm start
# Runs on http://localhost:3003

# Terminal 6 - Notification Service
cd services/notification-service
npm install
npm start
# Runs on http://localhost:3005

# Terminal 7 - Payment Service
cd services/payment-service
npm install
npm start
# Runs on http://localhost:3006

# Terminal 8 - Frontend
cd food-delivery-frontend
npm install
npm start
# Runs on http://localhost:3000
```

### Using Docker Compose

```bash
docker compose up -d
# All services run on their configured ports
# Frontend accessible at http://localhost:3000
# API Gateway accessible at http://localhost:5001
```

---

## Testing Service Connectivity

### Check if API Gateway is running
```bash
curl http://localhost:5001/health
```

### Check if User Service is running
```bash
curl http://localhost:5002/health
```

### From Frontend perspective
Frontend at `http://localhost:3000` makes requests to API Gateway at `http://localhost:5001`

### Within Docker
Services use container names: `http://user-service:5002`, `http://api-gateway:5001`, etc.

---

## Common Port Configuration Issues

### Issue: "Cannot connect to User Service"
**Solution:** Verify User Service is running on port 5002 locally or check docker-compose service URLs use `http://user-service:5002` not `http://user-service:3001`

### Issue: Frontend cannot reach API Gateway
**Solution:** 
- Local: Frontend should use `REACT_APP_API_URL=http://localhost:5001`
- Docker: Frontend environment should use `REACT_APP_API_URL=http://localhost:5001` (frontend runs on host, gateway mapped to port 5001)

### Issue: Services can't find each other in Docker
**Solution:** Use Docker container names: `http://service-name:port`, not localhost addresses

---

## Summary of Changes from Original

| Component | Original | Updated |
|-----------|----------|---------|
| API Gateway Port | 3001 | **5001** |
| User Service Port | 3001 | **5002** |
| API Gateway → User Service | http://localhost:3001 | http://localhost:5002 |
| All Service .env files | Mixed ports | Consistent structure |
| docker-compose.yml | Wrong port mapping | Correct Docker DNS names |
