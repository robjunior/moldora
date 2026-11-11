import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SlicingService } from './slicing.service';

@Controller('slicing-jobs')
export class SlicingController {
  constructor(private readonly service: SlicingService) {}
  @Post() create(@Body() body: any) { return this.service.createJob(body); }
  @Get() list(@Query('fileId') fileId?: string) { return fileId ? this.service.listByFile(fileId) : this.service.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.service.getJob(id); }
  @Post(':id/reprocess') reprocess(@Param('id') id: string) { return this.service.reprocess(id); }
}
