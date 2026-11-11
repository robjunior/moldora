# Operations Runbook (MVP)

## Services (Docker Compose)
- `postgres` (5432), `redis` (6379), `n8n` (5678) active.
- `minio` currently disabled in compose due to registry/image pull restriction in this environment.

## Database
- Sync schema (dev/MVP): `cd /home/rob/Projects/print3d-quotes && DATABASE_URL=... bunx prisma db push`
- Seed: `DATABASE_URL=... bun prisma/seed.ts`

## API
- Dev start (example): `cd apps/api && DATABASE_URL=... REDIS_URL=... API_PORT=3001 bun src/main.ts`
- Health: `GET /api/v1/health` (public)

## Worker (DragonFruit)
- Queue: BullMQ on Redis (`SLICING_QUEUE_NAME`, default `slicing-jobs`); API enqueues jobs, worker consumes and persists status/results to `SlicingJob`.
- Mock PoC (one-off): `DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file <path> --no-persist`
- Queue worker: `cd apps/worker && bun run dev` (or `bun src/index.ts`) with `REDIS_URL`, `DATABASE_URL`, and `DRAGONFRUIT_MODE` configured.
- Real CLI: provide `DRAGONFRUIT_CLI_PATH` and authorized profiles in `DRAGONFRUIT_ALLOWED_PROFILES_DIR`; run in an isolated container with least privilege.

## Smoke flow (validated)
- Quote/payment: `quote -> add item/pricing -> recalc -> send(snapshot) -> approve -> create order -> create payment -> webhook(CONFIRMED)` updates payment/order (`PAID`) and production logs.
- Slicing runtime (mock mode): upload file → create slicing job → worker processes queue job → `SUCCEEDED` with normalized result persisted.

## Storage
- Current local fallback: `storage/uploads/` (private on filesystem). MinIO/S3 should be enabled with accessible image and temporary URL integration.

## n8n
- Container active (`http://localhost:5678`). Workflows and event webhooks to be configured.
- Backend should emit authenticated events; n8n must not change commercial/financial states.

## Known environment blockers
- **DragonFruit CLI missing:** mock mode only.
- **MinIO image pull blocked:** keep disabled in compose and use local storage until registry/image access is resolved.
