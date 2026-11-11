# PoC — DragonFruit CLI: Capacidades, Integração e Limitações

> **Status (10 nov 2026, ambiente local `/home/rob`)**: binário `dragonfruit`/`DragonFruit` **não encontrado** no PATH. Este documento consolida o contrato de integração pretendido com base na especificação fornecida/documentação oficial citada e define o comportamento do worker em modos `cli` e `mock`. A validação com CLI real deve ser concluída em ambiente onde o DragonFruit esteja instalado (container dedicado recomendado).

## 1. Objetivo da integração
Executar análise/fatiamento de modelos de resina (SLA/MSLA) de forma headless, isolada do backend web, produzindo um **JSON normalizado** para o motor de precificação.

## 2. Comandos de interesse (conforme documentação referenciada)
| Comando | Uso esperado | Saídas relevantes |
|---|---|---|
| `mesh info` | Informações geométricas/volume do modelo | volume, dimensões, malhas (a confirmar) |
| `island full` | Análise de ilhas | ilhas/problemas (a confirmar) |
| `scene slice` | Processar cena com perfil de impressora e material | resumo de impressão (a confirmar) |
| `slice run` | Executar fatiamento | JSON com camadas, tempo de processamento, métricas (a confirmar) |
| `slice info` | Formatos/perfis suportados | capacidades do ambiente |

> **Nota:** flags, formato exato de argumentos e schema de saída devem ser confirmados no ambiente alvo (POC-02 complementar). O adapter não deve assumir campos não observados.

## 3. Contrato interno normalizado (`packages/contracts`)
Campos alvo:
- `printTimeSec`, `volumeMl`, `volumeCm3`, `layers`, `estimatedWeightG` (quando aplicável), `supportsUsed`, `material`, `printProfile`, `quantity`
- `mode`: `cli|mock`
- `metrics`: mapa livre para métricas adicionais reais
- `capabilitiesGaps[]`: campos esperados não fornecidos pelo CLI
- `warnings[]`: limitações/ressalvas (ex.: volume geométrico ≠ consumo real)

## 4. Execução segura (worker)
- **Sem shell arbitrário:** execução via spawn com argumentos em array; nunca concatenar input do usuário em string de shell.
- **Whitelist:** apenas comandos/perfis autorizados e caminhos resolvidos pelo sistema (IDs → paths permitidos em diretório de perfis).
- **Isolamento:** processo em worker/container separado da API.
- **Timeout:** `SLICING_JOB_TIMEOUT_MS` (default 10 min), kill em estouro.
- **Auditoria:** armazenar `inputParams`, stdout/stderr bruto, exit code, duração e resultado normalizado.

## 5. Modos de operação
- `DRAGONFRUIT_MODE=cli`: exige binário disponível; falha se ausente.
- `DRAGONFRUIT_MODE=mock`: gera resultado determinístico/estimado para validar pipeline, schema e persistência (não usar para precificação real).
- `DRAGONFRUIT_MODE=auto`: usa CLI se encontrado, senão mock com warning explícito.

## 6. Lacunas conhecidas / riscos
- CLI não instalado neste host: **validação real pendente** em container de PoC.
- Perfis de impressora, resinas e plugins necessários podem ser obrigatórios para `slice run`/`scene slice`.
- Volume geométrico do STL difere de volume consumido (suportes, raft, hollowing, drenagem, perdas) — fonte prioritária deve ser resultado de cena fatiada.
- Custo por placa vs por modelo em impressões múltiplas requer modelagem específica.
- Licença AGPL-3.0-or-later: usar como ferramenta externa; avaliar obrigações antes de distribuir/modificar.

## 7. Próximos passos para fechar POC-02 em ambiente com CLI
1. Construir imagem Docker com DragonFruit CLI + perfis/plugins.
2. Executar `slice info` e documentar formatos/perfis.
3. Rodar `mesh info` e `slice run` em 2–3 STLs de referência.
4. Capturar JSON real e ajustar normalizador.
5. Comparar métricas com `docs/poc/metrics-validation.md`.
