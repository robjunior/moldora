import { Module } from '@nestjs/common';
import { SlicingController } from './slicing.controller';
import { SlicingService } from './slicing.service';

@Module({ controllers: [SlicingController], providers: [SlicingService], exports: [SlicingService] })
export class SlicingModule {}
