import { Body, Controller, Get, Param, Patch, Post, Delete } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  list() { return this.service.list(); }
  @Post()
  create(@Body() body: any) { return this.service.create(body); }
  @Get(':id')
  get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id')
  archive(@Param('id') id: string) { return this.service.archive(id); }
}
