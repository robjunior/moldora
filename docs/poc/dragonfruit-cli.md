# DragonFruit CLI — PoC Capabilities and Contract

> **Status (updated):** a DragonFruit Flatpak app is installed on this host (`org.openresinalliance.dragonfruit`, user install), and an installer bundle exists at `/home/rob/Downloads/Instaladores/dragonfruit-0.2.1-x86_64.flatpak`. However, no `dragonfruit` executable is exported to PATH, and the installed app currently launches the **desktop GUI** (`/app/bin/dragonfruit` → `/app/lib/dragonfruit/dragonfruit-desktop`, CEF-based). Headless CLI validation is **still pending**: in this headless environment the desktop binary could not be run to completion (CEF/webview/sandbox/runtime errors), so real CLI subcommands and JSON output remain unconfirmed. The worker pipeline is validated in **mock** mode.

## 1. PoC objective
Run headless analysis/slicing of resin (SLA/MSLA) models, isolated from the web backend, producing a **normalized JSON** for the pricing engine.

## 2. Expected/targeted commands (headless) — to confirm against real CLI
| Command | Purpose | Expected output (target) |
|---|---|---|
| `mesh info` | Read geometry/model information | JSON with volumes/dimensions (to confirm) |
| `island full` | Full support/island analysis | support/issue data (to confirm) |
| `scene slice` | Process scene with printer and material profile | print summary (to confirm) |
| `slice run` | Execute slicing | JSON with layers, processing time, metrics (to confirm) |
| `--version` | Version/availability | version string |

> **Note:** flags, exact argument format, and output schema must be confirmed against the installed/target CLI. The adapter must not assume unobserved fields. Default attempts in code are placeholders aligned to this target contract.

## 3. Normalized output contract (`NormalizedSlicingResult`)
Minimum fields for pricing: `volumeMl`, `printTimeSec`, `printProfile/material` when available, `raw` preserved, and `capabilitiesGaps[]`.
Additional fields:
- `metrics`: free-form map for real additional metrics (raw/attempt details may be attached for diagnostics)
- `capabilitiesGaps[]`: expected fields not provided by the CLI
- `warnings[]`: fallbacks, assumptions, execution failures

## 4. Isolation and security policy
- **No arbitrary shell:** execution via spawn with array args; never concatenate user input into a shell string.
- **Profile/path guard:** printer/material profile paths can be restricted to `DRAGONFRUIT_ALLOWED_PROFILES_DIR`.
- **Isolation:** process in a worker/container separate from the API.
- **Timeout:** `SLICING_JOB_TIMEOUT_MS` (default 10 min), kill on overflow.
- **Idempotency:** reprocessing allowed per job; output persisted by job.

## 5. Execution modes and configuration
- `DRAGONFRUIT_MODE=cli`: requires a working CLI; fails with structured error if unavailable/unusable.
- `DRAGONFRUIT_MODE=mock`: generates deterministic/estimated result to validate pipeline, schema, and persistence (do not use for real pricing).
- `DRAGONFRUIT_MODE=auto`: uses CLI when an explicit local path is available (or a PATH command is configured), otherwise falls back to mock with explicit warning.
- `DRAGONFRUIT_CLI_PATH`: executable path/name (default `dragonfruit`).
- `DRAGONFRUIT_CLI_ATTEMPTS_JSON` (optional): override default attempts to match the real CLI without code changes, e.g.
  ```json
  [{"label":"mesh_info","args":["mesh","info","--json","{file}"]},{"label":"slice_run","args":["slice","run","--json","{file}"]}]
  ```
  Placeholders: `{file}`, `{printerProfile}`, `{materialProfile}`. When set, custom attempts are used as provided (default whitelist is bypassed for custom attempts; keep commands trusted).

### Local installation notes (this host)
- Installed Flatpak: `flatpak info org.openresinalliance.dragonfruit` (user). Bundle: `/home/rob/Downloads/Instaladores/dragonfruit-0.2.1-x86_64.flatpak`.
- Inside sandbox: `/app/bin/dragonfruit` is a wrapper launching `/app/lib/dragonfruit/dragonfruit-desktop` (CEF). Direct GUI launch is not suitable for this headless worker environment.
- Local plugin/profile source found: `/home/rob/Documents/df-plugin-creality/dragonfruit-plugin.json` (Creality HALOT presets). `config/dragonfruit-profiles/` is currently empty.
- If/when a headless CLI entrypoint is confirmed, prefer invoking it via a small trusted wrapper script (set as `DRAGONFRUIT_CLI_PATH`) that handles `flatpak run`/environment details, so the worker keeps `spawn` with array args and no shell.

## 6. Known gaps / blockers
- **Headless CLI contract unconfirmed:** real subcommands/flags/JSON schema not yet observed from the installed app in this environment.
- **Profiles/plugins:** required printer/material profiles may be mandatory for real slicing; authorized profiles directory must be populated and validated.
- **Metric semantics:** real resin consumption may differ from geometric volume (see `metrics-validation.md`).
- **Cost per plate vs per model** in multi-print scenarios requires specific modeling.

## 7. Next steps to close POC-02
1. Confirm whether the installed DragonFruit build exposes a headless/CLI mode (or a separate CLI binary) and capture `--help`/`--version` + JSON outputs in a capable environment.
2. Create a trusted wrapper/entrypoint for the worker and configure `DRAGONFRUIT_CLI_PATH` / `DRAGONFRUIT_CLI_ATTEMPTS_JSON` / `DRAGONFRUIT_ALLOWED_PROFILES_DIR`.
3. Run `mesh info` and slice commands on 2–3 reference STLs with appropriate profiles/plugins.
4. Adjust normalization/mapping to the real schema and compare metrics with `docs/poc/metrics-validation.md`.
5. (Optional) Build a dedicated container image with DragonFruit CLI + profiles/plugins for reproducible worker runs.
