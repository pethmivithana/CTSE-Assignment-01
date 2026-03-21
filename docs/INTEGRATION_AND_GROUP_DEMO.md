# Inter-Service Integration (CTSE — Group Demo & Report)

Use this section for the **report** and **10-minute demonstration**: at least **one** integration between services, with a clear trigger and payload.

---

## 1. Example integration chains (end-to-end)

### A. Order placed → Notification + Delivery

1. **Order Service** creates order after payment (`POST /api/orders`).
2. **Order Service** calls **Delivery Service** `POST /api/delivery/deliveries` to create a delivery record.
3. **Order Service** calls **Notification Service** `POST /api/notifications/order-placed` (HTTP).
4. **Notification Service** resolves **restaurant manager** via Restaurant Service API and **customer** via User Service internal API; stores **in-app** rows and queues **email**.

**Demo script:** Place an order as customer → show new row in **Notifications** page and email log / SMTP.

### B. Payment completed → Order + Notification

1. **Payment Service** completes charge → `notifyOrderPayment` → **Order Service** `POST /api/orders/payment/webhook`.
2. **Payment Service** calls **Notification Service** `POST /api/notifications/payment-result`.

**Demo script:** Complete wallet/simulated payment → show order payment status + “Payment successful” notification.

### C. Delivery status → Order Service

1. **Delivery Service** (driver) updates status to `DELIVERED`.
2. **Delivery Service** calls **Order Service** `PATCH /api/orders/:id/status-update` with `DELIVERED`.

**Demo script:** Mark delivered in driver dashboard → order shows delivered in customer **Orders**.

---

## 2. “Four microservices” mapping (group of 4 students)

The codebase includes **more than four** deployable units; for the assignment you typically **assign one primary service per student**:

| Student | Primary service | Integrates with |
|---------|-----------------|-----------------|
| 1 | User Service | Restaurant, Delivery (registration) |
| 2 | Restaurant Service | Order (menu), User |
| 3 | Order Service | Restaurant, Delivery, Payment, Notification |
| 4 | Delivery Service | Order, Notification, User (driver) |

**Supporting:** API Gateway, Payment Service, Notification Service — shared infrastructure; document as such in the report.

---

## 3. Evidence for the report

- **Architecture diagram:** `docs/ARCHITECTURE.md`
- **OpenAPI contracts:** `docs/openapi/*.yaml`
- **CI/CD:** `.github/workflows/ci-cd.yml` (screenshot of green run)
- **SAST:** SonarCloud (or Snyk) dashboard screenshot

---

## 4. Challenges (template for report)

- **CORS / gateway URL:** Frontend must use correct `REACT_APP_API_URL` at build time.
- **Service discovery:** Use env vars `*_SERVICE_URL` in Docker Compose / cloud task definitions.
- **JWT shared secret:** Same `JWT_SECRET` across services that validate tokens.
