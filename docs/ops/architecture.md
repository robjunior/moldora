# Arquitetura (MVP) — Visão Técnica Inicial

## Princípios
- **Backend como fonte de verdade** para estados comerciais e financeiros; n8n orquestra notificações/integrações.
- **Slicer externo via CLI** em worker isolado (DragonFruit), atrás de `SlicerAdapter`.
- **Orçamentos imutáveis** após emissão/aprovação (snapshot).
- **Valores monetários em decimal** (DB/dominio), nunca float.
- **Processamento assíncrono** para análises 3D (fila + retries controlados).

## Componentes
- `apps/web` (Next.js): painel admin/cliente (a implementar).
- `apps/api` (NestJS): autenticação, RBAC, CRUD, precificação, orçamentos, pedidos, pagamentos, webhooks, emissão de eventos.
- `apps/worker`: BullMQ consumer, execução segura do DragonFruit CLI, normalização e persistência de resultados.
- `packages/contracts`: contratos de integração (ex.: resultado normalizado de slicing).
- `packages/pricing`: motor de precificação puro e testável.
- `prisma/`: schema/migrations.
- Infra: PostgreSQL, Redis, MinIO(S3), n8n.

## Fluxo principal (alvo)
1. Upload de arquivo 3D → storage privado + registro.
2. Criação de `slicing_job` → fila → worker executa DragonFruit CLI.
3. Resultado bruto + normalizado persistido (com gaps/warnings).
4. Motor de precificação gera breakdown.
5. Orçamento revisado/ajustado → snapshot imutável na emissão.
6. Aprovação → cobrança (gateway adapter) → webhook idempotente valida/atualiza backend.
7. Pedido criado/liberado → produção manual registrada → notificações via n8n.

## Segurança/Confiabilidade (requisitos)
- AuthN/AuthZ em todas rotas admin; arquivos privados com URLs temporárias.
- Validação de uploads (tipo/tamanho/conteúdo) e proteção contra execução arbitrária no slicer (whitelist, sem shell, timeout).
- Idempotência de webhooks/pagamentos e auditoria de ações sensíveis.
- Logs estruturados e rastreabilidade de jobs/snapshots.

## Estado da implementação (neste commit base)
- PoC: contrato normalizado, adapter DragonFruit com modos `cli|mock|auto`, executor seguro, runner `run-once`, schema Prisma inicial, docs PoC/ops.
- Pendente: CLI real do DragonFruit no ambiente, apps web/api completos, migrations aplicadas, gateway/n8n integrados, testes E2E.
