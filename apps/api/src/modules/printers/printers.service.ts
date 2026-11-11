import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class PrintersService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.printer.findMany({ include: { profiles: true }, orderBy: { createdAt: 'desc' } }); }
  create(data: any) { return this.prisma.printer.create({ data }); }
  async get(id: string) { const p = await this.prisma.printer.findUnique({ where: { id }, include: { profiles: true } }); if (!p) throw new NotFoundException('Printer not found'); return p; }
  async update(id: string, data: any) { await this.get(id); return this.prisma.printer.update({ where: { id }, data }); }
  createProfile(data: any) { return this.prisma.printerProfile.create({ data }); }
}
