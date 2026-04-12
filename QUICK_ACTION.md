# Quick Action: Fix & Test Registration - 5 Minutes

## The Problem ❌
Registration fails with: `ECONNREFUSED 127.0.0.1:5002`

## The Solution ✓
User Service port was wrong. We fixed it. Now restart services.

---

## DO THIS NOW (Choose One)

### 🐳 OPTION A: Using Docker (Recommended - 2 min)

Copy & paste these commands:

```bash
# Stop old services
docker compose down -v

# Start everything fresh
docker compose up -d

# Wait for startup
sleep 10

# Check status
npm run health-check

# Now test: http://localhost:3000 → Click Sign Up
```

**What you should see:**
```
Running Services (9):
  ✓ MongoDB
  ✓ API Gateway
  ✓ User Service        ← This was the problem, now fixed!
  ✓ Restaurant Service
  ✓ Order Service
  ✓ Delivery Service
  ✓ Notification Service
  ✓ Payment Service
  ✓ Frontend
```

---

### 💻 OPTION B: Local Development (Without Docker - 3 min)

**Open 6 terminals and run in each (top to bottom):**

**Terminal 1:**
```bash
mongod
```

**Terminal 2:**
```bash
cd services/user-service && npm install && npm start
# Should show: "Server running on port 5002"
```

**Terminal 3:**
```bash
cd services/restaurant-service && npm install && npm start
```

**Terminal 4:**
```bash
cd services/order-service && npm install && npm start
```

**Terminal 5:**
```bash
cd api_gateway && npm install && npm start
# Should show: "API Gateway running on port 3001"
```

**Terminal 6:**
```bash
cd food-delivery-frontend && npm install && npm start
# Opens http://localhost:3000
```

Then in a 7th terminal:
```bash
npm run health-check
```

---

## TEST IT (30 seconds)

1. Open http://localhost:3000
2. Click "Sign Up" button
3. Fill in form:
   ```
   Full Name:    Test User
   Email:        test@example.com
   Password:     Test@123
   Phone:        0712345678
   ```
4. Click Register
5. Should see success! ✓

---

## IF IT STILL DOESN'T WORK

**Run diagnostics:**
```bash
# Check all services
npm run health-check

# See what's running
docker ps -a

# Check user service port (should be 5002)
curl http://localhost:5002/health

# View logs
docker logs feedo-user-service -f
```

**Full reset:**
```bash
docker compose down -v
docker compose build --pull
docker compose up -d
sleep 10
npm run health-check
```

---

## WHAT WE FIXED

| Issue | What Was Wrong | How We Fixed It |
|-------|---|---|
| **User Service Port** | Was 3002 | Changed to 5002 |
| **API Gateway Config** | Didn't exist | Created complete gateway |
| **Docker Config** | Wrong port mapping | Updated docker-compose |
| **No Diagnostics** | Can't see what's broken | Added health-check tool |

---

## KEY PORTS (For Reference)

```
Frontend           → 3000
API Gateway        → 3001  ← Your app's main entry point
User Service       → 5002  ← Registration/Login (THIS WAS THE BUG!)
Restaurant Service → 3002
Order Service      → 3004
Delivery Service   → 3003
Notification Svc   → 3005
Payment Service    → 3006
MongoDB            → 27017
```

---

## FILES WE FIXED/CREATED

✅ Fixed: `services/user-service/.env` (PORT=5002)
✅ Fixed: `docker-compose.yml` (correct URLs and ports)
✅ Created: `api_gateway/app.js` (complete gateway)
✅ Created: `api_gateway/server.js` (gateway server)
✅ Created: `api_gateway/package.json` (gateway dependencies)
✅ Created: `api_gateway/.env` (gateway config)
✅ Created: `scripts/health-check.js` (diagnostics tool)
✅ Added: `npm run health-check` (in package.json)

---

## COMMANDS YOU'LL USE

```bash
# Check what's running
npm run health-check

# Stop everything
docker compose down

# Start everything
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker logs feedo-user-service

# Restart a service
docker restart feedo-user-service

# Remove everything (start fresh)
docker compose down -v
docker compose build --pull
docker compose up -d
```

---

## DON'T FORGET

After making changes:
1. Stop containers: `docker compose down`
2. Start containers: `docker compose up -d`
3. Wait 10 seconds
4. Check: `npm run health-check`
5. Test: http://localhost:3000

---

## STILL STUCK?

Read these files in order:
1. **FIX_SUMMARY.md** - What we fixed and why
2. **SERVICE_ARCHITECTURE.md** - How services connect
3. **TROUBLESHOOTING.md** - Detailed solutions

---

## Next Steps After Registration Works

1. ✅ Test registration (you are here)
2. Test login
3. Browse restaurants
4. Place an order
5. Track delivery
6. Make payment
7. Deploy to Azure (use AZURE_DEPLOYMENT_GUIDE.md)

---

**Status:** Ready to test  
**Time to complete:** 5 minutes  
**Difficulty:** Easy ✓

Go test registration now! → http://localhost:3000
