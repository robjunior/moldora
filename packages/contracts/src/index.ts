export type SlicingJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface SlicingInput {
  jobId: string;
  fileId: string;
  filePath: string;
  fileFormat: "STL" | "3MF" | "OBJ" | "VOXL" | string;
  printerProfileId?: string;
  printerProfilePath?: string; // authorized path resolved by backend/worker
  materialProfileId?: string;
  materialProfilePath?: string;
  mode?: "cli" | "mock" | "auto";
}

export interface NormalizedSlicingResult {
  contractVersion: "0.1";
  slicer: "dragonfruit";
  mode: "cli" | "mock";
  material?: string | null;
  estimatedWeightG?: number | null;
  printTimeSec?: number | null;
  volumeMl?: number | null; // resin volume if available
  volumeCm3?: number | null; // geometric volume if available
  filamentUsedMm?: number | null;
  filamentUsedG?: number | null;
  supportsUsed?: boolean | null;
  quantity?: number | null;
  printProfile?: string | null;
  layers?: number | null;
  metrics?: Record<string, unknown>;
  capabilitiesGaps: string[];
  warnings: string[];
}

export interface SlicingExecutionResult {
  status: "SUCCEEDED" | "FAILED";
  normalized?: NormalizedSlicingResult;
  raw?: unknown;
  artifacts?: { name: string; path: string }[];
  error?: { message: string; code?: string; details?: unknown };
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface SlicerAdapter {
  readonly name: string;
  analyze(input: SlicingInput): Promise<SlicingExecutionResult>;
}
