# Deployment, Docker, GitHub & CI/CD — Feedo (CTSE)

This document explains how to run the stack with Docker, publish images, use Git with GitHub, and what the CI/CD pipeline does.

---

## 1. Architecture (quick reference)

| Component | Default port | Role |
|-----------|--------------|------|
| Frontend (nginx + React build) | 3000 | Web UI |
| API Gateway | 3001 | Single entry: `/auth`, `/api/*`, `/users`, … |
| User Service | 3001 (internal) | Auth, profiles |
| Restaurant Service | 3002 | Menus, restaurants |
| Delivery Service | 3003 | Drivers, tracking |
| Order Service | 3004 | Orders |
| Notification Service | 3005 | Email, in-app, push stubs |
| Payment Service | 3006 | Stripe, wallet, PayPal |
| MongoDB | 27017 | Databases per service |

> The **browser** only talks to **API Gateway (3001)** and static files from **Frontend (3000)**.  
> Set `REACT_APP_API_URL` to the **public URL of the gateway** when building the frontend for production.

---

## 2. Docker concepts (for the assignment)

- **Image** — blueprint (Node + your code + dependencies).  
  Build: `docker build -t myname:tag -f path/Dockerfile path/context`
- **Container** — running instance of an image.
- **Docker Compose** — runs multiple containers, networks, volumes, env vars together.  
  File: `docker-compose.yml` at repo root.

---

## 3. Run everything locally (Compose)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2).

```bash
cd Feedo
# Optional: copy env
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

docker compose build
docker compose up -d
```

- Wait for **MongoDB** healthcheck, then services start in dependency order.
- Open **http://localhost:3000** (frontend) and **http://localhost:3001/health** (gateway).

**Logs:**

```bash
docker compose logs -f api-gateway
docker compose logs -f notification-service
```

**Stop / clean:**

```bash
docker compose down
# Remove volumes too (wipes DBs):
docker compose down -v
```

---

## 4. Build a single image (manual)

Example — notification service:

```bash
docker build -t feedo-notification:local -f services/notification-service/Dockerfile services/notification-service
docker run --rm -p 3005:3005 -e MONGODB_URI=mongodb://host.docker.internal:27017/feedo_notifications feedo-notification:local
```

> On Linux, use your host Mongo IP or run Mongo in Compose and attach to the same network.

---

## 5. Git & GitHub

### First-time push

```bash
git init
git remote add origin https://github.com/YOUR_USER/Feedo.git
git branch -M main
git add .
git commit -m "feat: initial Feedo microservices"
git push -u origin main
```

### Good commit habits (for assignments)

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`
- Small commits per feature; write what changed in the subject line.

### Branches & PRs

- Work on `feature/xyz` or `fix/xyz`.
- Open **Pull Request** into `main` — this triggers CI on the PR without pushing images (see below).

---

## 6. CI/CD — what happens in GitHub Actions?

Workflow: **`.github/workflows/ci-cd.yml`**

| Trigger | What runs |
|---------|-----------|
| **Pull request** to `main` / `master` | For each service: `npm install`, `npm test` (if present), **Docker build** to verify Dockerfile. API Gateway + Frontend build jobs. **No** registry push. |
| **Push** to `main` / `master` | Same tests/builds **plus** **push** Docker images to **GitHub Container Registry (GHCR)**. |
| **workflow_dispatch** | Manual run from GitHub → Actions → CI/CD → Run workflow. |

### Image tags

Images are pushed as:

`ghcr.io/<YOUR_GITHUB_USER>/feedo-<service>:<git-sha>`  
`ghcr.io/<YOUR_GITHUB_USER>/feedo-<service>:latest`

Examples: `feedo-user-service`, `feedo-api-gateway`, `feedo-frontend`.

**Authentication:** `GITHUB_TOKEN` is injected automatically for pushes to GHCR in the same repo.

### SonarCloud (SAST / DevSecOps)

Workflow: **`.github/workflows/sonarcloud.yml`**

1. Create a project at [sonarcloud.io](https://sonarcloud.io).
2. Set `sonar.organization` in `sonar-project.properties` (replace `YOUR_SONARCLOUD_ORG`).
3. Add repo secret **`SONAR_TOKEN`** (SonarCloud → My Account → Security).

---

## 7. Production checklist

1. **Secrets:** Strong `JWT_SECRET`, optional `INTERNAL_API_KEY` shared by services that call notification-service.
2. **Frontend build:** `REACT_APP_API_URL=https://api.yourdomain.com` at **build time** (React embeds env at build).
3. **HTTPS** in front of gateway (nginx, Traefik, cloud load balancer).
4. **MongoDB:** Use managed DB or secured VM; update `MONGO_URI` / `MONGODB_URI` in Compose or orchestrator.
5. **SMTP** for real emails on user + notification services.

---

## 8. Assignment report tips

- Paste architecture diagram from `docs/ARCHITECTURE.md`.
- Describe **one** microservice in depth (endpoints, DB, how it talks to others).
- Screenshot **GitHub Actions** run (green checkmarks).
- Mention **Docker** image + **Compose** stack.
- Optional: screenshot **SonarCloud** quality gate.

---

## 9. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Gateway 502 | Target service down or wrong `*_SERVICE_URL` in gateway env. |
| Frontend calls wrong API | Rebuild frontend with correct `REACT_APP_API_URL`. |
| Notification inbox empty | Notification service Mongo + JWT same as user service; user must be logged in. |
| CI Docker build fails | Dockerfile path; run `docker build` locally with same `-f` and context. |
