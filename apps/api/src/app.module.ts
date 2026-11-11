import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CustomersModule, SlicingModule, MaterialsModule, PrintersModule, FilesModule, QuotesModule, OrdersModule, PaymentsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
