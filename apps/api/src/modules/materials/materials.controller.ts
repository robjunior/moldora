import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MaterialsService } from './materials.service';
@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
}
