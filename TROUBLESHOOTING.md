# Feedo Troubleshooting Guide

## Issue: Registration Error - ECONNREFUSED on port 5002

### The Problem

When you try to register, you see this error:
```
Proxy error: AggregateError [ECONNREFUSED]: 
    Error: connect ECONNREFUSED ::1:5002
    Error: connect ECONNREFUSED 127.0.0.1:5002
```

### Root Cause

The API Gateway is trying to reach the **User Service on port 5002**, but the User Service is not running or is running on the wrong port.

---

## Solution: 5 Quick Steps

### Step 1: Check Service Status (Health Check)

Run the health check to see which services are running:

```bash
npm run health-check
```

This will show:
- ✓ Green checkmarks = Running
- ✗ Red X marks = Offline

**Example output:**
```
Running Services (5):
  ✓ MongoDB
  ✓ Restaurant Service
  ✓ Order Service
  ✓ Frontend

Offline Services (4):
  ✗ API Gateway
  ✗ User Service
  ✗ Delivery Service
  ✗ Notification Service
```

### Step 2: Fix User Service Port

The User Service .env had `PORT = 3002` but should be `PORT=5002`. We fixed this, but make sure:

**File:** `services/user-service/.env`
```env
PORT=5002  # ✓ CORRECT
```

NOT:
```env
PORT=3002  # ✗ WRONG
```

### Step 3: Fix API Gateway Configuration

The API Gateway needs to know the User Service is on port 5002. We fixed this in:

**File:** `api_gateway/.env`
```env
USER_SERVICE_URL=http://user-service:5002  # ✓ CORRECT for Docker
USER_SERVICE_URL=http://localhost:5002     # ✓ CORRECT for local dev
```

### Step 4: Restart All Services

**Option A: Using Docker (Recommended)**
```bash
# Stop all containers
docker compose down

# Remove old containers to ensure clean start
docker compose down -v

# Start everything fresh
docker compose up -d

# Wait 10 seconds for services to start
sleep 10

# Check health
npm run health-check
```

**Option B: Running Locally (Each in separate terminal)**

**Terminal 1 - MongoDB:**
```bash
mongod
# Output: "Waiting for connections on port 27017"
```

**Terminal 2 - User Service:**
```bash
cd services/user-service
npm install
PORT=5002 npm start
# Output: "🚀 Server running on port 5002"
```

**Terminal 3 - Restaurant Service:**
```bash
cd services/restaurant-service
npm install
PORT=3002 npm start
```

**Terminal 4 - API Gateway:**
```bash
cd api_gateway
npm install
PORT=3001 npm start
# Output should show User Service URL pointing to port 5002
```

**Terminal 5 - Frontend:**
```bash
cd food-delivery-frontend
npm install
npm start
# Output: "http://localhost:3000"
```

### Step 5: Test Registration

1. Open http://localhost:3000
2. Click "Sign Up" or "Register"
3. Fill in details:
   - Full Name: Test User
   - Email: test@example.com
   - Password: Test@123
   - Phone: 0712345678
4. Click Register
5. You should see success message (or go to login page)

---

## Diagnosis: How to Check if Services are Working

### Method 1: Health Check (Fastest)
```bash
npm run health-check
```

Gives you a visual summary of all 9 services.

### Method 2: Check Individual Ports

**Windows/Mac:**
```bash
# User Service (should be on 5002)
lsof -i :5002

# API Gateway (should be on 3001)
lsof -i :3001

# Frontend (should be on 3000)
lsof -i :3000
```

**Linux:**
```bash
ss -tlnp | grep ":5002"
ss -tlnp | grep ":3001"
ss -tlnp | grep ":3000"
```

**Windows PowerShell:**
```powershell
netstat -ano | findstr ":5002"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":3000"
```

### Method 3: Test Direct Endpoints

**Test User Service:**
```bash
curl http://localhost:5002/health
# Response: {"status":"ok"}
```

**Test API Gateway:**
```bash
curl http://localhost:3001/health
# Response: {"status":"API Gateway is healthy"}
```

**Test Frontend:**
```bash
curl http://localhost:3000
# Response: HTML content
```

### Method 4: Check Docker Containers

**See all containers:**
```bash
docker ps -a
```

**See running containers:**
```bash
docker ps
```

**Check container logs:**
```bash
# User Service logs
docker logs feedo-user-service

# API Gateway logs
docker logs feedo-api-gateway

# All containers
docker compose logs -f
```

---

## Common Issues & Solutions

### Issue 1: "Cannot GET /auth/register"
**Cause:** API Gateway is not running or not routing to User Service correctly

**Fix:**
```bash
# Check API Gateway
curl http://localhost:3001/

# Should see routes listed
# If error, restart: npm run dev
```

### Issue 2: "ENOTFOUND localhost:5002"
**Cause:** User Service port number is wrong

**Fix:**
```bash
# Check user service port in .env
cat services/user-service/.env | grep PORT

# Should show: PORT=5002
# If not, edit it
```

