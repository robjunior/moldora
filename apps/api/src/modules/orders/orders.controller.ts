import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: { quoteId: string }) { return this.service.createFromQuote(body.quoteId); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body() body: { status: string; note?: string; actorId?: string }) {
    return this.service.updateStatus(id, body.status, body.note, body.actorId);
  }
}
