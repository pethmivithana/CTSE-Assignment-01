# Local Development Setup

Run frontend and API services locally for faster iteration—no Docker image rebuilds on code changes.

## Prerequisites

- Node.js 18+
- MongoDB running on `localhost:27017` (see options below)

## Option A: MongoDB via Docker (recommended)

```powershell
npm run dev:mongo
# or: docker compose -f docker-compose.mongo.yml up -d
```

Databases created automatically: `user_management`, `restaurant_db`, `order_management`, `delivery_management`

## Option B: Local MongoDB

Install MongoDB and ensure it runs on port 27017.

---

## Ports (Local)

| Service            | Port | Database           |
|--------------------|------|--------------------|
| API Gateway        | 5001 | -                  |
| Frontend           | 3000 | -                  |
| User Service       | 3001 | user_management    |
| Restaurant Service | 3002 | restaurant_db      |
| Order Service      | 3004 | order_management   |
| Delivery Service   | 3003 | delivery_management|
| Notification       | 3005 | -                  |

---

## Start Order

1. **MongoDB** (Docker or local)
2. **Backend services** (any order, then API Gateway)
3. **API Gateway**
4. **Frontend**

---

## Quick Start (5 terminals)

### Terminal 1 – User Service
```powershell
cd services/user-service
$env:MONGO_URI="mongodb://localhost:27017/user_management"; npm run dev
```

### Terminal 2 – Restaurant Service
```powershell
cd services/restaurant-service
$env:MONGODB_URI="mongodb://localhost:27017/restaurant_db"; npm run dev
```

### Terminal 3 – Order Service
```powershell
cd services/order-service
$env:MONGO_URI="mongodb://localhost:27017/order_management"
$env:USER_SERVICE_URL="http://localhost:5002"
$env:RESTAURANT_SERVICE_URL="http://localhost:3002"
$env:DELIVERY_SERVICE_URL="http://localhost:3003"
$env:NOTIFICATION_SERVICE_URL="http://localhost:3005"
node app.js
```

### Terminal 4 – Delivery Service
```powershell
cd services/delivery-service
$env:MONGODB_URI="mongodb://localhost:27017/delivery_management"
$env:USER_SERVICE_URL="http://localhost:5002"
$env:RESTAURANT_SERVICE_URL="http://localhost:3002"
$env:ORDER_SERVICE_URL="http://localhost:3004"
$env:NOTIFICATION_SERVICE_URL="http://localhost:3005"
npm run dev
```

### Terminal 5 – Notification Service
```powershell
cd services/notification-service
node app.js
```

### Terminal 6 – API Gateway
```powershell
cd api_gateway
$env:USER_SERVICE_URL="http://localhost:5002"
$env:RESTAURANT_SERVICE_URL="http://localhost:3002"
$env:ORDER_SERVICE_URL="http://localhost:3004"
$env:DELIVERY_SERVICE_URL="http://localhost:3003"
$env:NOTIFICATION_SERVICE_URL="http://localhost:3005"
npm run dev
```

### Terminal 7 – Frontend
```powershell
cd food-delivery-frontend
$env:REACT_APP_API_URL="http://localhost:3001"; npm start
```

---

## Using .env files (recommended)

Copy `.env.example` to `.env` in each folder, then run `npm start` or `npm run dev`:

```powershell
# Copy examples (run from project root)
copy api_gateway\.env.example api_gateway\.env
copy services\user-service\.env.example services\user-service\.env
copy services\restaurant-service\.env.example services\restaurant-service\.env
copy services\order-service\.env.example services\order-service\.env
copy services\delivery-service\.env.example services\delivery-service\.env
copy food-delivery-frontend\.env.example food-delivery-frontend\.env
```

Then start each service—no need to set env vars in the terminal.

**services/user-service/.env** (local dev)
```
PORT=5002
MONGO_URI=mongodb://localhost:27017/user_management
JWT_SECRET=your_jwt_secret_here
```

**api_gateway/.env**
```
USER_SERVICE_URL=http://localhost:5002
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3004
DELIVERY_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
```

**food-delivery-frontend/.env**
```
REACT_APP_API_URL=http://localhost:3001
```

---

## Seed admin user (local)

```powershell
cd services/user-service
$env:MONGO_URI="mongodb://localhost:27017/user_management"; npm run seed:admin
```

---

## URLs

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
