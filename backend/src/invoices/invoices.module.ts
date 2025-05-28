import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceNumberGenerator } from './utils/invoice-number-generator';
import { ZraInvoiceService } from './services/zra-invoice.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceRepository,
    InvoiceNumberGenerator,
    ZraInvoiceService,
  ],
  exports: [
    InvoiceService,
    InvoiceRepository,
    ZraInvoiceService,
  ],
})
export class InvoicesModule {}
