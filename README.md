# Sistema de Orçamentos de Impressão 3D (MVP)

Plataforma interna para gestão de orçamentos e pedidos de impressão 3D em resina (SLA/MSLA), com análise técnica via **DragonFruit CLI** executado em worker isolado.

## Estado atual
- **Milestone 0 (PoC DragonFruit CLI):** estrutura e contrato em implementação. Binário DragonFruit não detectado no ambiente atual; o worker suporta `DRAGONFRUIT_MODE=mock` para validar pipeline/normalização/persistência e `DRAGONFRUIT_MODE=cli|auto` quando o CLI estiver disponível.
- Sprints 1–6: em andamento incremental conforme backlog técnico.

## Arquitetura (alvo)
- **Frontend:** Next.js + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node.js + NestJS (regras de negócio, fonte de verdade comercial/financeira)
- **Worker:** processamento assíncrono (BullMQ/Redis) + execução segura do DragonFruit CLI
- **Banco:** PostgreSQL + Prisma
- **Storage:** MinIO/S3 (privado)
- **Automação:** n8n (notificações/integrações, sem decidir estados financeiros)
- **Pagamentos:** gateway via `PaymentProvider` adapter

## Estrutura
```
apps/
  api/        # NestJS API
  web/        # Next.js admin/cliente
  worker/     # Jobs e integração slicer
packages/
  contracts/  # Tipos/DTOs/contrato normalizado do slicer
  pricing/    # Motor de precificação puro
prisma/       # Schema e migrations
docs/         # PoC, operações, ADRs
docker/       # Dockerfiles e configs
```

## Requisitos
- Docker + Docker Compose
- Node.js (para dev local fora de container)

## Subir ambiente (base)
```bash
cp .env.example .env
docker compose up -d --build
```
> Serviços e apps serão adicionados progressivamente; consulte `docker-compose.yml` e `TASKS.md`.

## DragonFruit PoC
- Documentação de capacidades/limitações: `docs/poc/dragonfruit-cli.md`
- Validação de métricas (geométrico vs consumo): `docs/poc/metrics-validation.md`
- Executor CLI com whitelist, timeout e sem shell arbitrário (`apps/worker` / adapter).

## Decisões importantes
- Backend é fonte de verdade; n8n orquestra eventos.
- Orçamentos/propostas emitidos são snapshots imutáveis.
- Valores monetários em decimal (nunca float).
- DragonFruit usado como ferramenta externa via CLI (avaliar AGPL antes de distribuição/modificação).

## Backlog
Acompanhar `TASKS.md` e a especificação fornecida.
