# Execution Log / Task Tracker

## Milestone 0 — PoC DragonFruit CLI
- [x] POC-01 Docker env base (postgres/redis/minio/n8n no compose) + estrutura worker/packages/docs
- [x] POC-02 CLI capabilities doc (ambiente local: CLI não instalado; contrato/limitações documentados) — `docs/poc/dragonfruit-cli.md`
- [x] POC-03 Secure CLI executor (spawn sem shell, whitelist cmd/subcmd, timeout, validação de perfis autorizados) — `apps/worker/src/lib/exec.ts`, `apps/worker/src/slicer/dragonfruit.ts`
- [x] POC-04 Analysis pipeline (adapter `cli|mock|auto`, normalização best-effort, runner `run-once`) — validado em modo mock
- [x] POC-05 Normalize results (contrato `@print3d/contracts`, `capabilitiesGaps`, `warnings`, raw preservado)
- [x] POC-06 Persist jobs/results (schema Prisma `SlicingJob` + persistência no `run-once` quando `DATABASE_URL` disponível)
- [x] POC-07 Metrics validation doc (geométrico vs consumo, fonte prioritária slice/cena) — `docs/poc/metrics-validation.md`
- [x] POC-08 Retries/idempotency hardening (base: estados de job, reprocessamento por job, falhas estruturadas; fila de erros a evoluir com BullMQ/DLQ em Sprint 2)

## Sprint 1 — Fundação
- [~] INF-01 Estrutura base monorepo criada (`apps/`, `packages/`, `prisma/`, `docs/`, `docker/`)
- [~] INF-02 Docker Compose base (postgres, redis, minio, n8n) — serviços app/worker a containerizar
- [~] INF-03 PostgreSQL + Prisma schema inicial criado — migrations/seed pendentes (requer DB ativo/CLI prisma no ambiente de build)
- [ ] INF-04 Autenticação
- [ ] INF-05 Autorização administrativa/RBAC
- [~] INF-06 Storage (MinIO no compose; integração app pendente)
- [ ] INF-07 Observabilidade/auditoria (schema inclui `AuditLog`; implementação pendente)
- [ ] CRM-01..03 Clientes

## Sprint 2 — Arquivos 3D e Processamento
- [~] STL-01/02/03/04/05/06/08 Estruturas iniciais (schema, fila worker BullMQ esqueleto, adapter) — APIs/UI/validações completas pendentes

## Sprint 3 — Materiais/Precificação
- [~] PRICE-01 Motor de precificação puro inicial em `packages/pricing` (decimal/rounding simples) — testes e integração pendentes
- [~] MAT/PRICE restantes pendentes

## Sprint 4+ — Comercial/Financeiro/Produção/Automação/Dashboard/QA
- [ ] Pendente (contratos e schema base preparados)

## Notas de execução
- Ambiente local sem binário DragonFruit; `DRAGONFRUIT_MODE=mock` validado com `bun apps/worker/src/run-once.ts --file /tmp/sample-cube.stl --no-persist`.
- Próximos passos imediatos: container com DragonFruit CLI + perfis para fechar validação real, gerar migrations Prisma, implementar `apps/api` (NestJS) e `apps/web` (Next.js), integrar storage/gateway/n8n.
