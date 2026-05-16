# Workflow Engine Backend

A multi-tenant workflow and approval engine built with:

* Express 5
* TypeScript
* Prisma ORM
* PostgreSQL
* Docker

# Features

* Multi-tenant workflow system
* Workflow versioning
* Approval system
* Item transitions
* Delegation support
* SLA tracking
* Audit logs
* Optimistic locking
* Idempotent transitions
* Swagger API documentation

---

# Tech Stack

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* PostgreSQL
* Docker
* Swagger

---

# Project Structure

```bash
workflow-engine/
├── src/
├── prisma/
├── workflow-engine-frontend/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

# Requirements

* Node.js `20+`
* Docker Desktop
* PostgreSQL (only for local setup)

---

# Quick Start (Docker Recommended)

## 1. Install Docker

Install Docker Desktop:

* Windows / Mac:

  * [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

---

## 2. Start Application

From project root:

```bash
docker compose up --build -d
```

This starts:

| Service      | URL                                                              |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | [http://localhost](http://localhost)                             |
| Backend API  | [http://localhost:3000](http://localhost:3000)                   |
| Swagger Docs | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| PostgreSQL   | localhost:5432                                                   |

---

## 3. Run Database Migration

```bash
docker compose exec backend npx prisma migrate deploy
```

---

## 4. Run Seed Data

```bash
docker compose exec backend npx prisma db seed
```

---

## 5. Check Backend Logs

```bash
docker compose logs -f backend
```

You should see:

```bash
Seed complete
```

---

# Seed Users

| Role     | Email                                                 | Password |
| -------- | ----------------------------------------------------- | -------- |
| Admin    | [admin@workflow.com](mailto:admin@workflow.com)       | Pass@321 |
| Creator  | [creater@workflow.com](mailto:creater@workflow.com)   | Pass@321 |
| Approver | [approver@workflow.com](mailto:approver@workflow.com) | Pass@321 |

---

# Seeded Tenant

| Name        | Slug        |
| ----------- | ----------- |
| Amer Center | amer-center |

---

# Seeded Workflow

## Workflow Name

```text
Dubai Visa Process
```

## States

```text
draft → review → approved
```

## Flow

* Creator creates item
* Approver approves item
* Item moves to approved state

---

# Local Development Setup

## 1. Install Dependencies

### Backend

```bash
npm install
```

### Frontend

```bash
cd workflow-engine-frontend
npm install
cd ..
```

---

## 2. Setup Environment

Create `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/workflow_engine"
JWT_SECRET="your-secret"
PORT=3000
```

---

## 3. Start PostgreSQL

```bash
docker compose up -d db
```

---

## 4. Generate Prisma Client

```bash
npx prisma generate
```

---

## 5. Run Migration

```bash
npx prisma migrate dev
```

---

## 6. Run Seed

```bash
npx prisma db seed
```

---

## 7. Start Backend

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:3000
```

---

## 8. Start Frontend

```bash
cd workflow-engine-frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# API Endpoints

## Health Check

```http
GET /health
```

Example:

```bash
curl http://localhost:3000/health
```

---

## Swagger API Docs

```text
http://localhost:3000/api-docs
```

---

## API Base URL

```text
http://localhost:3000/api/v1
```

---

# Authentication Example

## Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email":"admin@workflow.com",
  "password":"Pass@321"
}'
```

---

# Tenant Header

For tenant APIs send:

```http
X-Tenant-Id: <tenant-id>
```

---

# Important Scripts

| Script                  | Description                  |
| ----------------------- | ---------------------------- |
| npm run dev             | Start backend in development |
| npm run build           | Build backend                |
| npm start               | Start production server      |
| npm run prisma:generate | Generate Prisma client       |
| npm run prisma:migrate  | Run Prisma migration         |
| npm run prisma:deploy   | Deploy migrations            |
| npm run prisma:seed     | Run seed data                |

---

# Docker Commands

## Start Containers

```bash
docker compose up --build -d
```

## Stop Containers

```bash
docker compose down
```

## View Logs

```bash
docker compose logs -f
```

## Restart Containers

```bash
docker compose restart
```

---

# Main Workflow Concepts

## Workflow

Defines process steps and transitions.

Example:

```text
draft → review → approved
```

---

## Item

An item moves through workflow states.

Example:

```text
Visa Application
```

---

## Approval

Approvers can approve or reject workflow items.

---

## SLA

Tracks delayed items and escalation rules.

---

# License

MIT
