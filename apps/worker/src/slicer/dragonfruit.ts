import { existsSync } from "fs";
import { basename, resolve } from "path";
import { SlicerAdapter, SlicingExecutionResult, SlicingInput, NormalizedSlicingResult } from "../../../../packages/contracts/src";
import { execFileSafe } from "../lib/exec";
import { analyzeMock } from "./mock";

const DEFAULT_ALLOWED_COMMANDS = new Set(["mesh", "island", "scene", "slice"]);
const DEFAULT_ALLOWED_SUBCOMMANDS = new Set(["info", "full", "slice", "run", "analyze", "estimate", "--version", "version", "--help", "help"]);

function getCliPath(): string {
  return process.env.DRAGONFRUIT_CLI_PATH || "dragonfruit";
}

function cliLooksAvailable(cliPath: string): boolean {
  // Absolute path must exist. Non-absolute command names are resolved by spawn/PATH at exec time.
  if (cliPath.startsWith("/") || cliPath.startsWith("./") || cliPath.startsWith("../")) {
    return existsSync(resolve(cliPath));
  }
  return true;
}

function resolveMode(requested?: string): "cli" | "mock" {
  const mode = (requested || process.env.DRAGONFRUIT_MODE || "auto").toLowerCase();
  const cliPath = getCliPath();
  if (mode === "mock") return "mock";
  if (mode === "cli") return "cli";
  // auto: fall back to mock only when an explicit local path is missing; PATH commands are attempted in cli mode.
  return cliLooksAvailable(cliPath) ? "cli" : "mock";
}

function safeJsonParse(text: string): unknown | null {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    // try to extract last JSON object/array from mixed output
    const objIdx = t.lastIndexOf("{");
    const arrIdx = t.lastIndexOf("[");
    const idx = Math.max(objIdx, arrIdx);
    if (idx >= 0) {
      try { return JSON.parse(t.slice(idx)); } catch { return null; }
    }
    return null;
  }
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function normalizeFromRaw(raw: any, mode: "cli" | "mock", warnings: string[] = []): NormalizedSlicingResult {
  // Best-effort mapping: real CLI schema must be confirmed in POC-02 environment.
  const gaps: string[] = [];
  const printTimeSec = toNumber(raw?.print_time_sec ?? raw?.printTimeSec ?? raw?.time_sec ?? raw?.estimated_print_time_s);
  const volumeMl = toNumber(raw?.volume_ml ?? raw?.volumeMl ?? raw?.resin_volume_ml);
  const volumeCm3 = toNumber(raw?.volume_cm3 ?? raw?.volumeCm3 ?? raw?.volume ?? raw?.mesh_volume_cm3);
  const layers = toNumber(raw?.layers ?? raw?.layer_count ?? raw?.num_layers);
  if (printTimeSec == null) gaps.push("print_time");
  if (volumeMl == null) gaps.push("resin_volume_ml");
  if (volumeCm3 == null) gaps.push("volume_cm3");
  if (layers == null) gaps.push("layers");

  return {
    contractVersion: "0.1",
    slicer: "dragonfruit",
    mode,
    material: raw?.material ?? null,
    estimatedWeightG: toNumber(raw?.estimated_weight_g),
    printTimeSec,
    volumeMl,
    volumeCm3,
    filamentUsedMm: toNumber(raw?.filament_mm),
    filamentUsedG: toNumber(raw?.filament_g),
    supportsUsed: typeof raw?.supports === "boolean" ? raw.supports : null,
    quantity: toNumber(raw?.quantity) ?? 1,
    printProfile: raw?.profile ?? raw?.printer_profile ?? null,
    layers,
    metrics: raw && typeof raw === "object" ? raw : {},
    capabilitiesGaps: gaps,
    warnings,
  };
}

export class DragonFruitAdapter implements SlicerAdapter {
  readonly name = "dragonfruit";

