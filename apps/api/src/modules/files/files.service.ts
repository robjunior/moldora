import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async registerUpload(data: { customerId: string; originalName: string; storageKey: string; format: string; sizeBytes: number; sha256?: string }) {
    // basic versioning by sha/name could be added; MVP register
    return this.prisma.file3D.create({ data: { ...data, status: 'UPLOADED' } });
  }
  list(customerId?: string) { return this.prisma.file3D.findMany({ where: customerId ? { customerId } : undefined, orderBy: { createdAt: 'desc' } }); }
  async get(id: string) { const f = await this.prisma.file3D.findUnique({ where: { id }, include: { slicingJobs: true } }); if (!f) throw new NotFoundException('File not found'); return f; }
}
