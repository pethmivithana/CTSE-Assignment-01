# Feedo Microservices Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                   Port 3000                                  │
│              http://localhost:3000                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP Requests
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY                               │
│              (Express.js Router)                            │
│                  Port 3001                                  │
│              http://localhost:3001                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┬──────────┐
        │          │          │          │          │          │
        ↓          ↓          ↓          ↓          ↓          ↓
    ┌────┐   ┌────────┐  ┌─────┐   ┌────────┐  ┌──────────┐  ┌──────┐
    │    │   │        │  │     │   │        │  │          │  │      │
    │ US │   │ Restaurant
    │    │   │Service │  │Order│   │Delivery│  │Notification
    │Port│   │ Port   │  │Svc  │   │Service │  │Service   │  │Payment│
    │5002│   │ 3002   │  │3004 │   │ 3003   │  │ 3005     │  │ 3006  │
    │    │   │        │  │     │   │        │  │          │  │       │
    └────┘   └────────┘  └─────┘   └────────┘  └──────────┘  └──────┘
       │        │          │        │            │             │
       └────────┴──────────┴────────┴────────────┴─────────────┘
                           │
                    ┌──────┴──────┐
                    ↓             ↓
              ┌──────────┐   ┌────────────┐
              │ MongoDB  │   │   External │
              │Port 27017│   │   Services │
              │          │   │ (Stripe,   │
              └──────────┘   │  Gmail)    │
                             └────────────┘
```

---

## Service Details

### 1. Frontend (React)
- **Port:** 3000
- **Type:** React SPA
- **Location:** `food-delivery-frontend/`
- **Talks to:** API Gateway (port 3001)
- **Features:**
  - User registration and login
  - Browse restaurants
  - Place orders
  - Track deliveries
  - Payment processing

### 2. API Gateway
- **Port:** 3001
- **Type:** Express.js Router/Proxy
- **Location:** `api_gateway/`
- **Routes Requests To:**
  - `/auth` → User Service (5002)
  - `/users` → User Service (5002)
  - `/api/restaurants` → Restaurant Service (3002)
  - `/api/menus` → Restaurant Service (3002)
  - `/api/orders` → Order Service (3004)
  - `/api/delivery` → Delivery Service (3003)
  - `/api/notifications` → Notification Service (3005)
  - `/api/payments` → Payment Service (3006)

### 3. User Service
- **Port:** 5002 ⚠️ **IMPORTANT - This was the bug!**
- **Type:** Express.js Microservice
- **Location:** `services/user-service/`
- **Database:** MongoDB (collection: `user_db`)
- **Handles:**
  - User registration
  - User login
  - JWT authentication
  - Profile management
  - Email verification

### 4. Restaurant Service
- **Port:** 3002
- **Type:** Express.js Microservice
- **Location:** `services/restaurant-service/`
- **Database:** MongoDB (collection: `restaurant_db`)
- **Handles:**
  - Restaurant listing
  - Menu management
  - Category management
  - Restaurant images

### 5. Order Service
- **Port:** 3004
- **Type:** Express.js Microservice
- **Location:** `services/order-service/`
- **Database:** MongoDB (collection: `order_db`)
- **Handles:**
  - Order creation
  - Order tracking
  - Order history
  - Coupon management
  - Interacts with: Restaurant, User, Delivery, Notification services

### 6. Delivery Service
- **Port:** 3003
- **Type:** Express.js Microservice
- **Location:** `services/delivery-service/`
- **Database:** MongoDB (collection: `delivery_db`)
- **Handles:**
  - Delivery tracking
  - Driver management
  - Real-time delivery updates
  - Route optimization

### 7. Notification Service
- **Port:** 3005
- **Type:** Express.js Microservice
- **Location:** `services/notification-service/`
- **Database:** MongoDB (collection: `notification_db`)
- **Handles:**
  - Email notifications
  - SMS notifications (if configured)
  - Push notifications
  - Order status updates

### 8. Payment Service
- **Port:** 3006
- **Type:** Express.js Microservice
- **Location:** `services/payment-service/`
- **Database:** MongoDB (collection: `payment_db`)
- **Handles:**
  - Stripe payment processing
  - Payment history
  - Refunds
  - Payment verification

### 9. Database (MongoDB)
- **Port:** 27017
- **Type:** MongoDB
- **Databases:**
  - `user_db` - Users, authentication
  - `restaurant_db` - Restaurants, menus
  - `order_db` - Orders
  - `delivery_db` - Deliveries, drivers
  - `notification_db` - Notifications
  - `payment_db` - Payments

---

## Communication Flow

### Registration Flow (What was broken)
```
Frontend                API Gateway           User Service        MongoDB
  │                         │                     │                 │
  ├─ POST /auth/register ──→│                     │                 │
  │                         ├─ Proxy ────→ (port 5002) ✓ NOW FIXED │
  │                         │                     ├─ Create user ──→│
  │                         │                     │                 │
  │                         │ ←─ Response ────────┤                 │
  │ ←─ Success response ────┤                     │                 │
  │                         │                     │                 │
