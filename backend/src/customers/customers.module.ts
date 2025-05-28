import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { CustomerTaxIntegrationService } from './services/customer-tax-integration.service';
import { CustomerImportExportService } from './customer-import-export.service';
import { ZraTinValidator } from './validators/customer-zra-tin.validator';

@Module({
  imports: [DatabaseModule, HttpModule, ConfigModule],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomerRepository,
    CustomerImportExportService,
    ZraTinValidator,
    CustomerTaxIntegrationService,
  ],
  exports: [
    CustomerService,
    CustomerRepository,
    CustomerImportExportService,
    CustomerTaxIntegrationService,
  ],
})
export class CustomersModule {}
