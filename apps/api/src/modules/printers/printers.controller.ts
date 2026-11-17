import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { PrintersService } from './printers.service';
@Controller('printers')
export class PrintersController {
  constructor(private readonly service: PrintersService) {}
  @Get() list() { return this.service.list(); }
  @Roles('ADMIN')
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Roles('ADMIN')
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Roles('ADMIN')
  @Post('profiles') createProfile(@Body() body: any) { return this.service.createProfile(body); }
}
