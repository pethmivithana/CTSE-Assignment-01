# Run Feedo on a new machine (after `git clone`)

Share this with teammates who clone the repo on **Windows**, **macOS**, or **Linux**.

---

## 1. Prerequisites

| Tool | Why |
|------|-----|
| **Git** | Clone the repository |
| **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose plugin** (Linux) | Run MongoDB + all services + frontend |

Optional (only if you develop **without** Docker):

- **Node.js 18+** and `npm` — to run services or frontend locally

---

## 2. Clone the project

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
```

Use your real repo URL (HTTPS or SSH).

---

## 3. Environment files (important)

**Never commit real API keys.** The repo ships **templates only**.

### Root folder (Docker Compose)

```bash
# Windows (PowerShell or CMD)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit **`.env`** and set at least:

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | Same long random string for everyone on the team if you share one DB; or each dev can use a local value (some flows need consistency). |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) → **Test** secret key (`sk_test_...`). |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Same place → **Test** publishable key (`pk_test_...`). |
| `INTERNAL_API_KEY` | Keep the same value as in `.env.example` unless your team changes it everywhere (order/payment services use it). |
| `SMTP_*` | Optional — leave empty to log emails only; fill for real mail. |

### Payment service (local dev **without** Compose for that service only)

If you run the payment service **outside** Docker:

```bash
copy services\payment-service\.env.example services\payment-service\.env   # Windows
# cp services/payment-service/.env.example services/payment-service/.env    # macOS/Linux
```

Add the same **Stripe** keys as in the root `.env`.

> With **full Docker Compose**, payment gets env from Compose / root `.env`; a separate `payment-service/.env` is mainly for running that service alone.

### User / notification email (optional)

For SMTP when **not** using Compose, copy and edit:

- `services/user-service/.env` — see comments in repo for `SMTP_*` and `APP_URL`.

---

## 4. Run with Docker (recommended)

From the **repository root**:

```bash
docker compose build
docker compose up -d
```

First build can take several minutes.

### URLs

| What | URL |
|------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:3001 |
| Gateway health | http://localhost:3001/health |

### Useful commands

```bash
docker compose ps              # running containers
docker compose logs -f         # all logs (Ctrl+C to stop)
docker compose logs -f api-gateway
docker compose down            # stop stack
docker compose down -v         # stop + delete DB volumes (fresh DBs)
```

---

## 5. If `docker compose build` fails on the frontend

The project uses **`npm install --legacy-peer-deps`** in the frontend Dockerfile (React 19 + some libraries). If you still see errors, pull the latest `main` and try again.

---

## 6. Run without Docker (advanced)

Each service has its own `package.json`. Typical order: MongoDB running locally → start services by port (see `docs/DEPLOYMENT_AND_DEVOPS.md`). The **API Gateway** and **frontend** expect the same URLs as in `.env.example`.

---

## 7. Group / friend checklist

- [ ] Docker installed and **running** (whale icon on Windows/Mac).
- [ ] Cloned repo and `cd` into project root.
- [ ] Copied `.env.example` → `.env` and set **Stripe test keys** (and `JWT_SECRET` as agreed).
- [ ] `docker compose build` then `docker compose up -d`.
- [ ] Open http://localhost:3000 and http://localhost:3001/health.

---

## 8. More detail

- Full DevOps / CI: [`DEPLOYMENT_AND_DEVOPS.md`](./DEPLOYMENT_AND_DEVOPS.md)
- Secret scanning / no keys in Git: [`SECRET_SCANNING_FIX.md`](./SECRET_SCANNING_FIX.md)
