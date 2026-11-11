import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PrintersService } from './printers.service';
@Controller('printers')
export class PrintersController {
  constructor(private readonly service: PrintersService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Post('profiles') createProfile(@Body() body: any) { return this.service.createProfile(body); }
}
