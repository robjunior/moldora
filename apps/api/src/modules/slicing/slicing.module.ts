import { Module } from '@nestjs/common';
import { SlicingController } from './slicing.controller';
import { SlicingService } from './slicing.service';
import { StorageModule } from '../storage/storage.module';

@Module({ imports: [StorageModule], controllers: [SlicingController], providers: [SlicingService], exports: [SlicingService] })
export class SlicingModule {}
