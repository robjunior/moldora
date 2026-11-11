/**
 * PoC helper: run a single slicing analysis without Redis/BullMQ.
 * Usage:
 *   DRAGONFRUIT_MODE=mock bun apps/worker/src/run-once.ts --file /path/to/model.stl [--no-persist]
 * Requires DATABASE_URL if you want persistence (optional for dry-run output).
 */
import { resolve } from "path";
import { createSlicerAdapter } from "./slicer/dragonfruit";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const filePathArg = arg("--file");
  if (!filePathArg) {
    console.error("Usage: bun src/run-once.ts --file /path/to/model.stl [--file-id id] [--job-id id] [--no-persist]");
    process.exit(2);
  }
  const filePath = resolve(filePathArg);
  const fileId = arg("--file-id") || `file_${Date.now()}`;
  const jobId = arg("--job-id") || `job_${Date.now()}`;
  const persist = !!process.env.DATABASE_URL && !process.argv.includes("--no-persist");

  const adapter = createSlicerAdapter();
  console.log(`[run-once] adapter=${adapter.name} mode=${process.env.DRAGONFRUIT_MODE || "auto"} file=${filePath}`);

  let disconnectPrisma: (() => Promise<void>) | null = null;
  if (persist) {
    const db = await import("./db");
    const prisma = db.getPrisma();
    disconnectPrisma = db.disconnectPrisma;
    const customer = await prisma.customer.upsert({
      where: { id: "poc-customer" },
      update: {},
      create: { id: "poc-customer", name: "PoC Customer" },
    });
    const file = await prisma.file3D.upsert({
      where: { id: fileId },
      update: { storageKey: filePath, originalName: filePath.split("/").pop() || "model.stl", format: "STL", sizeBytes: 0 },
      create: { id: fileId, customerId: customer.id, storageKey: filePath, originalName: filePath.split("/").pop() || "model.stl", format: "STL", sizeBytes: 0 },
    });
    await prisma.slicingJob.upsert({
      where: { id: jobId },
      update: { status: "RUNNING", startedAt: new Date(), mode: process.env.DRAGONFRUIT_MODE || "auto", inputParams: { filePath, fileId } as any },
      create: { id: jobId, fileId: file.id, status: "RUNNING", startedAt: new Date(), mode: process.env.DRAGONFRUIT_MODE || "auto", inputParams: { filePath, fileId } as any },
    });
  }

  const result = await adapter.analyze({ jobId, fileId, filePath, fileFormat: "STL", mode: (process.env.DRAGONFRUIT_MODE as any) || "auto" });
  console.log(JSON.stringify(result, null, 2));

  if (persist) {
    const db = await import("./db");
    const prisma = db.getPrisma();
    disconnectPrisma = db.disconnectPrisma;
    await prisma.slicingJob.update({
      where: { id: jobId },
      data: {
        status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
        rawResult: result.raw as any,
        normalizedResult: result.normalized as any,
        errorMessage: result.error?.message,
        finishedAt: new Date(result.finishedAt),
        durationMs: result.durationMs,
      },
    });
    console.log(`[run-once] persisted jobId=${jobId}`);
  }

  if (disconnectPrisma) await disconnectPrisma();
  process.exit(result.status === "SUCCEEDED" ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
