import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxPeriodService } from './services/tax-period.service';
import { TaxObligationService } from './services/tax-obligation.service';
import { TaxComplianceService } from './services/tax-compliance.service';
import { WithholdingTaxService } from './services/withholding-tax.service';
import { TaxAdjustmentService } from './services/tax-adjustment.service';
import { TaxFilingService } from './services/tax-filing.service';
import { TaxAnalyticsService } from './services/tax-analytics.service';
import { MobileOptimizationService } from './services/mobile-optimization.service';
import { AdvancedTaxReportingService } from './services/advanced-tax-reporting.service';
import { PerformanceOptimizationService } from './services/performance-optimization.service';
import { TaxManagementController } from './controllers/tax-management.controller';
import { TaxComplianceController } from './controllers/tax-compliance.controller';
import { TaxPeriodController } from './controllers/tax-period.controller';
import { TaxObligationController } from './controllers/tax-obligation.controller';
import { WithholdingTaxController } from './controllers/withholding-tax.controller';
import { TaxAdjustmentController } from './controllers/tax-adjustment.controller';
import { TaxFilingController } from './controllers/tax-filing.controller';
import { TaxAnalyticsController } from './controllers/tax-analytics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [
    TaxCalculationService,
    TaxPeriodService,
    TaxObligationService,
    TaxComplianceService,
    WithholdingTaxService,
    TaxAdjustmentService,
    TaxFilingService,
    TaxAnalyticsService,
    MobileOptimizationService,
    AdvancedTaxReportingService,
    PerformanceOptimizationService,
  ],
  controllers: [
    TaxManagementController,
    TaxComplianceController,
    TaxPeriodController,
    TaxObligationController,
    WithholdingTaxController,
    TaxAdjustmentController,
    TaxFilingController,
    TaxAnalyticsController,
  ],
  exports: [
    TaxCalculationService,
    TaxPeriodService,
    TaxObligationService,
    TaxComplianceService,
    WithholdingTaxService,
    TaxAdjustmentService,
    TaxFilingService,
    TaxAnalyticsService,
    MobileOptimizationService,
    AdvancedTaxReportingService,
    PerformanceOptimizationService,
  ],
})
export class TaxManagementModule {}
