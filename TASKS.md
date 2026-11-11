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
- [~] STL-01 Real upload/validation (multipart upload, format/size/hash, local storage, metadata registration via API), basic content/signature checks (STL/OBJ/3MF/VOX), and file content streaming endpoint (`GET /api/v1/files/:id/content`, inline/attachment download) backed by local storage — deeper/magic-byte validation and MinIO/S3/temporary URLs pending
- [~] STL-04/05 (MVP runtime): DragonFruit adapter integration + job persistence + API→BullMQ enqueueing and worker queue consumer wired; web Files & Slicing UI (upload, create/list/poll jobs, normalized result, reprocess) and configurable CLI attempts/path/wrapper support added. End-to-end validated in mock mode (upload → job → worker `SUCCEEDED` → reprocess). Real headless DragonFruit CLI validation on server pending.
- [~] STL-07 Basic web 3D viewer/preview for STL/OBJ/3MF files on Files & Slicing page (Three.js loaders + orbit controls, reset/wireframe/grid-axes toggles, bounds display) with download/open fallback; VOX preview pending

## Sprint 3 — Materials/Pricing
- [x] MAT-01/03/04 Base: materials/printers/profiles CRUD via API (initial seed); web Settings & Catalog UI added (create/list materials, update price/active state, create printers/profiles, edit pricing defaults).
- [~] PRICE-01/04/05 (MVP): quote item pricing via API (`POST /quotes/:id/items` with `pricingInput`) calculates breakdown (volume/losses/costs/margin), stores `breakdownJson` + inputs and recalculates totals; logic aligned with `@print3d/pricing` (currently implemented inline in API service). Web quotes UI can add/remove items linked to file/material/slicing job with prefilled metrics/defaults and shows breakdown. Dedicated unit tests/shared-runtime integration pending.
- [~] MAT-02/PRICE-02/03/06/07 config history/versioning and advanced cases (plate vs model, dedicated unit tests) pending

## Sprint 4 — Quotes/Commercial/Financial
- [~] QUO-01/02/07/08 (partial): quote creation, item addition/editing/removal with pricing breakdown and recalculation (API + web detail UI), guarded status transitions (`send/approve/reject/expire/reopen`), immutable snapshots on send/approve, reopen-to-draft flow with version bump and preserved previous snapshot metadata, audit-log history events (`QUOTE_CREATED/ITEM_ADDED|UPDATED|REMOVED/SENT/APPROVED/REJECTED/EXPIRED/REOPENED`) via `GET /api/v1/quotes/:id/history` and included in quote detail, web history viewer; full dedicated history/version tables and versioned line-item snapshots pending
- [~] QUO-04 proposal HTML and PDF generation available (`GET /api/v1/quotes/:id/proposal` and `/proposal.pdf` via pdfkit) with web proposal/PDF links; richer branding/layout/attachments pending
- [~] PAY-01/02/03/04 (partial): `PaymentProvider` interface + mock provider, charge creation/list/get with pending-payment reuse and checkout/QR metadata, simulated mock confirmation endpoint, idempotent webhook handling, payment/order update and PAID production log, amount-mismatch blocking and mismatch audit, web Orders UI for creating/confirming payments and viewing payment details — mock webhook secret validation now enforced (`N8N_WEBHOOK_SECRET`, default `mock-secret`) with fresh smoke rejecting invalid secret (`400 Invalid webhook`); real gateway/card/refund and signed webhook verification pending

## Sprint 5 — Orders/Production/Automation
- [x] ORD-01/02/03 (partial): order creation from approved quote, listing/detail with quote/customer/payments/logs, guarded status transitions (`PENDING→AWAITING_PAYMENT→PAID→IN_PRODUCTION→COMPLETED`, `CANCELLED`), manual status updates with notes, `production_logs`; web Orders page with detail panel, production log and payment history, note-aware status actions. Automated/role-based production workflow and richer operational tooling pending.
- [~] N8N-01/02 base n8n infra active; event emission/consumption and workflows pending

## Sprint 6 — Dashboard/Reports/Quality
- [~] DASH-01/02: `/api/v1/dashboard` endpoint with indicators/recent items and web pages connected to API for dashboard/customers/quotes/orders (API-validated smoke); richer UI/reporting pending
- [ ] QA-01, SEC-01 full hardening, REL-01 backups/runbook, DOC-01 final pending

