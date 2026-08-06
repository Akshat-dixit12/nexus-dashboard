# Nexus Dashboard — Multi-Tenant SaaS Platform

> **Portfolio Project** — Built to demonstrate production-grade backend engineering skills using Python, FastAPI, PostgreSQL, and Stripe.

A full-stack, multi-tenant SaaS dashboard with role-based access control, JWT authentication, Stripe billing, and real-time analytics.

---

## What This Project Showcases

### Backend Engineering (FastAPI + Python)
- **Multi-Tenancy & Data Isolation** — All API endpoints scope data strictly by `tenant_id` derived server-side from signed JWT claims. Client-supplied tenant IDs are never trusted.
- **JWT Authentication with Token Rotation** — Secure registration, login, access token issuance, refresh token rotation (`POST /auth/refresh`), and revocation on logout (`POST /auth/logout`).
- **Role-Based Access Control (RBAC)** — Reusable FastAPI dependency factory `require_role(*roles)` enforcing fine-grained role restrictions (`owner`, `admin`, `viewer`) across all endpoints.
- **Defense-in-Depth Superadmin Security** — Superadmin endpoints enforce a dual-layer check: JWT role validation **and** an independent server-side allowlist (`SUPERADMIN_EMAILS`). Impersonation tokens issue tenant-scoped `owner` access — never superadmin privileges.
- **Stripe Billing Integration** — Checkout session creation, signed webhook event processing (`checkout.session.completed`) with HMAC signature verification, and automatic plan sync via Stripe Subscription API.
- **Activity Logging & 30-Day Analytics** — Automated audit trail for logins, invitations, role changes, and plan upgrades. Paired with a continuous 30-day time-series analytics API (`GET /analytics/activity`).
- **Database Migrations with Alembic** — Full schema versioning using SQLAlchemy ORM + Alembic migration scripts.
- **Containerized with Docker Compose** — One-command local setup for PostgreSQL and the FastAPI backend.

### Frontend (Next.js 14)
- **App Router + TypeScript** — Fully typed Next.js 14 application with server-side routing guards.
- **Axios Interceptor with Auto-Refresh** — Automatic silent token refresh on 401 responses before retrying the original request.
- **Edge Middleware Auth Guard** — Next.js middleware protects all dashboard routes at the edge, redirecting unauthenticated users to login.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy ORM, Alembic, PyJWT, bcrypt, Stripe SDK |
| **Database** | PostgreSQL |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Infrastructure** | Docker & Docker Compose |

---

## Quick Start & Local Setup

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v18+) & Python (v3.11+)

### 2. Environment Configuration
```bash
cd backend && cp .env.example .env
cd ../frontend && cp .env.local.example .env.local
```

### 3. Start Database & Backend
```bash
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed
```

Verify backend health:
```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

### 4. Start Frontend Dev Server
```bash
cd frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Default Seeded Credentials

| Tenant | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Acme Corp** (Pro) | `owner@acme.com` | `password123` | Owner |
| **Acme Corp** (Pro) | `admin@acme.com` | `password123` | Admin |
| **Acme Corp** (Pro) | `viewer@acme.com` | `password123` | Viewer |
| **Beta Studio** (Free) | `owner@beta.com` | `password123` | Owner |
| **Beta Studio** (Free) | `viewer@beta.com` | `password123` | Viewer |
| **Platform** | `super@nexus.com` | `superpassword` | Superadmin |

---

## Deployment

### Backend → Railway
1. Connect repository to **Railway** and add a managed **PostgreSQL** service.
2. Set environment variables: `DATABASE_URL`, `SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPERADMIN_EMAILS`, `FRONTEND_URL`.
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Run in Railway console: `alembic upgrade head && python -m app.seed`

### Frontend → Vercel
1. Import repository into **Vercel**.
2. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL.

### Stripe Webhook
Configure endpoint in the Stripe Dashboard:
`https://your-backend.up.railway.app/billing/webhook` → listening for `checkout.session.completed`.
