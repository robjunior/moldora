# Checklist de Segurança e Confiabilidade (MVP)

## Autenticação e autorização
- [~] Guard global MVP (`SimpleAuthGuard`) com suporte a token admin e modo dev; integrar Auth.js/sessão e RBAC completo.
- [~] Rotas públicas explícitas (`/health`, webhooks conforme política) — revisar exposição.
- [ ] Controles por papel (admin/cliente) em todos endpoints e recursos.

## Uploads e arquivos
- [x] Validação de extensão permitida (STL/3MF/OBJ/VOX) e limite de tamanho.
- [~] Armazenamento local privado em filesystem; pendente MinIO/S3 com URLs temporárias e políticas de acesso.
- [ ] Validação profunda de conteúdo/magic bytes e antivírus/quarentena conforme ambiente.

## Slicer/execução
- [x] Worker isolado (conceitual/estrutura) e execução via `spawn` sem shell.
- [x] Whitelist de comandos/subcomandos e validação de perfis em diretório autorizado.
- [x] Timeout configurável e erros estruturados.
- [ ] Sandbox/container dedicado com least privilege para CLI real em produção.

## Financeiro e webhooks
- [x] Backend como fonte de verdade; webhook valida e atualiza estados no backend.
- [x] Idempotência básica por estado (CONFIRMED repetido) e bloqueio por divergência de valor com audit log.
- [~] `PaymentProvider` adapter (mock implementado) — integrar gateway real com validação de assinatura.
- [ ] Chaves de idempotência explícitas, retries/reentregas formais e reconciliação.

## Dados e auditoria
- [x] Valores monetários em `Decimal` no schema Prisma.
- [x] Tabelas de `audit_logs`, `slicing_jobs`, `production_logs`, snapshots de orçamento.
- [ ] Cobertura completa de auditoria para todas ações sensíveis e trilha de alterações de preço/config.

## Observabilidade e operação
- [~] Logs Nest padrão e registros de job; pendente logs estruturados/correlation id.
- [ ] Backups automatizados testados, alertas e DLQ/monitoramento de filas.
- [x] Runbook inicial (`docs/ops/runbook.md`).

## Licenciamento
- [ ] Validar implicações AGPL do DragonFruit para distribuição/modificação; manter uso como ferramenta externa via CLI.
