import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Post('payments') create(@Body() body: any) { return this.service.create(body); }
  @Get('payments/:id') get(@Param('id') id: string) { return this.service.get(id); }
  @Post('webhooks/payments/:provider') webhook(@Param('provider') provider: string, @Body() body: any) {
    return this.service.handleWebhook(provider, body);
  }
}
