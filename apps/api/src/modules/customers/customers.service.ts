import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.customer.findMany({ where: { archived: false }, orderBy: { createdAt: 'desc' } }); }
  create(data: any) { return this.prisma.customer.create({ data }); }
  async get(id: string) {
    const c = await this.prisma.customer.findUnique({ where: { id }, include: { quotes: true, orders: true, files: true } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }
  async update(id: string, data: any) { await this.get(id); return this.prisma.customer.update({ where: { id }, data }); }
  async archive(id: string) { await this.get(id); return this.prisma.customer.update({ where: { id }, data: { archived: true } }); }
}
