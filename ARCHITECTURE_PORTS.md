# System Architecture with Port Configuration

## Local Development Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FOOD DELIVERY SYSTEM                          │
│                    Local Development Mode                        │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ USER BROWSER                                                   │
│ http://localhost:3000                                          │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  React Frontend (Next.js / React)                        │  │
│ │  Port: 3000                                              │  │
│ │  API_URL: http://localhost:5001                          │  │
│ └──────────────────┬───────────────────────────────────────┘  │
└────────────────────┼──────────────────────────────────────────┘
                     │
                     │ HTTP Requests
                     │ (REST API)
                     ▼
┌────────────────────────────────────────────────────────────────┐
│ API GATEWAY - Main Entry Point                                 │
│ http://localhost:5001                                          │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  Express Server                                          │  │
│ │  Port: 5001  ← YOUR MAIN GATEWAY PORT                    │  │
│ │                                                          │  │
│ │  Proxies requests to:                                   │  │
│ │  • /auth → User Service (5002)                          │  │
│ │  • /users → User Service (5002)                         │  │
│ │  • /api/restaurants → Restaurant Service (3002)         │  │
│ │  • /api/orders → Order Service (3004)                   │  │
│ │  • /api/delivery → Delivery Service (3003)              │  │
│ │  • /api/notifications → Notification Service (3005)     │  │
│ │  • /api/payments → Payment Service (3006)               │  │
│ └──────────────────┬───────────────────────────────────────┘  │
└────────────────────┼──────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┬──────────┬──────────┐
        │            │            │              │          │          │
        ▼            ▼            ▼              ▼          ▼          ▼
    ┌────────┐  ┌────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  ┌───────┐
    │ User   │  │Restaur │  │ Order    │  │Delivery│  │Notif   │  │Payment│
    │Service │  │ant Svc │  │ Service  │  │ Svc    │  │Service │  │Service│
    │        │  │        │  │          │  │        │  │        │  │       │
    │:5002   │  │:3002   │  │:3004     │  │:3003   │  │:3005   │  │:3006  │
    └────┬───┘  └────┬───┘  └────┬─────┘  └───┬────┘  └───┬────┘  └───┬───┘
         │           │           │            │          │           │
         └─────┬─────┴─────┬─────┴────────────┴──────────┴───────────┘
               │           │
               ▼           ▼
         ┌─────────────────────┐
         │ MongoDB (27017)     │
         │ Shared Database     │
         │                     │
         │ Databases:          │
         │ • user_db           │
         │ • restaurant_db     │
         │ • order_db          │
         │ • delivery_db       │
         │ • notification_db   │
         │ • payment_db        │
         └─────────────────────┘
