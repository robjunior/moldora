import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { createSlicerAdapter } from "./slicer/dragonfruit";
import { getPrisma } from "./db";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const queueName = process.env.SLICING_QUEUE_NAME || "slicing-jobs";

interface SlicingJobData {
  jobRecordId: string; // DB SlicingJob id
  fileId: string;
  filePath: string;
  fileFormat?: string;
  printerProfileId?: string;
  printerProfilePath?: string;
  materialProfileId?: string;
  materialProfilePath?: string;
  mode?: "cli" | "mock" | "auto";
}

async function processSlicing(job: Job<SlicingJobData>) {
  const prisma = getPrisma();
  const adapter = createSlicerAdapter();
  const data = job.data;

  await prisma.slicingJob.update({
    where: { id: data.jobRecordId },
    data: { status: "RUNNING", startedAt: new Date(), inputParams: data as any },
  });

  const result = await adapter.analyze({
    jobId: data.jobRecordId,
    fileId: data.fileId,
    filePath: data.filePath,
    fileFormat: (data.fileFormat as any) || "STL",
    printerProfileId: data.printerProfileId,
    printerProfilePath: data.printerProfilePath,
    materialProfileId: data.materialProfileId,
    materialProfilePath: data.materialProfilePath,
    mode: data.mode,
  });

  await prisma.slicingJob.update({
    where: { id: data.jobRecordId },
    data: {
      status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
      rawResult: result.raw as any,
      normalizedResult: result.normalized as any,
      errorMessage: result.error?.message,
      finishedAt: new Date(result.finishedAt),
      durationMs: result.durationMs,
    },
  });

  if (result.status === "FAILED") {
    throw new Error(result.error?.message || "Slicing failed");
  }
  return result;
}

export function startWorker() {
  const worker = new Worker<SlicingJobData>(queueName, processSlicing, {
    connection,
    concurrency: Number(process.env.SLICING_WORKER_CONCURRENCY || 1),
  });

  worker.on("completed", (job) => console.log(`[worker] completed ${job.id}`));
  worker.on("failed", (job, err) => console.error(`[worker] failed ${job?.id}: ${err.message}`));
  console.log(`[worker] listening on queue '${queueName}'`);
  return worker;
}

if (require.main === module) {
  startWorker();
}