```

**The Bug:** Gateway was trying port 3001 (❌) instead of 5002 (✓)

### Order Placement Flow
```
Frontend → API Gateway → Order Service → Restaurant Service (verify menu)
                              ↓
                        Notification Service (notify restaurant)
                              ↓
                        Delivery Service (assign driver)
```

---

## Port Assignment Reference

```
┌──────────────────────────────────────────────────────┐
│            FEEDO SERVICES PORT MAP                   │
├──────────────────────────────────────────────────────┤
│ DATABASE LAYER:                                      │
│   MongoDB              27017                         │
├──────────────────────────────────────────────────────┤
│ API LAYER:                                           │
│   API Gateway          3001  ← Frontend connects     │
├──────────────────────────────────────────────────────┤
│ MICROSERVICES:                                       │
│   User Service         5002  ← Gateway routes here   │
│   Restaurant Service   3002  ← Gateway routes here   │
│   Delivery Service     3003  ← Gateway routes here   │
│   Order Service        3004  ← Gateway routes here   │
│   Notification Service 3005  ← Gateway routes here   │
│   Payment Service      3006  ← Gateway routes here   │
├──────────────────────────────────────────────────────┤
│ FRONTEND:                                            │
│   React App            3000                          │
└──────────────────────────────────────────────────────┘
```

---

## Environment Variables by Service

### api_gateway/.env
```env
PORT=3001
USER_SERVICE_URL=http://localhost:5002        # LOCAL
USER_SERVICE_URL=http://user-service:5002    # DOCKER
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3004
DELIVERY_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
JWT_SECRET=your_jwt_secret_here
```

### services/user-service/.env
```env
PORT=5002                              # ✓ FIXED
MONGO_URI=mongodb://localhost:27017/user_db
JWT_SECRET=your_jwt_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### services/restaurant-service/.env
```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/restaurant_db
ORDER_SERVICE_URL=http://localhost:3004
```

### And so on for each service...

---

## Service Dependencies (What needs to start first)

```
1. MongoDB (dependency for all services)
   ↓
2. User Service (auth dependency)
3. Restaurant Service
4. Notification Service
   ↓
5. Order Service (depends on User, Restaurant, Notification)
6. Payment Service (depends on Notification)
7. Delivery Service (depends on Order, User)
   ↓
8. API Gateway (depends on all above)
   ↓
9. Frontend (depends on API Gateway)
```

**With Docker:** All handled automatically via `docker-compose`  
**Locally:** Start in separate terminals in above order

---

## Network Communication (Docker)

When running in Docker, services use:
- **Container DNS:** `user-service` instead of `localhost`
- **Port:** Internal Docker network on 5002

Example:
```
http://user-service:5002  ← Docker networking
http://localhost:5002     ← Local development
```

---

## Troubleshooting Checklist

- [ ] MongoDB running on 27017
- [ ] User Service running on **5002** (not 3002!)
- [ ] Restaurant Service on 3002
- [ ] Order Service on 3004
- [ ] Delivery Service on 3003
- [ ] Notification Service on 3005
- [ ] Payment Service on 3006
- [ ] API Gateway on 3001
- [ ] Frontend on 3000
- [ ] All services on same Docker network (if Docker)
- [ ] Environment variables set correctly
- [ ] API Gateway pointing to port 5002 for User Service

---

## Service Health Check

```bash
# User Service
curl http://localhost:5002/health

# API Gateway
curl http://localhost:3001/health

# Or run our health check
npm run health-check
```

---

## Quick Restart Commands

```bash
# Docker (recommended)
docker compose down -v
docker compose up -d
npm run health-check

# Specific service
docker restart feedo-user-service

# View logs
docker logs feedo-user-service -f
```

---

**Last Updated:** 2024  
**Status:** All services documented and configured