  async analyze(input: SlicingInput): Promise<SlicingExecutionResult> {
    const startedAt = new Date();
    const mode = resolveMode(input.mode);
    if (mode === "mock") {
      const res = await analyzeMock(input);
      if ((input.mode || process.env.DRAGONFRUIT_MODE || "auto") === "auto") {
        res.normalized?.warnings.push("DragonFruit CLI not found; auto mode fell back to mock.");
      }
      return res;
    }

    const cli = getCliPath();
    if (!existsSync(cli) && cli.startsWith("/")) {
      const finishedAt = new Date();
      return {
        status: "FAILED",
        error: { message: `DragonFruit CLI not found at ${cli}`, code: "CLI_NOT_FOUND" },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }

    // Authorized/profile path guard (best-effort): only allow files under configured profiles dir when provided
    const profilesDir = process.env.DRAGONFRUIT_ALLOWED_PROFILES_DIR;
    const validateAllowedPath = (p?: string) => {
      if (!p) return;
      if (!profilesDir) return; // until profiles are configured, rely on caller authorization
      const resolved = resolve(p);
      const base = resolve(profilesDir);
      if (!resolved.startsWith(base)) throw new Error(`Profile not allowed: ${p}`);
    };
    try {
      validateAllowedPath(input.printerProfilePath);
      validateAllowedPath(input.materialProfilePath);
    } catch (e: any) {
      const finishedAt = new Date();
      return {
        status: "FAILED",
        error: { message: e.message, code: "PROFILE_NOT_ALLOWED" },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }

    const timeoutMs = Number(process.env.SLICING_JOB_TIMEOUT_MS || 600000);
    const filePath = resolve(input.filePath);
    if (!existsSync(filePath)) {
      const finishedAt = new Date();
      return {
        status: "FAILED",
        error: { message: `File not found: ${filePath}`, code: "FILE_NOT_FOUND" },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }

    // Conservative default attempts; real args must be aligned with installed CLI (POC-02).
    // Override with DRAGONFRUIT_CLI_ATTEMPTS_JSON='[{"label":"info","args":["mesh","info","--json","{file}"]},...]'
    // Placeholders: {file}, {printerProfile}, {materialProfile}
    const fill = (s: string) => s
      .replaceAll("{file}", filePath)
      .replaceAll("{printerProfile}", input.printerProfilePath || "")
      .replaceAll("{materialProfile}", input.materialProfilePath || "");
    let attempts: { cmd: string; args: string[]; label: string }[] = [
      { cmd: cli, args: ["mesh", "info", "--json", filePath], label: "mesh_info" },
      { cmd: cli, args: ["slice", "run", "--json", filePath], label: "slice_run" },
    ];
    const custom = process.env.DRAGONFRUIT_CLI_ATTEMPTS_JSON;
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        if (Array.isArray(parsed) && parsed.length) {
          attempts = parsed.map((a: any, i: number) => ({
            cmd: typeof a.cmd === "string" && a.cmd ? a.cmd : cli,
            args: Array.isArray(a.args) ? a.args.map((x: any) => fill(String(x))) : [],
            label: typeof a.label === "string" && a.label ? a.label : `attempt_${i + 1}`,
          }));
        }
      } catch (e: any) {
        // keep defaults; warning added below via raw context if needed
      }
    }

    const rawParts: Record<string, unknown> = {};
    const warnings: string[] = [];
    if (custom) {
      try { JSON.parse(custom); } catch (e: any) { warnings.push(`Invalid DRAGONFRUIT_CLI_ATTEMPTS_JSON: ${String(e?.message || e)} (using defaults)`); }
    }
    let lastError: any = null;

    for (const attempt of attempts) {
      const [c1, c2] = [attempt.args[0], attempt.args[1]];
      const usingCustom = !!custom;
      if (!usingCustom && !(DEFAULT_ALLOWED_COMMANDS.has(c1) || DEFAULT_ALLOWED_COMMANDS.has(String(c1).replace(/^-+/, ""))) && c1 !== "--version" && c1 !== "--help") {
        continue; // safety for default attempts
      }
      if (!usingCustom && c2 && !(DEFAULT_ALLOWED_SUBCOMMANDS.has(c2) || DEFAULT_ALLOWED_SUBCOMMANDS.has(String(c2).replace(/^-+/, "")))) {
        // allow but warn for unknown default subcommands
      }
      try {
        const res = await execFileSafe(attempt.cmd, attempt.args, { timeoutMs });
        const parsed = safeJsonParse(res.stdout) ?? { stdout: res.stdout, stderr: res.stderr };
        rawParts[attempt.label] = { ...res, parsed };
        if (res.timedOut) {
          throw new Error(`Timeout in ${attempt.label}`);
        }
        if (res.exitCode !== 0) {
          warnings.push(`${attempt.label} returned exit code ${res.exitCode}`);
        }
      } catch (e: any) {
        lastError = e;
        rawParts[attempt.label] = { error: String(e?.message || e) };
        warnings.push(`Failure in ${attempt.label}: ${String(e?.message || e)}`);
      }
    }

    // Merge best-effort for normalization (prefer slice_run parsed data)
    const sliceParsed = (rawParts as any)?.slice_run?.parsed;
    const meshParsed = (rawParts as any)?.mesh_info?.parsed;
    const merged = (sliceParsed && typeof sliceParsed === "object" ? sliceParsed : null) ||
      (meshParsed && typeof meshParsed === "object" ? meshParsed : null);

    const finishedAt = new Date();
    if (!merged) {
      return {
        status: "FAILED",
        raw: rawParts,
        error: { message: lastError?.message || "No usable output from DragonFruit CLI", code: "NO_USABLE_OUTPUT", details: rawParts },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }

    const normalized = normalizeFromRaw(merged, "cli", warnings);
    // Attach file context
    normalized.metrics = { ...(normalized.metrics || {}), sourceFile: basename(filePath), attempts: rawParts };

    return {
      status: "SUCCEEDED",
      normalized,
      raw: rawParts,
      artifacts: [],
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }
}

export function createSlicerAdapter(): SlicerAdapter {
  return new DragonFruitAdapter();
}
