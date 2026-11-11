# DragonFruit CLI — PoC Capabilities and Contract

> **Status (Nov 10 2026, local environment `/home/rob`)**: `dragonfruit`/`DragonFruit` binary **not found** in PATH. This document consolidates the intended integration contract based on the provided specification/cited official documentation and defines worker behavior in `cli` and `mock` modes. Validation with the real CLI must be completed in an environment where DragonFruit is installed (dedicated container recommended).

## 1. PoC objective
Run headless analysis/slicing of resin (SLA/MSLA) models, isolated from the web backend, producing a **normalized JSON** for the pricing engine.

## 2. Expected/targeted commands (headless)
| Command | Purpose | Expected output (target) |
|---|---|---|
| `mesh info` | Read geometry/model information | JSON with volumes/dimensions (to confirm) |
| `island full` | Full support/island analysis | support/issue data (to confirm) |
| `scene slice` | Process scene with printer and material profile | print summary (to confirm) |
| `slice run` | Execute slicing | JSON with layers, processing time, metrics (to confirm) |
| `--version` | Version/availability | version string |

> **Note:** flags, exact argument format, and output schema must be confirmed in the target environment (complementary POC-02). The adapter must not assume unobserved fields.

## 3. Normalized output contract (`NormalizedSlicingResult`)
Minimum fields for pricing: `volumeMl`, `printTimeSec`, `printProfile/material` when available, `raw` preserved, and `capabilitiesGaps[]`.
Additional fields:
- `metrics`: free-form map for real additional metrics
- `capabilitiesGaps[]`: expected fields not provided by the CLI
- `warnings[]`: fallbacks, assumptions, execution failures

## 4. Isolation and security policy
- **No arbitrary shell:** execution via spawn with array args; never concatenate user input into a shell string.
- **Whitelist:** only authorized commands/profiles and system-resolved paths (IDs → paths allowed in profiles directory).
- **Isolation:** process in a worker/container separate from the API.
- **Timeout:** `SLICING_JOB_TIMEOUT_MS` (default 10 min), kill on overflow.
- **Idempotency:** reprocessing allowed per job; output persisted by job.

## 5. Execution modes
- `DRAGONFRUIT_MODE=cli`: requires installed CLI; fails with structured error if unavailable.
- `DRAGONFRUIT_MODE=mock`: generates deterministic/estimated result to validate pipeline, schema, and persistence (do not use for real pricing).
- `DRAGONFRUIT_MODE=auto`: uses CLI if found, otherwise mock with explicit warning.

## 6. Known gaps (current environment)
- CLI not installed on this host: **real validation pending** in PoC container.
- Required printer profiles, resins, and plugins may be mandatory for `slice run`/`scene slice`.
- Real resin consumption may differ from geometric volume (see `metrics-validation.md`).
- Cost per plate vs per model in multi-print scenarios requires specific modeling.

## 7. Next steps to close POC-02 in a CLI-enabled environment
1. Build Docker image with DragonFruit CLI + profiles/plugins.
2. Capture `--help`/`--version` and real JSON outputs.
3. Run `mesh info` and `slice run` on 2–3 reference STLs.
4. Adjust parser/normalizer for the real schema.
5. Compare metrics with `docs/poc/metrics-validation.md`.
