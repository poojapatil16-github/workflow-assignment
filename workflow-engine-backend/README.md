# Workflow Engine Backend

Production-oriented **Express 5 + TypeScript + Prisma + PostgreSQL** service for a **multi-tenant workflow and approval engine** with strict tenant isolation, workflow versioning, optimistic locking, idempotent transitions, immutable audit logs, delegations, and SLA rule storage (escalation-ready).

## Quick start

1. **Clone and Install**

   ```bash
   npm install
   cd workflow-engine-frontend && npm install && cd ..
   ```

   Use **Node.js 20.19+**, **22.12+**, or **24+** (required by Prisma ORM 7).

2. **Docker Support (Recommended)**

   The project includes a full Docker setup for the database, backend, and frontend.

   ```bash
   docker-compose up --build -d
   ```

   - Frontend: `http://localhost` (Port 80)
   - Backend API: `http://localhost:3000`
   - Database: `localhost:5432`

   After starting, run migrations and seed (inside backend container or locally if configured):
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npx prisma db seed
   ```

3. **Manual Start (Alternative)**

   **Start PostgreSQL**
   ```bash
   docker-compose up -d db
   ```

   **Configure environment**
   ```bash
   cp .env.example .env
   # Set JWT_SECRET in .env
   ```

   **Backend Setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

   **Frontend Setup**
   ```bash
   cd workflow-engine-frontend
   npm run dev
   ```

- Health: `GET http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/api-docs`
- API base: `http://localhost:3000/api/v1`

### Seed credentials

| Role  | Email                 | Password               |
|-------|------------------------|------------------------|
| Admin | `admin@workflow.com`   | `Admin123!Admin123!`   |
| User  | `user@workflow.com`    | `User123!User123!`     |

Tenant slug: `acme`. Use `X-Tenant-Id: <tenant-uuid>` after resolving the tenant id (returned from login flows or `GET /api/v1/tenants`).

## Architecture

- **HTTP layer**: thin controllers under `src/modules/*` wiring validation and responses.
- **Domain services**: orchestration and Prisma transactions (`*.service.ts`).
- **Cross-cutting**: middleware (`auth`, `tenant`, `roles`, `errors`, structured request logging), centralized `AppError`, Zod validation helpers.
- **Persistence**: Prisma models with explicit `tenantId` on tenant-owned rows; every tenant-scoped query filters by `tenantId` from validated membership (see `tenant.middleware.ts`).
- **Auth**: Case-insensitive email uniqueness and login.
- **Workflow Engine**: Terminal state handling (`REJECTED` terminates journeys).
- **Approvals**: Centralized permission logic with dynamic delegation support.
- **SLA**: Manual escalation and breach detection.
- **Performance**: Optimistic locking and transaction-safe transitions.

### Prisma ORM 7 configuration

