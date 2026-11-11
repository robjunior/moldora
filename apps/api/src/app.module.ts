import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SlicingModule } from './modules/slicing/slicing.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PrintersModule } from './modules/printers/printers.module';
import { FilesModule } from './modules/files/files.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StorageModule } from './modules/storage/storage.module';
import { SimpleAuthGuard } from './common/simple-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CustomersModule,
    SlicingModule,
    MaterialsModule,
    PrintersModule,
    FilesModule,
    QuotesModule,
    OrdersModule,
    PaymentsModule,
    SettingsModule,
    DashboardModule,
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: SimpleAuthGuard },
  ],
})
export class AppModule {}
