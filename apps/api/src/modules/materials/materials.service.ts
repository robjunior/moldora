import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.material.findMany({ orderBy: { createdAt: 'desc' } }); }
  create(data: any) { return this.prisma.material.create({ data: { ...data, pricePerLiter: data.pricePerLiter } }); }
  async get(id: string) { const m = await this.prisma.material.findUnique({ where: { id } }); if (!m) throw new NotFoundException('Material not found'); return m; }
  async update(id: string, data: any) { await this.get(id); return this.prisma.material.update({ where: { id }, data }); }
}