## Validations executed
- `DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /tmp/sample-cube.stl --no-persist` → SUCCEEDED.
- `prisma db push` + `prisma/seed.ts` → schema synced and seed applied.
- API smoke (NestJS, bun): health, dashboard, settings, printers, customers, flow `quote -> item/pricing -> recalc -> send(snapshot) -> approve -> order -> payment -> webhook(CONFIRMED)` with order updated to `PAID` and `production_logs`.
- Sprint 2 runtime (mock mode): upload file → create slicing job → BullMQ worker processes → `SUCCEEDED` with normalized result persisted; reprocess flow and Files & Slicing web UI validated.
- Quote/item runtime (mock mode): succeeded slicing job + material/settings prefill → add/edit/remove quote items with `pricingInput`/breakdown and recalculation, then send snapshot; web quote detail/item form implemented and typechecked.
- Settings/catalog runtime (temp DB): pricing defaults read/update, material create/list, printer/profile create/list validated via API; web Settings & Catalog UI added.
- Files content/preview (temp DB, built API): `GET /api/v1/files/:id/content` streamed stored file with correct inline/attachment headers (`200`) and returned `404` for missing records; upload rejected invalid 3MF content and accepted valid STL in smoke test; web Files page gained download/open actions and STL/OBJ/3MF Three.js preview component (3MF via `ThreeMFLoader`, Z-up correction) with reset view, wireframe/grid-axes toggles and bounds display; API/web/worker typechecks passed.
- Quote proposal/PDF (temp DB, built API): `GET /api/v1/quotes/:id/proposal.pdf` returned `200 application/pdf` (valid `%PDF-1.3`, inline disposition) for existing quote while HTML proposal remained `200`; web quotes list includes PDF link; API/web/worker typechecks passed.
- Quote state/version smoke (temp DB/Redis, built API): create→add item→send (snapshot)→reject→expire→reopen (status `DRAFT`, version bumped to 2, `snapshotJson` preserved `previousSnapshot`/`reopenedFrom`)→resend→approve (snapshot) validated; invalid `approve→reject` transition returned guarded `400 Invalid quote status transition`; proposal HTML/PDF remained valid; API/web/worker typechecks passed.
- Quote history smoke (temp DB/Redis, built API): create→add item→send→reject→reopen recorded `QUOTE_CREATED/ITEM_ADDED/SENT/REJECTED/REOPENED` events; `GET /api/v1/quotes/:id/history` and quote detail `history` returned matching events; API/web/worker typechecks passed.
- Orders flow smoke (temp DB/Redis, built API): approved quote → order created (`AWAITING_PAYMENT`, initial production log) → `PAID` (note recorded) → `IN_PRODUCTION` → invalid rollback to `AWAITING_PAYMENT` guarded with `400 Invalid order status transition` → `COMPLETED` with accumulated production logs; order list/detail reflected updates; API/web/worker typechecks passed.
- Payments smoke (temp DB/Redis, built API): approved quote → order (`AWAITING_PAYMENT`) → mock payment created (`PENDING`, checkout URL/amount) → repeated create reused pending payment (idempotent) → simulated confirmation set payment `CONFIRMED`, order `PAID`, and recorded payment-confirmation production log; `GET /payments?orderId=...` reflected confirmed state; API/web/worker typechecks passed.
- Payments webhook secret validation (fresh built API, temp DB/Redis): invalid mock webhook secret rejected with 400 `{"message":"Invalid webhook",...}`; API/web/worker typechecks passed.

## Blockers/environment
- **DragonFruit CLI missing** in this environment — slicing is validated in `mock` mode only; real PoC requires a container/image with the CLI + authorized profiles/plugins.
- **MinIO image pull blocked** (`docker.io`/`quay.io` access denied) — MinIO/S3 integration pending; local filesystem storage fallback in use.

## Deployment notes
- Server-side DragonFruit deployment assets are scaffolded: `docker/worker.Dockerfile`, `docker-compose.yml` (`worker` service), `docker/dragonfruit/{bin,profiles,plugins,install.sh}`, and `docs/ops/deploy-dragonfruit-server.md`. Worker adapter supports configurable CLI path/attempts/wrappers (`DRAGONFRUIT_CLI_PATH`, `DRAGONFRUIT_CLI_ATTEMPTS_JSON`, profiles dir). DragonFruit CLI must be installed/provided on the **deployment server** (not developer machines), then validated with real headless commands/profiles.

## Roadmap notes (what “next” depends on)
- **Unblock foundations:** real storage (MinIO/S3 + temp URLs), deeper upload/content validation, and real DragonFruit CLI runtime validation on the server with queue/DLQ hardening.
- **Solidify commercial flow:** quote state machine/versioning, PDF proposals, real payment gateway/webhook signature validation, and pricing/config history + tests.
- **Operational readiness:** full Auth.js/RBAC, n8n event emission/workflows, 3D viewer, structured observability, security hardening, backups, and final docs.
