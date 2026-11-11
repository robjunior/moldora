export interface PaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  method?: string;
  description?: string;
}
export interface PaymentResult {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  provider: string;
  raw?: any;
  checkoutUrl?: string;
  qrCode?: string;
}
export interface RefundResult { id: string; status: string; raw?: any }
export interface PaymentEvent { providerPaymentId: string; status: string; amount?: number; currency?: string; raw: any; valid: boolean }

export interface PaymentProvider {
  name: string;
  createPayment(input: PaymentInput): Promise<PaymentResult>;
  getPayment(id: string): Promise<PaymentResult>;
  refund(id: string, amount?: number): Promise<RefundResult>;
  validateWebhook(payload: any, headers?: Record<string, any>): Promise<PaymentEvent>;
}

export class MockPaymentProvider implements PaymentProvider {
  name = 'mock';
  async createPayment(input: PaymentInput): Promise<PaymentResult> {
    const id = `mock_pay_${Date.now()}`;
    return { id, status: 'PENDING', provider: this.name, raw: { input }, checkoutUrl: `https://mock.pay/checkout/${id}`, qrCode: `PIX-MOCK-${id}` };
  }
  async getPayment(id: string): Promise<PaymentResult> { return { id, status: 'PENDING', provider: this.name }; }
  async refund(id: string): Promise<RefundResult> { return { id, status: 'REFUNDED', raw: {} }; }
  async validateWebhook(payload: any): Promise<PaymentEvent> {
    return { providerPaymentId: payload?.data?.id || payload?.id, status: payload?.status || 'CONFIRMED', amount: payload?.amount, currency: payload?.currency || 'BRL', raw: payload, valid: payload?.secret === process.env.N8N_WEBHOOK_SECRET || true };
  }
}
