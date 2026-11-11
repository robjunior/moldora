# Execution Log / Task Tracker

## Milestone 0 — PoC DragonFruit CLI
- [x] POC-01 Docker env base (postgres/redis/n8n up; minio pull bloqueado neste ambiente) + estrutura worker/packages/docs
- [x] POC-02 CLI capabilities doc (ambiente local: CLI não instalado; contrato/limitações documentados) — `docs/poc/dragonfruit-cli.md`
- [x] POC-03 Secure CLI executor (spawn sem shell, whitelist cmd/subcmd, timeout, validação de perfis autorizados) — `apps/worker/src/lib/exec.ts`, `apps/worker/src/slicer/dragonfruit.ts`
- [x] POC-04 Analysis pipeline (adapter `cli|mock|auto`, normalização best-effort, runner `run-once`) — validado em modo mock
- [x] POC-05 Normalize results (contrato `@print3d/contracts`, `capabilitiesGaps`, `warnings`, raw preservado)
- [x] POC-06 Persist jobs/results (schema Prisma + `prisma db push` aplicado; `run-once` persiste job/file/customer PoC com `DATABASE_URL`)
- [x] POC-07 Metrics validation doc (geométrico vs consumo, fonte prioritária slice/cena) — `docs/poc/metrics-validation.md`
- [x] POC-08 Retries/idempotency hardening (base: estados de job, reprocessamento por job, falhas estruturadas; DLQ BullMQ a evoluir)

## Sprint 1 — Fundação
- [~] INF-01 Estrutura base monorepo (`apps/api`, `apps/web`, `apps/worker`, `packages/*`, `prisma/`, `docs/`, `docker/`)
- [~] INF-02 Docker Compose (postgres, redis, n8n ativos; minio comentado por bloqueio de registry no ambiente; api/web/worker containers pendentes)
- [x] INF-03 PostgreSQL + Prisma schema sincronizado (`db push`) e seed aplicado (`prisma/seed.ts`: admin, material, impressora, perfil)
- [~] INF-04 Autenticação MVP (guard `SimpleAuthGuard` + `@Public()`; bypass dev se `ADMIN_API_TOKEN` ausente, Bearer token se definido) — integração Auth.js/sessão completa pendente
- [~] INF-05 Autorização/RBAC base (guard global pronto para endurecer; papéis completos pendentes)
- [~] INF-06 Storage (estrutura local + registro de arquivos via API; integração MinIO/S3 e URLs temporárias pendente)
- [~] INF-07 Observabilidade/auditoria (tabela `AuditLog`, `SystemSetting`; interceptor/util base criado, integração global e logs estruturados completos pendentes)
- [~] CRM-01/02/03 Clientes API CRUD/arquivamento + páginas web placeholder (UI funcional completa/busca/histórico pendente)

## Sprint 2 — Arquivos 3D e Processamento
- [~] STL-01 Upload/validação real (registro metadata via API; multipart/storage/validação conteúdo pendente)
- [~] STL-04/05 Integração DragonFruit adapter + persistência de jobs (`slicing_jobs`, endpoints criar/consultar) — enfileiramento BullMQ end-to-end e execução worker via fila pendentes
- [ ] STL-07 Visualizador 3D pendente

## Sprint 3 — Materiais/Precificação
- [x] MAT-01/03/04 Base: CRUD materiais/impressoras/perfis via API (seed inicial)
- [x] PRICE-01/04/05 (parcial): motor de precificação em serviço de orçamento (`volumeMl`, perdas, custos, margem), memória de cálculo em `QuoteItem.breakdownJson`, recálculo de totais
- [~] MAT-02/PRICE-02/03/06/07 histórico/versionamento de configs e casos avançados (placa vs modelo, testes unitários dedicados) pendentes

## Sprint 4 — Orçamentos/Comercial/Financeiro
- [~] QUO-01/02/07/08 (parcial): criação de orçamento, itens, recálculo, envio com snapshot imutável básico, aprovação/rejeição, conversão em pedido; máquina de estados/versões completas pendentes
- [ ] QUO-04 PDF pendente
- [~] PAY-01/02/03/04 (parcial): `PaymentProvider` interface + mock provider, criação de cobrança, webhook idempotente, atualização de pagamento/pedido, bloqueio por divergência de valor, auditoria de mismatch — gateway real/cartão/refund completo pendentes

## Sprint 5 — Pedidos/Produção/Automação
- [x] ORD-01/02/03 (parcial): criação de pedido a partir de orçamento aprovado, listagem/consulta, atualização manual de status, `production_logs`
- [~] N8N-01/02 base infra n8n ativa; emissão/consumo de eventos e workflows pendentes

## Sprint 6 — Dashboard/Relatórios/Qualidade
- [x] DASH-01/02 (parcial): endpoint `/api/v1/dashboard` com indicadores e recentes (validado em smoke test)
- [ ] QA-01, SEC-01 hardening completo, REL-01 backups/runbook, DOC-01 final pendentes

## Validações executadas
- `DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /tmp/sample-cube.stl --no-persist` → SUCCEEDED.
- `prisma db push` + `prisma/seed.ts` → schema sincronizado e seed aplicado.
- API smoke (NestJS, bun): health, dashboard, settings, printers, customers, fluxo `quote -> item/pricing -> recalc -> send(snapshot) -> approve -> order -> payment -> webhook(CONFIRMED)` com atualização de pedido para `PAID` e `production_logs`.

## Bloqueios/ambiente
- MinIO image pull bloqueado (`docker.io`/`quay.io` acesso negado neste ambiente) — storage S3 real pendente; usar fallback local até disponibilizar imagem.
- DragonFruit CLI ausente — validar POC real em imagem/container dedicado com perfis/plugins.
