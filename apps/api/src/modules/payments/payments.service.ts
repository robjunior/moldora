import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockPaymentProvider, PaymentProvider } from './payment-provider';

@Injectable()
export class PaymentsService {
  private provider: PaymentProvider;
  constructor(private prisma: PrismaService) {
    this.provider = new MockPaymentProvider();
  }

  async create(body: { orderId: string; amount: number; currency?: string; method?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const res = await this.provider.createPayment({ orderId: body.orderId, amount: body.amount, currency: body.currency || 'BRL', method: body.method });
    return this.prisma.payment.create({ data: { orderId: body.orderId, provider: res.provider, providerPaymentId: res.id, status: res.status as any, method: body.method, amount: body.amount as any, currency: body.currency || 'BRL', rawResponse: res.raw as any } });
  }

  async get(id: string) { const p = await this.prisma.payment.findUnique({ where: { id } }); if (!p) throw new NotFoundException('Payment not found'); return p; }

  async handleWebhook(provider: string, payload: any) {
    const event = await this.provider.validateWebhook(payload);
    if (!event.valid) throw new BadRequestException('Invalid webhook');
    const payment = await this.prisma.payment.findFirst({ where: { provider, providerPaymentId: event.providerPaymentId } });
    if (!payment) return { ok: true, ignored: 'payment_not_found' };
    if (payment.status === 'CONFIRMED' && event.status === 'CONFIRMED') return { ok: true, idempotent: true };
    if (event.amount != null && Number(event.amount) !== Number(payment.amount)) {
      await this.prisma.auditLog.create({ data: { action: 'PAYMENT_AMOUNT_MISMATCH', entityType: 'Payment', entityId: payment.id, metadata: { expected: String(payment.amount), received: String(event.amount) } as any } });
      throw new BadRequestException('Payment amount mismatch');
    }
    const updated = await this.prisma.payment.update({ where: { id: payment.id }, data: { status: (event.status as any) || payment.status, paidAt: event.status === 'CONFIRMED' ? new Date() : payment.paidAt, webhookEvents: payload as any } });
    if (event.status === 'CONFIRMED') {
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } });
      await this.prisma.productionLog.create({ data: { orderId: payment.orderId, status: 'PAID', message: 'Pagamento confirmado via webhook' } });
    }
    return { ok: true, payment: updated };
  }
}
