# Execution Log / Task Tracker

> **Status legend:** `[x]` done · `[~]` partial/in progress · `[ ]` not started. This file is the project’s working roadmap and execution log; entries reflect what is implemented/validated in this repository (mock-mode validations are called out explicitly where real external dependencies are unavailable).

## Milestone 0 — DragonFruit CLI PoC (complete in mock mode)
- [x] POC-01 Docker env base (postgres/redis/n8n up; MinIO image pull blocked in this environment) + worker/packages/docs structure
- [x] POC-02 CLI capabilities doc (local environment: CLI not installed; contract/limitations documented) — `docs/poc/dragonfruit-cli.md`
- [x] POC-03 Secure CLI executor (spawn without shell, cmd/subcmd whitelist, timeout, authorized profile validation) — `apps/worker/src/lib/exec.ts`, `apps/worker/src/slicer/dragonfruit.ts`
- [x] POC-04 Analysis pipeline (adapter `cli|mock|auto`, best-effort normalization, `run-once` runner) — validated in mock mode
- [x] POC-05 Normalize results (contract `@print3d/contracts`, `capabilitiesGaps`, `warnings`, raw preserved)
- [x] POC-06 Persist jobs/results (Prisma schema + `prisma db push` applied; `run-once` persists PoC job/file/customer with `DATABASE_URL`)
- [x] POC-07 Metrics validation doc (geometric vs consumption, priority source slice/scene) — `docs/poc/metrics-validation.md`
- [x] POC-08 Retries/idempotency hardening (base: job states, per-job reprocessing, structured failures; BullMQ DLQ to evolve)

## Sprint 1 — Foundation
- [~] INF-01 Base monorepo structure (`apps/api`, `apps/web`, `apps/worker`, `packages/*`, `prisma/`, `docs/`, `docker/`)
- [~] INF-02 Docker Compose (postgres, redis, n8n active; minio commented out due to registry block in environment; api/web/worker containers pending)
- [x] INF-03 PostgreSQL + Prisma schema synced (`db push`) and seed applied (`prisma/seed.ts`: admin, material, printer, profile)
- [~] INF-04 Auth MVP (guard `SimpleAuthGuard` + `@Public()`; dev bypass if `ADMIN_API_TOKEN` absent, Bearer token if set) — full Auth.js/session integration pending
- [~] INF-05 Base authorization/RBAC (global guard ready to harden; full roles pending)
- [~] INF-06 Storage (local structure + file registration via API; MinIO/S3 integration and temporary URLs pending)
- [~] INF-07 Observability/audit (`AuditLog` table, `SystemSetting`; base interceptor/util created, full global integration and structured logs pending)
- [~] CRM-01/02/03 Customers API CRUD/archive + placeholder web pages (full functional UI/search/history pending)

## Sprint 2 — 3D Files and Processing
- [~] STL-01 Real upload/validation (multipart upload, format/size/hash, local storage, metadata registration via API) — deeper content validation/magic bytes and MinIO/S3 pending
- [x] STL-04/05 (MVP runtime): DragonFruit adapter integration + job persistence + API→BullMQ enqueueing and worker queue consumer wired; end-to-end validated (mock mode): upload file → create slicing job → worker processes → `SUCCEEDED` with normalized result persisted
- [ ] STL-07 3D viewer pending

## Sprint 3 — Materials/Pricing
- [x] MAT-01/03/04 Base: materials/printers/profiles CRUD via API (initial seed)
- [x] PRICE-01/04/05: quote pricing now uses shared `@print3d/pricing` engine (`volumeMl`, losses, costs, margin), stores calculation breakdown + inputs in `QuoteItem.breakdownJson`, and recalculates totals
- [~] MAT-02/PRICE-02/03/06/07 config history/versioning and advanced cases (plate vs model, dedicated unit tests) pending

## Sprint 4 — Quotes/Commercial/Financial
- [~] QUO-01/02/07/08 (partial): quote creation, items, recalculation, send with basic immutable snapshot, approve/reject, conversion to order; full state machine/versions pending
- [ ] QUO-04 PDF pending
- [~] PAY-01/02/03/04 (partial): `PaymentProvider` interface + mock provider, charge creation, idempotent webhook, payment/order update, amount-mismatch blocking, mismatch audit — real gateway/card/refund pending

## Sprint 5 — Orders/Production/Automation
- [x] ORD-01/02/03 (partial): order creation from approved quote, listing/query, manual status update, `production_logs`
- [~] N8N-01/02 base n8n infra active; event emission/consumption and workflows pending

## Sprint 6 — Dashboard/Reports/Quality
- [~] DASH-01/02: `/api/v1/dashboard` endpoint with indicators/recent items and web pages connected to API for dashboard/customers/quotes/orders (API-validated smoke); richer UI/reporting pending
- [ ] QA-01, SEC-01 full hardening, REL-01 backups/runbook, DOC-01 final pending

## Validations executed
- `DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /tmp/sample-cube.stl --no-persist` → SUCCEEDED.
- `prisma db push` + `prisma/seed.ts` → schema synced and seed applied.
- API smoke (NestJS, bun): health, dashboard, settings, printers, customers, flow `quote -> item/pricing -> recalc -> send(snapshot) -> approve -> order -> payment -> webhook(CONFIRMED)` with order updated to `PAID` and `production_logs`.
- Sprint 2 runtime (mock mode): upload file → create slicing job → BullMQ worker processes → `SUCCEEDED` with normalized result persisted.

## Blockers/environment
- **DragonFruit CLI missing** in this environment — slicing is validated in `mock` mode only; real PoC requires a container/image with the CLI + authorized profiles/plugins.
- **MinIO image pull blocked** (`docker.io`/`quay.io` access denied) — MinIO/S3 integration pending; local filesystem storage fallback in use.

## Roadmap notes (what “next” depends on)
- **Unblock foundations:** real storage (MinIO/S3 + temp URLs), deeper upload/content validation, and real DragonFruit CLI runtime validation with queue/DLQ hardening.
- **Solidify commercial flow:** quote state machine/versioning, PDF proposals, real payment gateway/webhook signature validation, and pricing/config history + tests.
- **Operational readiness:** full Auth.js/RBAC, n8n event emission/workflows, 3D viewer, structured observability, security hardening, backups, and final docs.
