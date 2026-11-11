import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const [quotesTotal, quotesAwaiting, paymentsPending, ordersInProduction, ordersCompleted, paymentsConfirmed] = await Promise.all([
      this.prisma.quote.count(),
      this.prisma.quote.count({ where: { status: 'SENT' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'IN_PRODUCTION' } }),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.findMany({ where: { status: 'CONFIRMED' }, select: { amount: true } }),
    ]);
    const revenueReceived = paymentsConfirmed.reduce((s, p) => s + Number(p.amount || 0), 0);
    const recentQuotes = await this.prisma.quote.findMany({ take: 5, orderBy: { updatedAt: 'desc' }, include: { customer: true } });
    const recentOrders = await this.prisma.order.findMany({ take: 5, orderBy: { updatedAt: 'desc' }, include: { customer: true } });
    return {
      indicators: {
        quotesTotal,
        quotesAwaitingApproval: quotesAwaiting,
        paymentsPending,
        ordersInProduction,
        ordersCompleted,
        revenueReceived,
      },
      recent: { quotes: recentQuotes, orders: recentOrders },
    };
  }
}
