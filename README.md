# Workflow Engine Assignment

A production-oriented multi-tenant workflow and approval engine built with:

- **Backend**: Express 5 + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL
- **Containerization**: Docker + Docker Compose

The system supports workflow creation, approvals, delegation, SLA tracking, audit logging, and strict tenant isolation.

---

# Project Structure

```text
workflow-assignment/
├── backend/                 # Express + Prisma API
├── frontend/                # React frontend
├── docker-compose.yml
└── README.md
```

---

# Features

## Backend

- Multi-tenant architecture
- Workflow versioning
- Approval engine (Single / All / Quorum)
- Delegation support
- Optimistic locking
- Idempotent transitions
- Immutable audit logs
- SLA rule storage and escalation support
- Swagger/OpenAPI documentation
- Prisma ORM with PostgreSQL

## Frontend

- Workflow builder UI
- Item lifecycle management
- Approval dashboards
- Delegation management
- SLA monitoring
- Responsive UI
- Role-based access control

---

# Tech Stack

## Backend

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod validation
- JWT authentication

## Frontend

- React
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- React Router
- Axios

---

# Prerequisites

Install:

- Docker
- Docker Compose

Recommended:

- Node.js 20.19+ (only needed for local non-docker development)

---

# Quick Start (Recommended)

## 1. Clone Repository

```bash
git clone <your-repository-url>
cd workflow-assignment
```

---

## 2. Start Application

```bash
docker compose up --build
```

This starts:

- PostgreSQL database
- Backend API
- Frontend application

---

## 3. Run Database Migrations

Open a new terminal:

```bash
docker compose exec backend npx prisma migrate deploy
```

---

## 4. Seed Database

```bash
docker compose exec backend npx prisma db seed
```

---

# Application URLs

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api-docs |
| Health Check | http://localhost:3000/health |
| PostgreSQL | localhost:5432 |

---

# Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@workflow.com | Admin123!Admin123! |
| User | user@workflow.com | User123!User123! |

---

# Tenant Information

Tenant slug:

```text
acme
```

Tenant-scoped APIs require:

```http
X-Tenant-Id: <tenant-uuid>
```

---

# API Base URL

```text
http://localhost:3000/api/v1
```

---

# Example Login Request

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"admin@workflow.com",
    "password":"Admin123!Admin123!"
  }'
```

---

# Manual Development Setup (Optional)

## Backend

```bash
cd backend

npm install

cp .env.example .env

npx prisma generate
npx prisma migrate dev
npx prisma db seed

npm run dev
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Backend Architecture

- Thin controllers
- Service-layer business logic
- Prisma transactions
- Tenant-scoped queries
- Structured logging
- Centralized error handling
- Workflow versioning
- Approval orchestration

---

# Important Workflow Features

## Workflow Versioning

Published workflows are immutable.

Changes create new draft versions.

---

## Approvals

Supports:

- SINGLE
- ALL
- QUORUM

Approval rejections immediately terminate workflow progression.

---

## Delegation

Approvers can delegate approval authority to eligible users within the same tenant.

---

## Optimistic Locking

Workflow item transitions use version-based optimistic concurrency control.

---

## Idempotency

Transition APIs support:

```http
Idempotency-Key
```

to safely retry requests.

---

# Frontend Features

- Workflow builder
- Approval management
- SLA monitoring
- Delegation UI
- Responsive dashboards
- Role-based access

---

# Docker Notes

The application uses a single `docker-compose.yml` file to orchestrate:

- PostgreSQL
- Backend API
- Frontend

---

# Useful Commands

## Start

```bash
docker compose up --build
```

## Stop

```bash
docker compose down
```

## View Logs

```bash
docker compose logs -f
```

## Restart

```bash
docker compose restart
```

---

# Assumptions / Notes

- PostgreSQL runs locally inside Docker
- Default ports are exposed for local development
- Seed data is included for demonstration/testing
- Frontend communicates with backend through Docker networking

---

# License

MIT