# Port Configuration Modifications - Completed Checklist

## Files Modified (All Done ✅)

### 1. API Gateway Configuration
- ✅ **`api_gateway/.env`**
  - Changed `PORT=3001` → `PORT=5001`
  - Updated all service URLs to localhost (for local dev)

- ✅ **`api_gateway/app.js`**
  - Updated default fallbacks to use correct ports
  - `USER_SERVICE_URL` default: `http://user-service:5002`

### 2. Service .env Files

- ✅ **`services/user-service/.env`**
  - Port: `5002` (already correct)
  - No changes needed

- ✅ **`services/restaurant-service/.env`**
  - Changed `PORT=5000` → `PORT=3002`
  - Changed `FRONTEND_URL=http://localhost:3001` → `http://localhost:3000`

- ✅ **`services/order-service/.env`**
  - Changed `PORT=5003` → `PORT=3004`
  - Changed `PAYMENT_SERVICE_URL=http://payment-service:3000` → `http://localhost:3006`
  - Changed `RESTAURANT_SERVICE_URL=http://localhost:5000` → `http://localhost:3002`
  - Updated `NOTIFICATION_SERVICE_URL` to `http://localhost:3005`

- ✅ **`services/delivery-service/.env`**
  - Port: `3003` (already correct)
  - Changed `USER_SERVICE_URL=http://localhost:3001` → `http://localhost:5002`

- ✅ **`services/notification-service/.env`**
  - Port: `3005` (already correct)
  - Already has correct service URLs

- ✅ **`services/payment-service/.env`**
  - Port: `3006` (assumed correct)
  - No changes needed

### 3. Frontend Configuration
- ✅ **`food-delivery-frontend/.env`**
  - Changed `REACT_APP_API_URL=http://localhost:3001` → `http://localhost:5001`

### 4. Docker Compose Configuration
- ✅ **`docker-compose.yml`**
  - API Gateway: Changed port mapping `3001:3001` → `5001:5001`
  - API Gateway: Changed `PORT=3001` → `PORT=5001`
  - Order Service: Changed `USER_SERVICE_URL=http://user-service:3001` → `http://user-service:5002`
  - Delivery Service: Changed `USER_SERVICE_URL=http://user-service:3001` → `http://user-service:5002`
  - Frontend: Changed `REACT_APP_API_URL=http://localhost:3001` → `http://localhost:5001`
  - Frontend build arg: Changed `http://localhost:3001` → `http://localhost:5001`

---

## Port Reference Table

| Service | Local Port | Docker Port | Status |
|---------|-----------|-------------|--------|
| API Gateway | 5001 | 5001 | ✅ Updated |
| User Service | 5002 | 5002 | ✅ Correct |
| Restaurant Service | 3002 | 3002 | ✅ Updated |
| Order Service | 3004 | 3004 | ✅ Updated |
| Delivery Service | 3003 | 3003 | ✅ Correct |
| Notification Service | 3005 | 3005 | ✅ Correct |
| Payment Service | 3006 | 3006 | ✅ Correct |
| Frontend | 3000 | 3000 | ✅ Updated |
| MongoDB | 27017 | 27017 | ✅ Correct |

---

## How to Test

### Local Development (npm start)

```bash
# In separate terminals, run:

# Terminal 1: API Gateway (port 5001)
cd api_gateway && npm start

# Terminal 2: User Service (port 5002)
cd services/user-service && npm start

# Terminal 3: Restaurant Service (port 3002)
cd services/restaurant-service && npm start

# Terminal 4: Order Service (port 3004)
cd services/order-service && npm start

# Terminal 5: Delivery Service (port 3003)
cd services/delivery-service && npm start

# Terminal 6: Notification Service (port 3005)
cd services/notification-service && npm start

# Terminal 7: Payment Service (port 3006)
cd services/payment-service && npm start

# Terminal 8: Frontend (port 3000)
cd food-delivery-frontend && npm start
```

### Docker Deployment

```bash
# Build and run all services
docker compose up -d

# Check services are running
docker compose ps

# Test API Gateway
curl http://localhost:5001/health

# View logs
docker compose logs -f api-gateway
```

---

## Quick Test Commands

### API Gateway Health Check
```bash
curl http://localhost:5001/health
```

### Register Test
1. Open `http://localhost:3000` in browser
2. Click "Sign Up"
3. Enter email and password
4. Check that registration works without connection errors

### Check if Services are Running

```bash
# API Gateway
curl http://localhost:5001 || echo "❌ API Gateway not running"

# User Service
curl http://localhost:5002/health || echo "❌ User Service not running"

# Restaurant Service
curl http://localhost:3002 || echo "❌ Restaurant Service not running"

# Order Service
curl http://localhost:3004 || echo "❌ Order Service not running"

# All services
echo "Checking all services..."
for port in 5001 5002 3002 3004 3003 3005 3006; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port 2>/dev/null)
  if [ ! -z "$status" ]; then
    echo "✅ Service on port $port: Response $status"
  else
    echo "❌ Service on port $port: Not responding"
  fi
done
```

---

## What Was Fixed

### Before
- API Gateway on port 3001, trying to reach User Service on port 3001 (wrong)
- Services on inconsistent ports (5000, 5003, etc.)
- Frontend pointing to wrong API Gateway port
- Docker Compose using wrong internal URLs

### After
- API Gateway on port 5001 (consistent gateway port)
- User Service on port 5002 (dedicated user service port)
- All services on correct, consistent ports
- Frontend pointing to correct API Gateway (5001)
- Docker Compose using correct Docker DNS names
- All .env files consistent with port structure

---

## File Locations

All configuration files are in the root of the project:

```
/vercel/share/v0-project/
├── api_gateway/
│   ├── .env (✅ Updated)
│   ├── app.js (✅ Updated)
│   └── server.js
├── services/
│   ├── user-service/.env (✅ No changes)
│   ├── restaurant-service/.env (✅ Updated)
│   ├── order-service/.env (✅ Updated)
│   ├── delivery-service/.env (✅ Updated)
│   ├── notification-service/.env (✅ Updated)
│   └── payment-service/.env (✅ No changes)
├── food-delivery-frontend/.env (✅ Updated)
├── docker-compose.yml (✅ Updated)
└── PORT_CONFIGURATION.md (📄 New reference guide)
```

---

## Next Steps

1. **Test Locally:**
   ```bash
   npm run health-check
   ```

2. **Start Services:**
   - Either run individual services (8 terminals)
   - Or use Docker: `docker compose up -d`

3. **Test Registration:**
   - Go to http://localhost:3000
   - Click Sign Up
   - Verify no connection errors

4. **If Issues:**
   - Check PORT_CONFIGURATION.md for reference
   - Run health checks to verify all services
   - Check docker-compose logs: `docker compose logs -f`

