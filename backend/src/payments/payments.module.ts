import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { TaxManagementModule } from '../tax-management/tax-management.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PaymentReconciliationService } from './services/payment-reconciliation.service';
import { MobileMoneyPaymentService } from './services/mobile-money-payment.service';
import { PaymentTaxIntegrationService } from './services/payment-tax-integration.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    InvoicesModule,
    TaxManagementModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentRepository,
    PaymentReconciliationService,
    MobileMoneyPaymentService,
    PaymentTaxIntegrationService,
  ],
  exports: [
    PaymentService,
    PaymentRepository,
    PaymentReconciliationService,
    MobileMoneyPaymentService,
    PaymentTaxIntegrationService,
  ],
})
export class PaymentsModule {}
