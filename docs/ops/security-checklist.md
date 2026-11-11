# Security and Reliability Checklist (MVP)

## Authentication and authorization
- [~] Global MVP guard (`SimpleAuthGuard`) with admin token support and dev mode; integrate Auth.js/session and full RBAC.
- [~] Explicit public routes (`/health`, webhooks per policy) — review exposure.

## Uploads and files
- [x] Validate allowed extensions (STL/3MF/OBJ/VOX) and size limit.
- [~] Private local filesystem storage; MinIO/S3 with temporary URLs and access policies pending.
- [ ] Deep content/magic-bytes validation and antivirus/quarantine as appropriate.

## Slicer/execution
- [x] Isolated worker (conceptual/structure) and execution via `spawn` without shell.
- [x] Command/subcommand whitelist and profile validation in authorized directory.
- [x] Configurable timeout and structured errors.
- [ ] Dedicated container/sandbox with least privilege for real CLI in production.

## Payments and financial state
- [x] Basic idempotency by state (repeated CONFIRMED) and amount-mismatch blocking with audit log.
- [~] `PaymentProvider` adapter (mock implemented) — integrate real gateway with signature validation.
- [ ] Explicit idempotency keys, formal retries/redelivery handling, and reconciliation.

## Observability and audit
- [~] `AuditLog` and `SystemSetting` models, basic event emission utility.
- [ ] Structured logs, tracing/correlation IDs, metrics, and global interceptor integration.

## Secrets and configuration
- [~] `.env.example` provided; avoid logging secrets and hardcoded credentials.
- [ ] Rotation/secret management and production hardening.

## Backups/operations
- [ ] Database backup/restore tested.
- [ ] Persistent volumes and operational runbooks validated.