### Issue 3: "Connection Refused" to MongoDB
**Cause:** MongoDB is not running

**Fix:**
```bash
# Start MongoDB
mongod

# Or with Docker
docker compose up -d mongodb

# Wait 5 seconds and check
npm run health-check
```

### Issue 4: Services start but "502 Bad Gateway"
**Cause:** Microservices not talking to each other

**Fix:**
1. Run health check: `npm run health-check`
2. Check docker network: `docker network ls`
3. Ensure all containers are on same network:
   ```bash
   docker network inspect feedo-network
   ```

### Issue 5: Frontend shows blank page
**Cause:** API Gateway not reachable

**Fix:**
1. Check frontend .env:
   ```bash
   cat food-delivery-frontend/.env
   # Should have: REACT_APP_API_URL=http://localhost:3001
   ```
2. Check API Gateway running: `npm run health-check`

---

## Port Reference (Should Match This)

| Service | Port | Type | URL |
|---------|------|------|-----|
| **MongoDB** | 27017 | Database | mongodb://localhost:27017 |
| **API Gateway** | 3001 | Node.js | http://localhost:3001 |
| **User Service** | 5002 | Node.js | http://localhost:5002 |
| **Restaurant Service** | 3002 | Node.js | http://localhost:3002 |
| **Order Service** | 3004 | Node.js | http://localhost:3004 |
| **Delivery Service** | 3003 | Node.js | http://localhost:3003 |
| **Notification Service** | 3005 | Node.js | http://localhost:3005 |
| **Payment Service** | 3006 | Node.js | http://localhost:3006 |
| **Frontend** | 3000 | React | http://localhost:3000 |

---

## Docker Cheat Sheet

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# See running containers
docker ps

# See all containers (including stopped)
docker ps -a

# View logs
docker compose logs -f

# View specific service logs
docker logs feedo-user-service -f

# Restart a service
docker restart feedo-user-service

# Remove everything (start fresh)
docker compose down -v
docker compose up -d

# Build images
docker compose build --pull

# Check health of a container
docker healthcheck --last=5 feedo-mongodb
```

---

## Still Having Issues?

### Try This First
```bash
# 1. Stop everything
docker compose down -v

# 2. Remove all images
docker compose down --rmi all

# 3. Start fresh
docker compose build --pull
docker compose up -d

# 4. Check status
npm run health-check

# 5. View logs
docker compose logs -f
```

### Debug Info to Collect

Before asking for help, run:

```bash
# Health check
npm run health-check > health.txt

# Docker containers
docker ps -a > docker-status.txt

# Gateway logs
docker logs feedo-api-gateway > gateway.txt

# User service logs
docker logs feedo-user-service > user-service.txt

# List all files
zip debug-info.zip health.txt docker-status.txt gateway.txt user-service.txt
```

---

## Quick Reference Commands

```bash
# Health check (see which services are running)
npm run health-check

# Start everything with Docker
docker compose up -d

# Stop everything
docker compose down

# View all logs
npm run dev:logs

# Rebuild images
docker compose build --pull

# Check a specific service
curl http://localhost:5002/health  # User Service
curl http://localhost:3001/health  # API Gateway

# Test registration endpoint
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'
```

---

## Environment Variables Explained

### API Gateway: `api_gateway/.env`
```env
PORT=3001                                      # Gateway port
USER_SERVICE_URL=http://localhost:5002        # Where User Service is (LOCAL)
USER_SERVICE_URL=http://user-service:5002    # Where User Service is (DOCKER)
RESTAURANT_SERVICE_URL=http://localhost:3002 # Restaurant Service location
ORDER_SERVICE_URL=http://localhost:3004      # Order Service location
```

### User Service: `services/user-service/.env`
```env
PORT=5002                          # ✓ IMPORTANT - Must be 5002!
MONGO_URI=mongodb://localhost:27017/user_db  # MongoDB (local)
MONGO_URI=mongodb://mongodb:27017/user_db    # MongoDB (Docker)
JWT_SECRET=your_jwt_secret_here              # Secret key for JWTs
```

### Frontend: `food-delivery-frontend/.env`
```env
REACT_APP_API_URL=http://localhost:3001  # API Gateway URL
```

---

## Why Port 5002?

The port assignment is:
- **User Service: 5002** ← You're here ← Check this first!
- **Restaurant Service: 3002**
- **Delivery Service: 3003**
- **Order Service: 3004**
- **Notification Service: 3005**
- **Payment Service: 3006**
- **API Gateway: 3001** ← Routes to all services above
- **Frontend: 3000** ← Talks to API Gateway on 3001

When registration fails, the gateway (3001) tries to reach User Service (5002) but fails because:
1. Port 5002 was wrong (was 3002)
2. Service not running
3. Wrong network configuration

We fixed #1 and provided tools for #2 and #3.

---

**Last Updated:** 2024  
**Status:** All services configured and ready for testing
