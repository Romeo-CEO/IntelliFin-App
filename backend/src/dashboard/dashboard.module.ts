import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CustomersModule } from '../customers/customers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { ExpenseModule } from '../expenses/expense.module';
import { TaxManagementModule } from '../tax-management/tax-management.module';
import { ReportsModule } from '../reports/reports.module';

// Controllers
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardDataController } from './controllers/dashboard-data.controller';

// Services
import { DashboardConfigurationService } from './services/dashboard-configuration.service';
import { WidgetManagementService } from './services/widget-management.service';
import { DashboardDataService } from './services/dashboard-data.service';
import { WidgetDataService } from './services/widget-data.service';
import { DashboardCacheService } from './services/dashboard-cache.service';
import { DashboardRealtimeService } from './services/dashboard-realtime.service';

// Repositories
import { DashboardConfigurationRepository } from './repositories/dashboard-configuration.repository';
import { DashboardWidgetRepository } from './repositories/dashboard-widget.repository';

/**
 * Enhanced Dashboard module providing comprehensive dashboard and widget management
 * Features:
 * - Multi-tenant dashboard configuration
 * - Customizable widget system with analytics integration
 * - Responsive grid layouts with mobile optimization
 * - Permission-based access control
 * - Real-time data integration with caching
 * - Zambian market-specific features
 * - Performance optimization for low-bandwidth environments
 */
@Module({
  imports: [
    DatabaseModule,
    AnalyticsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    ExpenseModule,
    TaxManagementModule,
    ReportsModule,
  ],
  controllers: [
    DashboardController,
    DashboardDataController,
  ],
  providers: [
    // Repositories
    DashboardConfigurationRepository,
    DashboardWidgetRepository,

    // Core Services
    DashboardConfigurationService,
    WidgetManagementService,

    // Enhanced Services (Step 18 Phase 2)
    DashboardDataService,
    WidgetDataService,
    DashboardCacheService,
    DashboardRealtimeService,
  ],
  exports: [
    // Export services for use in other modules
    DashboardConfigurationService,
    WidgetManagementService,
    DashboardDataService,
    WidgetDataService,
    DashboardCacheService,
    DashboardRealtimeService,

    // Export repositories for advanced use cases
    DashboardConfigurationRepository,
    DashboardWidgetRepository,
  ],
})
export class DashboardModule {}
