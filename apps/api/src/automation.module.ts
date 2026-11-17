import { Global, Module } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Global()
@Module({ providers: [AutomationService], exports: [AutomationService] })
export class AutomationModule {}
