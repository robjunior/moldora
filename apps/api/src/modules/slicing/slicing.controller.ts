import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SlicingService } from './slicing.service';

@Controller('slicing-jobs')
export class SlicingController {
  constructor(private readonly service: SlicingService) {}
  @Post() create(@Body() body: any) { return this.service.createJob(body); }
  @Get(':id') get(@Param('id') id: string) { return this.service.getJob(id); }
}
