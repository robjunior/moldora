import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PRICING_KEY = 'pricing_config';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getPricing() {
    const s = await this.prisma.systemSetting.findUnique({ where: { key: PRICING_KEY } });
    return s?.value || {
      currency: 'BRL',
      defaultMarginRate: 0.4,
      energyCostPerJob: 2.0,
      operationCostPerJob: 5.0,
      laborCostPerJob: 10.0,
      machineCostPerHour: 3.0,
      lossRate: 0.1,
    };
  }

  async updatePricing(value: any) {
    return this.prisma.systemSetting.upsert({ where: { key: PRICING_KEY }, update: { value }, create: { key: PRICING_KEY, value } });
  }
}
