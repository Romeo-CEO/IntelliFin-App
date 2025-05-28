import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { RevenueForecastingService } from './services/revenue-forecasting.service';
import { ExpenseTrendService } from './services/expense-trend.service';
import { ProfitabilityAnalysisService } from './services/profitability-analysis.service';
import { TaxAnalyticsService } from './services/tax-analytics.service';
import { FinancialHealthService } from './services/financial-health.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

// Step 19 - New analytics services
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';
import { BaseAnalyticsService } from './services/base-analytics.service';
import { AnalyticsCacheService } from './services/analytics-cache.service';

// Step 19 - Week 2: Core Analytics Engines
import { ExpenseTrendAnalysisService } from './services/expense-trend-analysis.service';
import { ProfitabilityAnalysisEngineService } from './services/profitability-analysis-engine.service';

// Step 19 - Enhanced Analytics Engines (Phase 2)
import { AnalyticsEngineFactory } from './engines/analytics-engine.factory';
import { StatisticalForecastingEngine } from './engines/statistical/statistical-forecasting.engine';
import { StatisticalAnomalyEngine } from './engines/statistical/statistical-anomaly.engine';
import { EnhancedRevenueForecastingService } from './services/enhanced-revenue-forecasting.service';

// Step 19 - New analytics controllers
import { RevenueAnalyticsController } from './controllers/revenue-analytics.controller';
import { ExpenseAnalyticsController } from './controllers/expense-analytics.controller';
import { ProfitabilityAnalyticsController } from './controllers/profitability-analytics.controller';
import { TaxAnalyticsController } from './controllers/tax-analytics.controller';
import { FinancialRatiosController } from './controllers/financial-ratios.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    AnalyticsController,
    // Step 19 - New analytics controllers
    RevenueAnalyticsController,
    ExpenseAnalyticsController,
    ProfitabilityAnalyticsController,
    TaxAnalyticsController,
    FinancialRatiosController,
  ],
  providers: [
    // Existing analytics services
    AnalyticsService,
    AnalyticsRepository,
    RevenueForecastingService,
    ExpenseTrendService,
    ProfitabilityAnalysisService,
    TaxAnalyticsService,
    FinancialHealthService,

    // Step 19 - New foundation services
    BaseAnalyticsService,
    AnalyticsAggregationService,
    AnalyticsCacheService,

    // Step 19 - Week 2: Core Analytics Engines
    ExpenseTrendAnalysisService,
    ProfitabilityAnalysisEngineService,

    // Step 19 - Enhanced Analytics Engines (Phase 2)
    AnalyticsEngineFactory,
    StatisticalForecastingEngine,
    StatisticalAnomalyEngine,
    EnhancedRevenueForecastingService,
  ],
  exports: [
    // Existing exports
    AnalyticsService,
    AnalyticsRepository,
    RevenueForecastingService,
    ExpenseTrendService,
    ProfitabilityAnalysisService,
    TaxAnalyticsService,
    FinancialHealthService,

    // Step 19 - New foundation services for dashboard integration
    BaseAnalyticsService,
    AnalyticsAggregationService,
    AnalyticsCacheService,

    // Step 19 - Week 2: Core Analytics Engines for dashboard widgets
    ExpenseTrendAnalysisService,
    ProfitabilityAnalysisEngineService,

    // Step 19 - Enhanced Analytics Engines (Phase 2) for AI-ready integration
    AnalyticsEngineFactory,
    StatisticalForecastingEngine,
    StatisticalAnomalyEngine,
    EnhancedRevenueForecastingService,
  ],
})
export class AnalyticsModule {}
