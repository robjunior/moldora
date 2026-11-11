import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Get(':id/proposal')
  async proposal(@Param('id') id: string, @Res() res: Response) {
    const html = await this.service.proposalHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/proposal.pdf')
  async proposalPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.service.proposalPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposal-${id}.pdf"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }
  @Post(':id/items') addItem(@Param('id') id: string, @Body() body: any) { return this.service.addItem(id, body); }
  @Post(':id/items/:itemId') updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: any) { return this.service.updateItem(id, itemId, body); }
  @Post(':id/items/:itemId/remove') removeItem(@Param('id') id: string, @Param('itemId') itemId: string) { return this.service.removeItem(id, itemId); }
  @Post(':id/recalc') recalc(@Param('id') id: string) { return this.service.recalcTotals(id); }
  @Post(':id/send') send(@Param('id') id: string) { return this.service.send(id); }
  @Post(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Post(':id/reject') reject(@Param('id') id: string) { return this.service.reject(id); }
}