- **`prisma/schema.prisma`**: `datasource` declares `provider` only (no `url` here). `generator client` sets `output = "../generated/prisma"`.
- **`prisma.config.ts`**: supplies `datasource.url` via `env('DATABASE_URL')` for Migrate and other CLI commands, plus `migrations.seed`.
- **Runtime client**: `src/prisma.ts` builds `PrismaClient` with **`@prisma/adapter-pg`** and `DATABASE_URL` by default, or with **`accelerateUrl`** when `PRISMA_ACCELERATE_URL` is set (see [Prisma 7 client config](https://pris.ly/d/prisma7-client-config)).
- The `npm run build` script runs **`prisma generate`** first, then `tsc` (the `generated/` directory is gitignored).

### Tenant isolation

- Clients send **`X-Tenant-Id`** on tenant routes.
- `tenantMiddleware` loads membership for `(userId, tenantId)` and sets `req.tenantId` / `req.tenantRole`.
- Services additionally scope Prisma queries by `tenantId` to avoid accidental cross-tenant reads.

### Workflow versioning

- Each `Workflow` owns many `WorkflowVersion` rows (`version` integer, `DRAFT` | `PUBLISHED` | `ARCHIVED`).
- **Never mutate** published graph data in place: new edits create a **new draft version** (`POST /workflows/:id/version`).
- **Publish** (`POST /workflows/:id/publish` with `{ "versionId": "..." }`) validates the graph, archives any previously `PUBLISHED` version for that workflow, and marks the target version `PUBLISHED`.

### Workflow validation

- Exactly **one** initial state.
- Unique state names per version.
- Transitions reference states within the same version.
- Approval transitions require `approvalMode`, approvers, and quorum rules when applicable.

### Items, transitions, approvals

- Items bind to a **published** `workflowVersionId` and a `currentStateId`.
- `POST /items/:id/transitions` validates:

  1. Tenant + membership
  2. Transition belongs to the item’s workflow version
  3. Current state matches transition’s `fromStateId`
  4. **Optimistic lock**: `clientVersion` must match `items.version`; successful updates increment `version`
  5. If `requiresApproval`, creates `Approval` + `ApprovalVote` rows and records an `ItemTransition` row with `toStateId = null` and metadata linking the approval
  6. Otherwise updates state, writes `ItemTransition`, and appends audit `ITEM_TRANSITIONED`

### Idempotency

- Optional header **`Idempotency-Key`** on `POST /items/:id/transitions`.
- First successful request persists `ItemTransition` with `(itemId, idempotencyKey)` unique; retries return the stored row and current item snapshot.

### Approvals (SINGLE / ALL / QUORUM)

- Votes are per assignee (`ApprovalVote`), with `@@unique([approvalId, assigneeUserId])`.
- **Delegation**: an actor may satisfy another user’s slot when an active `Delegation` exists from assignee → actor within the window; `delegatedFromUserId` records the assignee principal.
- Outcome evaluation rejects on any **REJECT** vote, otherwise applies mode rules; on final **APPROVED**, the transition is applied in the same transaction with version checks.

### Observability & Logging

- **Structured Logging**: Consistent logging across all modules using a centralized logger.
- **Context Propagation**: Automatic propagation of `requestId`, `userId`, and `tenantId` through all service layers using `AsyncLocalStorage`.
- **Request Tracing**: Every request is assigned a unique `requestId` for end-to-end tracing.
- **Secure Logs**: Sensitive data (passwords, tokens) and PII (emails) are automatically masked or excluded from logs.
- **Error Observability**: Detailed error logging including stack traces and sanitized request context.

### SLA & Escalation

- `SlaRule` ties a `workflowVersionId` + `workflowStateId` to `durationMinutes` and optional `escalateToUserId`.
- Items can be checked for SLA breaches.
- `recordSlaEscalationAudit` is a **hook** for schedulers to emit `SLA_ESCALATION` audit entries.
- UI supports manual "Escalate" action for breached items.

### Approval Delegation

- Approvers can delegate their authority to eligible `CREATOR` users within the same tenant.
- Delegation is persistent until manually removed.
- Delegated users receive dynamic `APPROVER` permissions for the duration of the delegation.
- Original approver loses authority while delegation is active.

### Terminal States

- Items can reach terminal states: `APPROVED`, `REJECTED`, `COMPLETED`.
- `REJECTED` state immediately terminates the workflow journey.
- No further transitions are allowed once an item reaches a terminal state.

## Docker image

```bash
docker build -t workflow-engine-api .
```

The `Dockerfile` installs the Prisma CLI in the runtime image so you can run migrations in your orchestrator (`prisma migrate deploy`) before starting `node dist/server.js`.

## API examples

### Login

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@acme.example","password":"Admin123!Admin123!"}'
```

### Tenant-scoped call

```bash
TOKEN=... # from login
TENANT=... # tenant UUID

curl -s http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"
```

### Transition with idempotency + optimistic version

```bash
curl -s -X POST http://localhost:3000/api/v1/items/$ITEM_ID/transitions \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Idempotency-Key: demo-key-1" \
  -H "Content-Type: application/json" \
  -d '{"transitionId":"...","clientVersion":1}'
```

## Scripts

| Script            | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Run API with `tsx` (ESM)       |
| `npm run build`   | `prisma generate` then emit `dist/` |
| `npm start`       | Run compiled `dist/server.js`  |
| `npm run prisma:generate` | `prisma generate`        |
| `npm run prisma:migrate`  | `prisma migrate dev`     |
| `npm run prisma:deploy`   | `prisma migrate deploy`  |
| `npm run prisma:seed`     | `prisma db seed`         |

## OpenAPI / Swagger

- Served at **`/api-docs`**.
- Built with **`swagger-jsdoc`** (see `src/config/swagger-annotations.ts`) merged with the programmatic document in `src/config/openapi-spec.ts`.

## License

MIT
