# PoC — Metrics Validation (Geometric vs Resin Consumption)

> **Status:** theoretical/preparatory validation recorded. Empirical execution with the real DragonFruit CLI is **pending** (CLI not available in the current environment).

## Objective
Ensure the pricing engine uses the correct consumption basis (not merely STL geometric volume), complying with the technical specification.

## Definitions
1. **Geometric volume (mesh/STL)**: useful for sanity checks and model information, but **does not represent real consumption**.
2. **Estimated resin consumption (slice/scene)**: priority basis for pricing when available.
   - result from a **prepared and sliced scene** (`scene slice`/`slice run`) with printer and resin profile;
   - resin/material volume metrics reported by the slicer.
3. **Calibration factors**: configured loss/waste margin applied on top of the slicer-reported base.

## Test plan (execute when CLI is available)
| Case | File/Scene | Profile/Resin | Geometric volume (mesh) | Slice volume/time | Notes |
|---|---|---|---|---|---|
| V1 | Simple solid (cube/calibration) | to define | pending | pending | expected low geometric/slice difference |
| V2 | Hollow piece with drain holes | to define | pending | pending | hollowing reduces consumption; depends on preparation |
| V3 | Piece with supports | to define | pending | pending | supports increase consumption/time |
| V4 | Multi-part scene (if supported) | to define | pending | pending | validate per-plate vs per-model cost |

## Preliminary conclusions (for implementation)
- The slicing contract must store `volumeMl` (resin), `printTimeSec`, and `raw` for auditing.
- Pricing engine must fail explicitly or require administrative confirmation if there is no reliable consumption basis (configurable policy), never assume silently.
- Losses/supports/post-processing are applied as configurable factors and recorded in the calculation breakdown.

## Acceptance criteria (POC-07)
- Documented empirical comparison: geometric vs slice vs expected consumption with losses.
- Ingestion/normalization mapping defined for real CLI fields.
- Risks and gaps recorded in `capabilitiesGaps`.
