import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockPaymentProvider, PaymentProvider } from './payment-provider';

@Injectable()
export class PaymentsService {
  private provider: PaymentProvider;
  constructor(private prisma: PrismaService) {
    this.provider = new MockPaymentProvider();
  }

  list(orderId?: string) {
    return this.prisma.payment.findMany({
      where: orderId ? { orderId } : undefined,
      include: { order: { include: { quote: true, customer: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(body: { orderId: string; amount?: number; currency?: string; method?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: body.orderId }, include: { quote: true, payments: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (['CANCELLED', 'COMPLETED'].includes(order.status)) throw new BadRequestException('Cannot create payment for closed order');
    const pending = (order.payments || []).find((p: any) => p.status === 'PENDING');
    if (pending) return this.get(pending.id);
    const amount = Number(body.amount ?? order.quote?.total ?? 0);
    if (!(amount > 0)) throw new BadRequestException('Valid payment amount is required');
    const currency = body.currency || order.quote?.currency || 'BRL';
    const res = await this.provider.createPayment({ orderId: body.orderId, amount, currency, method: body.method });
    const rawResponse = { ...(res.raw || {}), checkoutUrl: res.checkoutUrl, qrCode: res.qrCode, providerResponse: res };
    return this.prisma.payment.create({
      data: {
        orderId: body.orderId,
        provider: res.provider,
        providerPaymentId: res.id,
        status: res.status as any,
        method: body.method,
        amount: amount as any,
        currency,
        rawResponse: rawResponse as any,
      },
      include: { order: { include: { quote: true, customer: true } } },
    });
  }

  async get(id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id }, include: { order: { include: { quote: true, customer: true } } } });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  async handleWebhook(provider: string, payload: any) {
    const event = await this.provider.validateWebhook(payload);
    if (!event.valid) throw new BadRequestException('Invalid webhook');
    const payment = await this.prisma.payment.findFirst({ where: { provider, providerPaymentId: event.providerPaymentId } });
    if (!payment) return { ok: true, ignored: 'payment_not_found' };
    const incomingStatus = event.status || payment.status;
    if (payment.status === 'REFUNDED') return { ok: true, ignored: 'payment_refunded', payment: await this.get(payment.id) };
    if (incomingStatus === 'CONFIRMED' && !['PENDING', 'CONFIRMED'].includes(payment.status)) {
      return { ok: true, ignored: 'invalid_confirm_transition', payment: await this.get(payment.id) };
    }
    if (payment.status === 'CONFIRMED' && incomingStatus === 'CONFIRMED') return { ok: true, idempotent: true, payment: await this.get(payment.id) };
    if (event.amount != null && Number(event.amount) !== Number(payment.amount)) {
      await this.prisma.auditLog.create({ data: { action: 'PAYMENT_AMOUNT_MISMATCH', entityType: 'Payment', entityId: payment.id, metadata: { expected: String(payment.amount), received: String(event.amount) } as any } });
      throw new BadRequestException('Payment amount mismatch');
    }
    const updated = await this.prisma.payment.update({ where: { id: payment.id }, data: { status: (incomingStatus as any) || payment.status, paidAt: incomingStatus === 'CONFIRMED' ? new Date() : payment.paidAt, webhookEvents: payload as any } });
    if (incomingStatus === 'CONFIRMED' && payment.status !== 'CONFIRMED') {
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } });
      await this.prisma.productionLog.create({ data: { orderId: payment.orderId, status: 'PAID', message: `Payment confirmed via ${provider} webhook` } });
    }
    return { ok: true, payment: await this.get(updated.id) };
  }

  async simulateConfirm(id: string) {
    const payment = await this.get(id);
    if (payment.provider !== 'mock') throw new BadRequestException('Simulated confirmation is only supported for mock payments');
    if (payment.status === 'CONFIRMED') return { ok: true, idempotent: true, payment: await this.get(payment.id) };
    if (payment.status !== 'PENDING') throw new BadRequestException('Only pending payments can be confirmed');
    const payload = {
      id: payment.providerPaymentId || payment.id,
      data: { id: payment.providerPaymentId || payment.id },
      status: 'CONFIRMED',
      amount: Number(payment.amount),
      currency: payment.currency || 'BRL',
      secret: process.env.N8N_WEBHOOK_SECRET || 'mock-secret',
      simulated: true,
    };
    return this.handleWebhook(payment.provider, payload);
  }

  async refund(id: string) {
    const payment = await this.get(id);
    if (payment.provider !== 'mock') throw new BadRequestException('Refund is only supported for mock payments');
    if (payment.status === 'REFUNDED') return this.get(payment.id);
    if (payment.status !== 'CONFIRMED') throw new BadRequestException('Only confirmed payments can be refunded');
    const refund = await this.provider.refund(payment.providerPaymentId || payment.id);
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: (refund.status === 'REFUNDED' ? 'REFUNDED' : payment.status) as any },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REFUNDED',
        entityType: 'Payment',
        entityId: payment.id,
        metadata: { refundId: refund.id, amount: Number(payment.amount) } as any,
      },
    });
    await this.prisma.productionLog.create({
      data: {
        orderId: payment.orderId,
        status: payment.order?.status || 'PAID',
        message: `Payment refunded via ${payment.provider}`,
      },
    });
    return this.get(updated.id);
  }
}
