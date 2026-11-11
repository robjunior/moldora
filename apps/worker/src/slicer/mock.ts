import { SlicingExecutionResult, SlicingInput } from "../../../../packages/contracts/src";
import { basename } from "path";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export async function analyzeMock(input: SlicingInput): Promise<SlicingExecutionResult> {
  const startedAt = new Date();
  const seed = hashString(`${input.fileId}:${basename(input.filePath)}`);
  // Deterministic pseudo-estimates for pipeline validation only
  const volumeCm3 = 5 + (seed % 150); // 5..154 cm3
  const volumeMl = Number((volumeCm3 * 1.15).toFixed(2)); // naive factor
  const printTimeSec = 1800 + (seed % 14400); // 30m..4.5h
  const layers = 100 + (seed % 2000);
  const finishedAt = new Date(startedAt.getTime() + 25);

  return {
    status: "SUCCEEDED",
    normalized: {
      contractVersion: "0.1",
      slicer: "dragonfruit",
      mode: "mock",
      material: null,
      estimatedWeightG: null,
      printTimeSec,
      volumeMl,
      volumeCm3,
      filamentUsedMm: null,
      filamentUsedG: null,
      supportsUsed: null,
      quantity: 1,
      printProfile: input.printerProfileId ?? null,
      layers,
      metrics: { estimator: "mock-v1", seed },
      capabilitiesGaps: [
        "real_resin_consumption",
        "supports_analysis",
        "printer_profile_validation",
        "material_profile_validation",
        "cli_output_metrics",
      ],
      warnings: [
        "MOCK result for pipeline validation; do not use for real pricing.",
        "volumeMl is a naive estimate derived from simulated geometric volume.",
      ],
    },
    raw: { mock: true, input: { fileId: input.fileId, filePath: input.filePath } },
    artifacts: [],
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };
}
