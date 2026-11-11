import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.order.findMany({ include: { quote: true, customer: true, payments: true }, orderBy: { createdAt: 'desc' } }); }

  async createFromQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'APPROVED') throw new BadRequestException('Quote must be APPROVED');
    const existing = await this.prisma.order.findFirst({ where: { quoteId } });
    if (existing) return existing;
    const order = await this.prisma.order.create({ data: { quoteId, customerId: quote.customerId, status: 'AWAITING_PAYMENT' } });
    await this.prisma.quote.update({ where: { id: quoteId }, data: { status: 'CONVERTED' } });
    await this.prisma.productionLog.create({ data: { orderId: order.id, status: 'AWAITING_PAYMENT', message: 'Pedido criado a partir de orçamento aprovado' } });
    return order;
  }

  async get(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: { quote: true, customer: true, payments: true, productionLogs: { orderBy: { createdAt: 'asc' } } } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(id: string, status: string, note?: string, actorId?: string) {
    const order = await this.get(id);
    // Basic guard: production requires paid or explicit override not modeled yet; allow but log
    const updated = await this.prisma.order.update({ where: { id }, data: { status: status as any } });
    await this.prisma.productionLog.create({ data: { orderId: id, status, message: note, actorId } });
    return updated;
  }
}
