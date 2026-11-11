import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_ORDER_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'] as const;
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.order.findMany({
      include: { quote: true, customer: true, payments: true, productionLogs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFromQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'APPROVED') throw new BadRequestException('Quote must be APPROVED');
    const existing = await this.prisma.order.findFirst({ where: { quoteId }, include: { quote: true, customer: true, payments: true, productionLogs: { orderBy: { createdAt: 'desc' } } } });
    if (existing) return existing;
    const order = await this.prisma.order.create({ data: { quoteId, customerId: quote.customerId, status: 'AWAITING_PAYMENT' } });
    await this.prisma.quote.update({ where: { id: quoteId }, data: { status: 'CONVERTED' } });
    await this.prisma.productionLog.create({ data: { orderId: order.id, status: 'AWAITING_PAYMENT', message: 'Order created from approved quote' } });
    return this.get(order.id);
  }

  async get(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        quote: { include: { items: true } },
        customer: true,
        payments: { orderBy: { createdAt: 'desc' } },
        productionLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(id: string, status: string, note?: string, actorId?: string) {
    const order = await this.get(id);
    const next = String(status || '').toUpperCase();
    if (!ALLOWED_ORDER_STATUSES.includes(next as any)) throw new BadRequestException(`Invalid order status: ${status}`);
    if (order.status === next) return order;
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(next)) throw new BadRequestException(`Invalid order status transition: ${order.status} -> ${next}`);
    await this.prisma.order.update({ where: { id }, data: { status: next as any } });
    await this.prisma.productionLog.create({ data: { orderId: id, status: next, message: note || `Status changed ${order.status} -> ${next}`, actorId } });
    return this.get(id);
  }
}
