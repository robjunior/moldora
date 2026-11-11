# Runbook Operacional (MVP)

## Serviços (Docker Compose)
- Subir base: `docker compose up -d postgres redis n8n`
- Status: `docker compose ps`
- Logs: `docker compose logs -f <service>`

## Banco de dados
- Schema sync (dev): `DATABASE_URL=... bunx prisma db push`
- Seed: `DATABASE_URL=... bun prisma/seed.ts`
- Backup (exemplo): `docker exec print3d-postgres pg_dump -U print3d print3d > backup.sql`
- Restore (exemplo): `cat backup.sql | docker exec -i print3d-postgres psql -U print3d print3d`

## API (dev)
- Rodar: `cd apps/api && DATABASE_URL=... API_PORT=3001 bun src/main.ts`
- Health: `GET /api/v1/health` (público)
- Auth MVP: se `ADMIN_API_TOKEN` estiver definido, enviar `Authorization: Bearer <token>`; sem token definido, guard permite em modo dev.

## Worker / DragonFruit
- PoC mock: `DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /path/model.stl --no-persist`
- CLI real: configurar `DRAGONFRUIT_CLI_PATH`, perfis autorizados em `DRAGONFRUIT_ALLOWED_PROFILES_DIR`, usar modo `cli|auto` em worker/container dedicado.
- Falhas: verificar `slicing_jobs` (status/erro/raw/normalized) e logs do worker.

## Storage
- Fallback local atual: `storage/uploads/` (privado no filesystem). MinIO/S3 deve ser habilitado com imagem acessível e integração de URLs temporárias.

## n8n
- UI: `http://localhost:5678`
- Backend deve emitir eventos autenticados; n8n não deve alterar estados comerciais/financeiros.

## Incidentes comuns
- **Porta em uso (3001):** encerrar processo anterior antes de subir API.
- **MinIO image pull bloqueado:** manter desabilitado no compose e usar storage local até resolver registry/imagem.
- **Webhook duplicado/divergente:** tratado como idempotente ou bloqueado por mismatch de valor (auditado).
