import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly service: FilesService) {}
  @Post() register(@Body() body: any) { return this.service.registerUpload(body); }
  @Get() list(@Query('customerId') customerId?: string) { return this.service.list(customerId); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
}
