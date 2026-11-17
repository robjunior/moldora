import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get('pricing') getPricing() { return this.service.getPricing(); }
  @Roles('ADMIN')
  @Patch('pricing') updatePricing(@Body() body: any) { return this.service.updatePricing(body); }
}
