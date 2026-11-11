<div align="center">

<img src="Moldora_%20Precis%C3%A3o%20em%20Cada%20Impress%C3%A3o.png" alt="Moldora — precision in every print" width="100%">

# 3D Printing Quote System (MVP)

**Internal platform for managing resin (SLA/MSLA) 3D printing quotes and orders, with technical analysis via DragonFruit CLI running in an isolated worker.**

[Overview](#overview) · [Status](#current-status) · [Architecture](#architecture) · [Tech stack](#tech-stack) · [Repository structure](#repository-structure) · [Getting started](#getting-started) · [Key docs](#key-docs) · [Security notes](#security-notes)

</div>

---

## Overview

This monorepo implements an MVP for operating a 3D printing business workflow end to end: customer and file intake, asynchronous slicing/analysis, pricing, quote lifecycle, order conversion, and payment tracking.

The system is designed so that the **backend is the source of truth** for commercial and financial state, while integrations (slicer, storage, automation, payments) are handled through isolated adapters/services.

### Core goals

- Centralize customers, 3D files, quotes, orders, and payments.
- Analyze uploaded models through a worker-driven **DragonFruit CLI** integration (with `cli | mock | auto` execution modes).
- Produce normalized slicing results that feed a pricing engine and quote item breakdowns.
- Keep quote issuance/approval traceable with immutable snapshots.
- Support manual, auditable operational control rather than opaque automation of financial decisions.

## Current status

> MVP in active development. Capabilities below reflect the current repository state (see [`TASKS.md`](TASKS.md) for the execution log).

### Implemented / in progress

- **Monorepo foundation:** `apps/api` (NestJS), `apps/web` (Next.js), `apps/worker`, `packages/contracts`, `packages/pricing`, Prisma schema, Docker config, and ops/PoC docs.
- **DragonFruit PoC pipeline:** secure CLI executor (no shell, command/profile whitelist, timeout), `cli|mock|auto` adapter, normalized result contract, and PoC run/persistence path. Real CLI validation is pending in an environment with DragonFruit installed.
- **Data model & seed:** PostgreSQL + Prisma schema synced; seed for admin/material/printer/profile.
- **API modules (MVP):** health, dashboard, settings, customers, printers, materials, files/upload registration, slicing jobs, quotes/items/pricing/recalc/send/approve/reject/convert, orders, payments (mock provider + idempotent webhook handling), basic auth guard/RBAC scaffolding, audit primitives.
- **Web app (scaffold):** Next.js pages for dashboard, customers, quotes, and orders.
- **Validated smoke flow:** `quote → item/pricing → recalc → send (snapshot) → approve → order → payment → webhook (CONFIRMED)` with payment/order updates and production logs.

### Pending / evolving

- Full Auth.js/session integration and complete RBAC hardening.
- MinIO/S3-backed private storage and temporary URLs (local storage fallback currently used).
- End-to-end runtime validation with real files/real DragonFruit CLI, queue/DLQ hardening.
- 3D viewer, PDF quote generation, real payment gateway, n8n workflows/event wiring, reporting/QA/security hardening.

## Architecture

```mermaid
flowchart LR
    U[Admin / Operator] --> WEB[Web App\nNext.js]
    WEB --> API[Backend API\nNestJS]
    API --> DB[(PostgreSQL)]
    API --> REDIS[(Redis / BullMQ)]
    API --> STORE[(Storage\nlocal / MinIO-S3)]
    REDIS --> WORKER[Worker\nslicing jobs]
    WORKER --> DF[DragonFruit CLI]
    WORKER --> DB
    API <--> PAY[Payment Provider\nadapter / mock]
    API --> N8N[n8n\nautomation]
    N8N --> MSG[Notifications / integrations]
```

### Architectural principles

- **Backend owns business truth:** pricing, quote state, orders, and payments are controlled by the API.
- **Asynchronous processing:** slicing/analysis runs off-request in the worker/queue.
- **Isolated integrations:** DragonFruit, storage, payments, and automation sit behind adapters.
- **Immutable commercial artifacts:** sent/approved quotes persist snapshots.
- **n8n is not transactional:** automation orchestrates events/notifications; it must not decide financial states.

Main flow: **Upload → slicing/analysis job → normalized result → pricing → quote snapshot → approval → order → payment → production**.

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 14, React 18, TypeScript, Tailwind CSS |
| API | Node.js, NestJS 10, TypeScript |
| Worker / Queue | Node/Bun worker, BullMQ, Redis (ioredis) |
| Database | PostgreSQL, Prisma |
| Contracts & pricing | Shared packages (`@print3d/contracts`, pricing engine) |
| Slicing integration | DragonFruit CLI (isolated execution, `cli|mock|auto`) |
| Storage | Local filesystem fallback; MinIO/S3 planned |
| Automation | n8n (infrastructure present, workflows pending) |
| Payments | `PaymentProvider` adapter (mock implemented) |
| Infrastructure | Docker Compose |

## Repository structure

```text
apps/
  api/        # NestJS API (business rules, source of truth)
  web/        # Next.js admin/client UI
  worker/     # Async jobs and DragonFruit/slicer integration
packages/
  contracts/  # Shared types/DTOs/normalized slicing contract
  pricing/    # Pricing engine
prisma/       # Schema, migrations/push workflow, seed
docs/
  ops/        # Architecture, runbook, security checklist
  poc/        # DragonFruit CLI and metrics validation notes
docker/       # Dockerfiles and service config
config/       # DragonFruit profiles/config
storage/      # Local upload/artifact storage (gitkept)
```

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js](https://nodejs.org/) >= 20 (for local development outside containers)
- [Bun](https://bun.sh/) is used by some worker/package scripts in this repo

### 1. Configure environment

```bash
cp .env.example .env
```

Review `.env` before running services (database, Redis, auth seed, DragonFruit paths/mode, storage, etc.). **Do not commit real credentials.**

### 2. Start infrastructure

```bash
docker compose up -d --build
```

> `postgres`, `redis`, and `n8n` are defined in Compose. `minio` may be unavailable in some environments; the project currently supports a local storage fallback. API/web/worker containerization and app services may evolve—check [`docker-compose.yml`](docker-compose.yml) and [`docs/ops/runbook.md`](docs/ops/runbook.md).

### 3. Database setup (local/dev)

```bash
# sync schema
DATABASE_URL=postgresql://print3d:print3d@localhost:5432/print3d?schema=public bunx prisma db push

# seed base data (admin, material, printer, profile)
DATABASE_URL=postgresql://print3d:print3d@localhost:5432/print3d?schema=public bun prisma/seed.ts
```

### 4. Run apps (development)

Commands vary by package manager/setup; typical entry points:

```bash
# API (example)
cd apps/api && DATABASE_URL=... REDIS_URL=... API_PORT=3001 bun src/main.ts

# Web
cd apps/web && bun run dev

# Worker
cd apps/worker && bun run dev
```

- API health check: `GET /api/v1/health`
- See package scripts in each app for the current dev/build commands.

### 5. DragonFruit worker modes

- `DRAGONFRUIT_MODE=mock` — deterministic/estimated output to validate pipeline/schema/persistence (not for real pricing).
- `DRAGONFRUIT_MODE=cli` — requires installed DragonFruit CLI and authorized profiles.
- `DRAGONFRUIT_MODE=auto` — use CLI when available, otherwise fall back to mock with explicit warning.

Example PoC run (mock, no persistence):

```bash
DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /path/to/model.stl --no-persist
```

## Key docs

- [`TASKS.md`](TASKS.md) — milestone/sprint execution log and validation notes
- [`docs/ops/architecture.md`](docs/ops/architecture.md) — module boundaries and main flow
- [`docs/ops/runbook.md`](docs/ops/runbook.md) — local operations/runbook and known environment blockers
- [`docs/ops/security-checklist.md`](docs/ops/security-checklist.md) — security checklist
- [`docs/poc/dragonfruit-cli.md`](docs/poc/dragonfruit-cli.md) — DragonFruit CLI PoC contract and gaps
- [`docs/poc/metrics-validation.md`](docs/poc/metrics-validation.md) — geometric vs consumption metrics validation

## Security notes

- Validate type, size, and content of uploaded files; isolate slicing execution and limit worker resources.
- Never execute slicer commands via shell; keep strict command/profile whitelists and timeouts.
- Validate payment webhooks (signature/value/identity) and enforce idempotency for financial events.
- Do not store sensitive card data in this system.
- Record administrative actions and relevant state changes (audit trail).
- Keep secrets in environment variables or an appropriate secret manager.

## License

No `LICENSE` file is currently included in this repository. Until one is added, do not assume the code is available under an open-source license.

---

<div align="center">

*MVP monorepo for resin 3D printing quoting, slicing analysis, and order operations.*

</div>