```

---

## Docker Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER CONTAINER NETWORK                      │
│                    (feedo-network)                               │
└─────────────────────────────────────────────────────────────────┘

HOST MACHINE (Port Mappings)
┌─────────────────────────────────────────────────────────────────┐
│ localhost:3000   → container frontend:80                        │
│ localhost:5001   → container api-gateway:5001                   │
│ localhost:3002   → container restaurant-service:3002            │
│ localhost:3003   → container delivery-service:3003              │
│ localhost:27017  → container mongodb:27017                      │
└─────────────────────────────────────────────────────────────────┘

DOCKER NETWORK (Internal Communication)
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────┐                                             │
│  │ frontend:80  │──┐                                          │
│  │ (React App)  │  │                                          │
│  └──────────────┘  │                                          │
│                    │ requests to api-gateway:5001             │
│                    ▼                                          │
│  ┌───────────────────────────────────────────┐              │
│  │ api-gateway:5001                          │              │
│  │ (Express Proxy)                           │              │
│  │                                           │              │
│  │ Routes to Docker DNS names:               │              │
│  │ • user-service:5002                       │              │
│  │ • restaurant-service:3002                 │              │
│  │ • order-service:3004                      │              │
│  │ • delivery-service:3003                   │              │
│  │ • notification-service:3005               │              │
│  │ • payment-service:3006                    │              │
│  └───────────────────┬───────────────────────┘              │
│                      │                                       │
│   ┌──────────────────┼──────────────────────┐               │
│   │                  │                      │               │
│   ▼                  ▼                      ▼               │
│ ┌──────────┐    ┌──────────┐        ┌──────────────┐      │
│ │user-svc  │    │rest-svc  │        │order-svc     │      │
│ │:5002     │    │:3002     │        │:3004         │      │
│ └─────┬────┘    └─────┬────┘        └─────┬────────┘      │
│       │              │                    │               │
│       └──────────────┼────────────────────┘               │
│                      ▼                                    │
│            ┌──────────────────┐                          │
│            │ mongodb:27017    │                          │
│            │ (MongoDB)        │                          │
│            └──────────────────┘                          │
│                                                          │
└────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagram

### User Registration Flow

```
1. USER OPENS FRONTEND
   ┌─────────────────────────────────────────┐
   │ http://localhost:3000                   │
   │ (Frontend React App)                    │
   └──────────────┬──────────────────────────┘
                  │
                  │ User clicks "Sign Up"
                  │ Submits registration form
                  ▼
   ┌─────────────────────────────────────────┐
   │ POST http://localhost:5001/auth/register│
   │ (API Gateway - Port 5001)               │
   └──────────────┬──────────────────────────┘
                  │
                  │ Routes to User Service
                  ▼
   ┌─────────────────────────────────────────┐
   │ POST http://localhost:5002/auth/register│
   │ (User Service - Port 5002)              │
   │                                         │
   │ • Validates email                       │
   │ • Hashes password                       │
   │ • Creates user document                 │
   │ • Sends verification email              │
   └──────────────┬──────────────────────────┘
                  │
                  │ Queries MongoDB
                  ▼
   ┌─────────────────────────────────────────┐
   │ mongodb://localhost:27017/user_db       │
   │ (MongoDB Database)                      │
   │                                         │
   │ • Stores user document                  │
   │ • Returns to User Service               │
   └──────────────┬──────────────────────────┘
                  │
                  │ Success response
                  ▼
   ┌─────────────────────────────────────────┐
   │ 200 OK - User registered successfully   │
   │                                         │
   │ Returns JWT token to Frontend           │
   └─────────────────────────────────────────┘
```

---

## Service Dependencies

```
FRONTEND (Port 3000)
    ├─> API_GATEWAY (Port 5001)
    │       ├─> USER_SERVICE (Port 5002)
    │       │       └─> MONGODB (27017)
    │       │
    │       ├─> RESTAURANT_SERVICE (Port 3002)
    │       │       └─> MONGODB (27017)
    │       │
    │       ├─> ORDER_SERVICE (Port 3004)
    │       │       ├─> USER_SERVICE (5002)
    │       │       ├─> RESTAURANT_SERVICE (3002)
    │       │       ├─> NOTIFICATION_SERVICE (3005)
    │       │       ├─> DELIVERY_SERVICE (3003)
    │       │       └─> MONGODB (27017)
    │       │
    │       ├─> DELIVERY_SERVICE (Port 3003)
    │       │       ├─> USER_SERVICE (5002)
    │       │       ├─> ORDER_SERVICE (3004)
    │       │       └─> MONGODB (27017)
    │       │
    │       ├─> NOTIFICATION_SERVICE (Port 3005)
    │       │       ├─> USER_SERVICE (5002)
    │       │       ├─> RESTAURANT_SERVICE (3002)
    │       │       └─> MONGODB (27017)
    │       │
    │       └─> PAYMENT_SERVICE (Port 3006)
    │               ├─> ORDER_SERVICE (3004)
    │               ├─> NOTIFICATION_SERVICE (3005)
    │               └─> MONGODB (27017)
    │
    └─> MONGODB (Port 27017)
```

---

## Port Assignment Logic

```
┌───────────────────────────────────────────────────────┐
│          PORT ASSIGNMENT STRATEGY                     │
└───────────────────────────────────────────────────────┘

GATEWAY TIER (Reserved):
  5001 - API Gateway (Main entry point)

USER TIER (Reserved):
  5002 - User Service (Authentication/Core)

