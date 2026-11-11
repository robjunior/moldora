# 3D Printing Quote System (MVP)

Internal platform for managing 3D resin (SLA/MSLA) printing quotes and orders, with technical analysis via **DragonFruit CLI** running in an isolated worker.

## Current status
- **Milestone 0 (DragonFruit CLI PoC):** structure and contract in progress. DragonFruit binary not detected in the current environment; the worker supports `DRAGONFRUIT_MODE=mock` to validate the pipeline/normalization/persistence and `DRAGONFRUIT_MODE=cli|auto` when the CLI is available.
- Sprints 1–6: incremental progress according to the technical backlog.

## Target architecture
- **Frontend:** Next.js + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node.js + NestJS (business rules, source of truth for commercial/financial state)
- **Worker:** asynchronous processing (BullMQ/Redis) + secure DragonFruit CLI execution
- **Database:** PostgreSQL + Prisma
- **Storage:** MinIO/S3 (private)
- **Automation:** n8n (notifications/integrations, without deciding financial states)
- **Payments:** gateway via `PaymentProvider` adapter

## Structure
```
apps/
  api/        # NestJS API
  web/        # Next.js admin/client
  worker/     # Jobs and slicer integration
packages/
  contracts/  # Types/DTOs/normalized slicer contract
  pricing/    # Pure pricing engine
prisma/       # Schema and migrations
docs/         # PoC, operations, ADRs
docker/       # Dockerfiles and configs
```

## Requirements
- Docker + Docker Compose
- Node.js (for local development outside containers)

## Start environment (base)
```bash
cp .env.example .env
docker compose up -d --build
```
> Services and apps will be added progressively; see `docker-compose.yml` and `TASKS.md`.

## DragonFruit PoC
- Capabilities/limitations: `docs/poc/dragonfruit-cli.md`
- Metrics validation (geometric vs consumption): `docs/poc/metrics-validation.md`
- CLI executor with whitelist, timeout, and no arbitrary shell execution (`apps/worker` / adapter).

## Key decisions
- Backend is the source of truth; n8n orchestrates events.
- Issued/approved quotes and proposals are immutable snapshots.
- Monetary values use decimal (never float).
- DragonFruit used as an external tool via CLI (evaluate AGPL before distribution/modification).

## Backlog
Track `TASKS.md` and the provided specification.
