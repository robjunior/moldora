import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SlicingService implements OnModuleDestroy {
  private queue: Queue;
  private connection: IORedis;

  constructor(private prisma: PrismaService, private storage: StorageService) {
    this.connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
    this.queue = new Queue(process.env.SLICING_QUEUE_NAME || 'slicing-jobs', { connection: this.connection });
  }

  async createJob(data: { fileId: string; printerId?: string; materialId?: string; profileId?: string; mode?: string }) {
    const file = await this.prisma.file3D.findUnique({ where: { id: data.fileId } });
    if (!file) throw new NotFoundException('File not found');

    const job = await this.prisma.slicingJob.create({
      data: {
        fileId: data.fileId,
        printerId: data.printerId,
        materialId: data.materialId,
        profileId: data.profileId,
        mode: data.mode || process.env.DRAGONFRUIT_MODE || 'auto',
        status: 'QUEUED',
        inputParams: data as any,
      },
    });

    const filePath = await this.storage.getPath(file.storageKey);
    await this.queue.add('analyze', {
      jobRecordId: job.id,
      fileId: file.id,
      filePath,
      fileFormat: file.format,
      mode: job.mode,
    }, { jobId: job.id, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 });

    return job;
  }

  getJob(id: string) { return this.prisma.slicingJob.findUnique({ where: { id }, include: { file: true } }); }
  listByFile(fileId: string) { return this.prisma.slicingJob.findMany({ where: { fileId }, orderBy: { createdAt: 'desc' }, include: { file: true } }); }
  list() { return this.prisma.slicingJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { file: true } }); }

  async reprocess(id: string) {
    const job = await this.prisma.slicingJob.findUnique({ where: { id }, include: { file: true } });
    if (!job) throw new NotFoundException('Slicing job not found');
    if (job.status === 'QUEUED' || job.status === 'RUNNING') return job;
    if (!job.file) throw new NotFoundException('File not found');

    const updated = await this.prisma.slicingJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        rawResult: null as any,
        normalizedResult: null as any,
        startedAt: null,
        finishedAt: null,
        durationMs: null,
      },
      include: { file: true },
    });

    const filePath = await this.storage.getPath(job.file.storageKey);
    try { await this.queue.remove(id); } catch {}
    await this.queue.add('analyze', {
      jobRecordId: job.id,
      fileId: job.fileId,
      filePath,
      fileFormat: job.file.format,
      mode: job.mode,
    }, { jobId: `${job.id}-${Date.now()}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 });

    return updated;
  }

  async onModuleDestroy() {
    await this.queue?.close();
    await this.connection?.quit();
  }
}
