# Architecture (MVP)

## Module boundaries
- **Backend (NestJS) as source of truth** for commercial and financial states (pricing, quotes, orders, payments). n8n orchestrates notifications/integrations and must not decide financial states.
- **Worker/slicer isolated** from the API: BullMQ/Redis queue, `spawn` without shell, command/profile whitelist, timeout, structured JSON results. `DRAGONFRUIT_MODE=cli|mock|auto`.
- **Issued/approved quotes are immutable** via persisted snapshots.
- **Storage/payments via adapters:** local filesystem fallback today; MinIO/S3 and real payment gateway integrations are planned behind service/provider boundaries.

## Main flow
Upload (API → storage + `File3D`) → slicing job (API enqueues, worker runs DragonFruit adapter) → normalized result persisted → pricing/quote item breakdown → quote snapshot on send/approval → order conversion → payment (mock provider/webhook) → production/logging.

## Current implementation notes
- Prisma/PostgreSQL models cover users/customers/files/printers/materials/profiles/slicing jobs/quotes/items/orders/payments/production logs/audit/settings.
- Shared packages: `@print3d/contracts` (normalized slicing/result contracts) and `@print3d/pricing` (pricing engine used by quote pricing).
- Web (Next.js) consumes API endpoints for dashboard/customers/quotes/orders scaffolding; deeper UI (viewer, PDF, richer reporting) remains pending.
- Environment constraints tracked in `TASKS.md`: DragonFruit CLI and MinIO image may be unavailable locally, so mock mode and local storage are the current fallbacks.
