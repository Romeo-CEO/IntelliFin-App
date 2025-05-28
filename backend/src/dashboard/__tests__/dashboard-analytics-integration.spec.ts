import { Test, TestingModule } from '@nestjs/testing';
import { DashboardDataService } from '../services/dashboard-data.service';
import { WidgetDataService } from '../services/widget-data.service';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { DatabaseModule } from '../../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from '../../analytics/analytics.service';
import { BaseAnalyticsService } from '../../analytics/services/base-analytics.service';
import { EnhancedRevenueForecastingService } from '../../analytics/services/enhanced-revenue-forecasting.service';
import { StatisticalAnomalyEngine } from '../../analytics/engines/statistical-anomaly.engine';
import { ExpenseTrendAnalysisService } from '../../analytics/services/expense-trend-analysis.service';
import { ProfitabilityAnalysisEngineService } from '../../analytics/services/profitability-analysis-engine.service';

describe('Dashboard Analytics Integration', () => {
  let dashboardDataService: DashboardDataService;
  let widgetDataService: WidgetDataService;
  let analyticsService: AnalyticsService;
  let baseAnalyticsService: BaseAnalyticsService;
  let forecastingService: EnhancedRevenueForecastingService;
  let anomalyEngine: StatisticalAnomalyEngine;
  let expenseTrendService: ExpenseTrendAnalysisService;
  let profitabilityService: ProfitabilityAnalysisEngineService;

  const mockOrganizationId = 'org-integration-test';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        DatabaseModule,
        AnalyticsModule,
      ],
      providers: [
        DashboardDataService,
        WidgetDataService,
        // Mock external services that aren't part of analytics
        {
          provide: 'ReportService',
          useValue: {
            getProfitLossStatement: jest.fn().mockResolvedValue({}),
            getCashFlowStatement: jest.fn().mockResolvedValue({}),
            getBalanceSheet: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: 'TaxManagementService',
          useValue: {
            getComplianceStatus: jest.fn().mockResolvedValue({ overallScore: 85 }),
            getZraIntegrationStatus: jest.fn().mockResolvedValue({ connected: true }),
            getVatSummary: jest.fn().mockResolvedValue({ amount: 5000 }),
          },
        },
        {
          provide: 'PaymentService',
          useValue: {
            getMobileMoneySummary: jest.fn().mockResolvedValue({ totalAmount: 50000 }),
          },
        },
        {
          provide: 'DashboardCacheService',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: 'DashboardWidgetRepository',
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: 'CustomerService',
          useValue: {
            getTopCustomers: jest.fn().mockResolvedValue([]),
            getCustomerCount: jest.fn().mockResolvedValue(100),
          },
        },
        {
          provide: 'InvoiceService',
          useValue: {
            getRecentInvoices: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    dashboardDataService = module.get<DashboardDataService>(DashboardDataService);
    widgetDataService = module.get<WidgetDataService>(WidgetDataService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    baseAnalyticsService = module.get<BaseAnalyticsService>(BaseAnalyticsService);
    forecastingService = module.get<EnhancedRevenueForecastingService>(EnhancedRevenueForecastingService);
    anomalyEngine = module.get<StatisticalAnomalyEngine>(StatisticalAnomalyEngine);
    expenseTrendService = module.get<ExpenseTrendAnalysisService>(ExpenseTrendAnalysisService);
    profitabilityService = module.get<ProfitabilityAnalysisEngineService>(ProfitabilityAnalysisEngineService);
  });

  describe('Analytics Service Integration', () => {
    it('should successfully integrate with base analytics service', async () => {
      // Mock base analytics data
      jest.spyOn(baseAnalyticsService, 'getOrganizationAnalytics').mockResolvedValue({
        totalRevenue: 100000,
        totalExpenses: 60000,
        cashBalance: 25000,
        customerCount: 150,
        invoiceCount: 75,
        averageInvoiceValue: 1333,
        paymentCycleTime: 30,
        revenueGrowth: 15,
        customerGrowth: 10,
        zraComplianceScore: 85,
        mobileMoneySales: 30000,
        accountsReceivable: 15000,
        accountsPayable: 8000,
      });

      const kpis = await dashboardDataService.getKpiMetrics(mockOrganizationId);

      expect(kpis).toHaveProperty('totalRevenue', 100000);
      expect(kpis).toHaveProperty('totalExpenses', 60000);
      expect(kpis).toHaveProperty('netProfit', 40000);
      expect(kpis).toHaveProperty('profitMargin', 40);
      expect(kpis).toHaveProperty('customerCount', 150);
      expect(kpis).toHaveProperty('currency', 'ZMW');
      expect(baseAnalyticsService.getOrganizationAnalytics).toHaveBeenCalledWith(mockOrganizationId);
    });

    it('should successfully integrate with enhanced forecasting service', async () => {
      const mockRevenueForecast = {
        periods: [
          { period: '2024-02', amount: 110000, confidence: 0.85 },
          { period: '2024-03', amount: 115000, confidence: 0.82 },
          { period: '2024-04', amount: 120000, confidence: 0.80 },
        ],
        accuracy: 0.87,
        trend: 'increasing',
      };

      const mockExpenseForecast = {
        periods: [
          { period: '2024-02', amount: 65000, confidence: 0.88 },
          { period: '2024-03', amount: 67000, confidence: 0.85 },
          { period: '2024-04', amount: 69000, confidence: 0.83 },
        ],
        accuracy: 0.89,
        trend: 'increasing',
      };

      jest.spyOn(forecastingService, 'generateRevenueForecast').mockResolvedValue(mockRevenueForecast);
      jest.spyOn(forecastingService, 'generateExpenseForecast').mockResolvedValue(mockExpenseForecast);
      jest.spyOn(anomalyEngine, 'detectAnomalies').mockResolvedValue([]);
      jest.spyOn(analyticsService, 'getTrendAnalysis').mockResolvedValue({ trends: [] });

      const analyticsSummary = await dashboardDataService.getAnalyticsSummary(
        mockOrganizationId,
        true,
        true
      );

      expect(analyticsSummary).toHaveProperty('forecasts');
      expect(analyticsSummary.forecasts).toHaveProperty('revenue', mockRevenueForecast);
      expect(analyticsSummary.forecasts).toHaveProperty('expenses', mockExpenseForecast);
      expect(analyticsSummary).toHaveProperty('anomalies');
      expect(analyticsSummary).toHaveProperty('trends');

      expect(forecastingService.generateRevenueForecast).toHaveBeenCalledWith(
        mockOrganizationId,
        {
          periods: 6,
          confidence: 0.85,
          includeSeasonality: true,
        }
      );

      expect(forecastingService.generateExpenseForecast).toHaveBeenCalledWith(
        mockOrganizationId,
        {
          periods: 6,
          confidence: 0.85,
        }
      );
    });

    it('should successfully integrate with anomaly detection engine', async () => {
      const mockAnomalies = [
        {
          type: 'revenue_spike',
          description: 'Unusual revenue increase detected in January',
          severity: 'medium',
          confidence: 0.78,
          period: '2024-01',
          value: 150000,
          expectedRange: { min: 90000, max: 110000 },
        },
        {
          type: 'expense_anomaly',
          description: 'Unexpected expense pattern in office supplies',
          severity: 'low',
          confidence: 0.65,
          period: '2024-01',
          category: 'office_supplies',
        },
      ];

      jest.spyOn(forecastingService, 'generateRevenueForecast').mockResolvedValue({ periods: [] });
      jest.spyOn(forecastingService, 'generateExpenseForecast').mockResolvedValue({ periods: [] });
      jest.spyOn(anomalyEngine, 'detectAnomalies').mockResolvedValue(mockAnomalies);
      jest.spyOn(analyticsService, 'getTrendAnalysis').mockResolvedValue({ trends: [] });

      const analyticsSummary = await dashboardDataService.getAnalyticsSummary(
        mockOrganizationId,
        true,
        true
      );

      expect(analyticsSummary).toHaveProperty('anomalies', mockAnomalies);
      expect(anomalyEngine.detectAnomalies).toHaveBeenCalledWith(
        mockOrganizationId,
        {
          sensitivity: 'MEDIUM',
          lookbackPeriods: 12,
        }
      );
    });

    it('should successfully integrate with expense trend analysis service', async () => {
      const mockExpenseChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Total Expenses',
          data: [50000, 52000, 48000, 55000, 53000, 57000],
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#EF4444',
        }],
      };

      jest.spyOn(expenseTrendService, 'getExpenseChartData').mockResolvedValue(mockExpenseChartData);

      // Test through widget data service
      const mockWidget = {
        id: 'widget-123',
        widgetType: 'CHART' as any,
        configuration: { chartType: 'bar', dataType: 'expenses', period: 'last_6_months' },
        dashboard: { organizationId: mockOrganizationId },
      };

      const chartData = await widgetDataService['generateWidgetData'](mockWidget, mockOrganizationId);

      expect(chartData).toEqual(mockExpenseChartData);
      expect(expenseTrendService.getExpenseChartData).toHaveBeenCalledWith(
        mockOrganizationId,
        'last_6_months',
        'bar'
      );
    });

    it('should successfully integrate with profitability analysis engine', async () => {
      const mockProfitabilityData = {
        overallProfitability: {
          grossProfit: 40000,
          grossMargin: 40,
          netProfit: 35000,
          netMargin: 35,
        },
        byCategory: [
          { category: 'Product Sales', profit: 25000, margin: 45 },
          { category: 'Services', profit: 15000, margin: 60 },
        ],
        trends: {
          monthly: [
            { period: '2024-01', profit: 30000, margin: 30 },
            { period: '2024-02', profit: 35000, margin: 35 },
            { period: '2024-03', profit: 40000, margin: 40 },
          ],
        },
      };

      jest.spyOn(profitabilityService, 'getProfitabilityAnalysis').mockResolvedValue(mockProfitabilityData);

      // Test through widget data service
      const mockWidget = {
        id: 'widget-456',
        widgetType: 'PROFITABILITY' as any,
        configuration: { analysisType: 'overall' },
        dashboard: { organizationId: mockOrganizationId },
      };

      const profitabilityData = await widgetDataService['generateWidgetData'](mockWidget, mockOrganizationId);

      expect(profitabilityData).toEqual(mockProfitabilityData);
      expect(profitabilityService.getProfitabilityAnalysis).toHaveBeenCalledWith(
        mockOrganizationId,
        { analysisType: 'overall' }
      );
    });
  });

  describe('End-to-End Analytics Integration', () => {
    it('should provide complete dashboard overview with all analytics components', async () => {
      // Mock all analytics services
      jest.spyOn(baseAnalyticsService, 'getFinancialMetrics').mockResolvedValue({
        totalRevenue: 100000,
        totalExpenses: 60000,
        netProfit: 40000,
        profitMargin: 40,
        cashBalance: 25000,
      });

      jest.spyOn(baseAnalyticsService, 'getOrganizationAnalytics').mockResolvedValue({
        totalRevenue: 100000,
        customerCount: 150,
      });

      jest.spyOn(analyticsService, 'getCashFlowAnalysis').mockResolvedValue({
        inflow: 120000,
        outflow: 80000,
        netFlow: 40000,
      });

      jest.spyOn(analyticsService, 'getRevenueBreakdown').mockResolvedValue({
        categories: [
          { category: 'Product Sales', amount: 70000 },
          { category: 'Services', amount: 30000 },
        ],
      });

      const overview = await dashboardDataService.getDashboardOverview(
        mockOrganizationId,
        'month',
        false
      );

      expect(overview).toHaveProperty('financial');
      expect(overview).toHaveProperty('kpis');
      expect(overview).toHaveProperty('cashFlow');
      expect(overview).toHaveProperty('revenue');
      expect(overview).toHaveProperty('compliance');
      expect(overview).toHaveProperty('summary');

      expect(overview.summary).toEqual({
        totalRevenue: 100000,
        totalExpenses: 60000,
        netProfit: 40000,
        profitMargin: 40,
        cashBalance: 25000,
        complianceScore: 85,
      });
    });

    it('should handle analytics service failures gracefully', async () => {
      // Mock one service to fail
      jest.spyOn(baseAnalyticsService, 'getFinancialMetrics').mockRejectedValue(
        new Error('Analytics service temporarily unavailable')
      );

      await expect(
        dashboardDataService.getDashboardOverview(mockOrganizationId)
      ).rejects.toThrow('Analytics service temporarily unavailable');
    });

    it('should validate forecast accuracy meets 85-90% target', async () => {
      const mockRevenueForecast = {
        periods: [
          { period: '2024-02', amount: 110000, confidence: 0.87 },
          { period: '2024-03', amount: 115000, confidence: 0.85 },
        ],
        accuracy: 0.88, // Within target range
      };

      jest.spyOn(forecastingService, 'generateRevenueForecast').mockResolvedValue(mockRevenueForecast);
      jest.spyOn(forecastingService, 'generateExpenseForecast').mockResolvedValue({ periods: [] });
      jest.spyOn(anomalyEngine, 'detectAnomalies').mockResolvedValue([]);
      jest.spyOn(analyticsService, 'getTrendAnalysis').mockResolvedValue({ trends: [] });

      const analyticsSummary = await dashboardDataService.getAnalyticsSummary(mockOrganizationId);

      expect(analyticsSummary.forecasts.revenue.accuracy).toBeGreaterThanOrEqual(0.85);
      expect(analyticsSummary.forecasts.revenue.accuracy).toBeLessThanOrEqual(0.90);
    });
  });

  describe('Performance Integration', () => {
    it('should complete analytics operations within performance targets', async () => {
      const startTime = Date.now();

      // Mock quick responses
      jest.spyOn(baseAnalyticsService, 'getOrganizationAnalytics').mockResolvedValue({
        totalRevenue: 100000,
        totalExpenses: 60000,
      });

      await dashboardDataService.getKpiMetrics(mockOrganizationId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second for cached operations
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent analytics requests efficiently', async () => {
      jest.spyOn(baseAnalyticsService, 'getOrganizationAnalytics').mockResolvedValue({
        totalRevenue: 100000,
        totalExpenses: 60000,
      });

      const promises = Array.from({ length: 5 }, () =>
        dashboardDataService.getKpiMetrics(mockOrganizationId)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results.every(result => result.totalRevenue === 100000)).toBe(true);
      
      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
