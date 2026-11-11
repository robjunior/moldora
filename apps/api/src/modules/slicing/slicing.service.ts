import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SlicingService {
  constructor(private prisma: PrismaService) {}

  async createJob(data: { fileId: string; printerId?: string; materialId?: string; profileId?: string; mode?: string }) {
    return this.prisma.slicingJob.create({
      data: {
        fileId: data.fileId,
        printerId: data.printerId,
        materialId: data.materialId,
        profileId: data.profileId,
        mode: data.mode || process.env.DRAGONFRUIT_MODE || 'auto',
        status: 'QUEUED',
      },
    });
  }

  getJob(id: string) { return this.prisma.slicingJob.findUnique({ where: { id }, include: { file: true } }); }
  listByFile(fileId: string) { return this.prisma.slicingJob.findMany({ where: { fileId }, orderBy: { createdAt: 'desc' } }); }
}
