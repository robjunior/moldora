# PoC — Validação de Métricas (Geométrico vs Consumo em Resina)

> **Status:** validação teórica/preparatória registrada. Execução empírica com DragonFruit CLI real **pendente** (CLI não disponível no ambiente atual).

## Objetivo
Definir como o sistema deve estimar consumo de resina e tempo, evitando usar volume geométrico como proxy direto quando houver dados de slice/cena.

## Hipóteses e regras
1. **Volume geométrico (mesh/STL)**: útil para sanity check e informações do modelo, mas **não representa consumo real**.
2. **Consumo real estimado** deve priorizar, quando disponível:
   - resultado de **cena preparada e fatiada** (`scene slice`/`slice run`) com perfil de impressora e resina;
   - métricas de volume de resina/material reportadas pelo slicer.
3. **Ajustes obrigatórios no motor de precificação** (parâmetros configuráveis):
   - suportes/raft, hollowing/drenagem, perdas de processo, margem de segurança.
4. **Placa vs modelo:** em múltiplas peças na mesma impressão, separar custo da placa e rateio por item.

## Casos de validação planejados (executar quando CLI disponível)
| Caso | Arquivo/Cena | Perfil/Resina | Volume geométrico (mesh) | Volume/tempo do slice | Observações |
|---|---|---|---:|---:|---|
| V1 | Peça sólida simples | a definir | pendente | pendente | baseline |
| V2 | Peça oca com furos de drenagem | a definir | pendente | pendente | hollowing reduz consumo; depende de preparo |
| V3 | Múltiplas peças na mesma placa | a definir | pendente | pendente | validar rateio placa vs item |

## Conclusões preliminares (para implementação)
- Contrato normalizado deve expor `volumeCm3` (geométrico) e `volumeMl` (consumo/estimativa de slice) como campos distintos e opcionais.
- `capabilitiesGaps`/`warnings` devem sinalizar quando apenas volume geométrico estiver disponível.
- Motor de preços deve falhar de forma explícita ou exigir confirmação administrativa se não houver base confiável de consumo (policy configurável), nunca assumir silently.

## Evidências a coletar na execução real
- Comandos usados, versão do DragonFruit, perfis/plugins.
- JSON bruto de saída, tempos, camadas, volume reportado.
- Comparação percentual: geométrico vs slice vs consumo esperado com perdas.
