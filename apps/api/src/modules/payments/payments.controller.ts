import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Get('payments') list(@Query('orderId') orderId?: string) { return this.service.list(orderId); }
  @Post('payments') create(@Body() body: any) { return this.service.create(body); }
  @Get('payments/:id') get(@Param('id') id: string) { return this.service.get(id); }
  @Post('payments/:id/simulate-confirm') simulateConfirm(@Param('id') id: string) { return this.service.simulateConfirm(id); }
  @Post('payments/:id/refund') refund(@Param('id') id: string) { return this.service.refund(id); }
  @Post('payments/:id/cancel') cancel(@Param('id') id: string) { return this.service.cancel(id); }
  @Post('webhooks/payments/:provider') webhook(@Param('provider') provider: string, @Body() body: any) {
    return this.service.handleWebhook(provider, body);
  }
}