BUSINESS LOGIC TIER:
  3002 - Restaurant Service
  3003 - Delivery Service
  3004 - Order Service
  3005 - Notification Service
  3006 - Payment Service

UI TIER:
  3000 - Frontend (React)

DATABASE TIER:
  27017 - MongoDB

Why this structure?
  ✓ Gateway on 5xxx (easy to identify)
  ✓ User service on 5xx (close to gateway, core service)
  ✓ Business services on 3xxx (grouped together)
  ✓ Frontend on 3000 (standard React default)
  ✓ MongoDB on standard port 27017
```

---

## Environment Variables by Service

```
┌──────────────────────────────────────────────────────────┐
│          LOCAL DEVELOPMENT (.env files)                  │
└──────────────────────────────────────────────────────────┘

API GATEWAY (.env)
  PORT=5001
  USER_SERVICE_URL=http://localhost:5002
  RESTAURANT_SERVICE_URL=http://localhost:3002
  ORDER_SERVICE_URL=http://localhost:3004
  DELIVERY_SERVICE_URL=http://localhost:3003
  NOTIFICATION_SERVICE_URL=http://localhost:3005
  PAYMENT_SERVICE_URL=http://localhost:3006

USER SERVICE (.env)
  PORT=5002
  MONGO_URI=mongodb://localhost:27017/user_db

RESTAURANT SERVICE (.env)
  PORT=3002
  MONGODB_URI=mongodb://localhost:27017/restaurant_db

ORDER SERVICE (.env)
  PORT=3004
  MONGO_URI=mongodb://localhost:27017/order_db
  USER_SERVICE_URL=http://localhost:5002
  RESTAURANT_SERVICE_URL=http://localhost:3002

DELIVERY SERVICE (.env)
  PORT=3003
  USER_SERVICE_URL=http://localhost:5002
  ORDER_SERVICE_URL=http://localhost:3004

NOTIFICATION SERVICE (.env)
  PORT=3005
  USER_SERVICE_URL=http://localhost:5002

PAYMENT SERVICE (.env)
  PORT=3006
  ORDER_SERVICE_URL=http://localhost:3004

FRONTEND (.env)
  REACT_APP_API_URL=http://localhost:5001

┌──────────────────────────────────────────────────────────┐
│          DOCKER DEPLOYMENT (docker-compose.yml)          │
└──────────────────────────────────────────────────────────┘

API GATEWAY
  PORT=5001
  USER_SERVICE_URL=http://user-service:5002
  (All services use Docker DNS names)

All services communicate via Docker DNS:
  user-service:5002
  restaurant-service:3002
  order-service:3004
  delivery-service:3003
  notification-service:3005
  payment-service:3006
  mongodb:27017
```

---

## Troubleshooting Connection Issues

```
SCENARIO 1: Frontend Cannot Connect to API Gateway
  ❌ Frontend on 3000 → Trying 3001 (old port)
  ✅ Frontend on 3000 → Using 5001 (correct port)
  
  Fix: Update REACT_APP_API_URL=http://localhost:5001

SCENARIO 2: API Gateway Cannot Find User Service
  ❌ Gateway tries http://localhost:3001 (old)
  ✅ Gateway tries http://localhost:5002 (correct)
  
  Fix: Update USER_SERVICE_URL=http://localhost:5002

SCENARIO 3: Services in Docker Cannot Communicate
  ❌ Using localhost addresses inside containers
  ✅ Using Docker DNS names (service-name:port)
  
  Fix: docker-compose.yml has http://user-service:5002

SCENARIO 4: Port Already in Use
  ❌ Port 5001 in use by another service
  ✅ Kill process or change port
  
  Fix: lsof -i :5001 && kill -9 <PID>
```

---

## Summary

Your system now uses:
- **Gateway**: Port 5001 (your requested port)
- **User Service**: Port 5002 (dedicated user tier)
- **Business Services**: Ports 3002-3006 (consistent)
- **Frontend**: Port 3000 (standard)
- **Database**: Port 27017 (standard)

All services are configured consistently for both local and Docker deployment.
