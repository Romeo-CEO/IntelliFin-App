import { Test, TestingModule } from '@nestjs/testing';
import { DashboardDataService } from '../dashboard-data.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { BaseAnalyticsService } from '../../../analytics/services/base-analytics.service';
import { EnhancedRevenueForecastingService } from '../../../analytics/services/enhanced-revenue-forecasting.service';
import { StatisticalAnomalyEngine } from '../../../analytics/engines/statistical-anomaly.engine';
import { ReportService } from '../../../reports/report.service';
import { TaxManagementService } from '../../../tax-management/tax-management.service';
import { PaymentService } from '../../../payments/payment.service';
import { DashboardCacheService } from '../dashboard-cache.service';

describe('DashboardDataService', () => {
  let service: DashboardDataService;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let baseAnalyticsService: jest.Mocked<BaseAnalyticsService>;
  let forecastingService: jest.Mocked<EnhancedRevenueForecastingService>;
  let anomalyEngine: jest.Mocked<StatisticalAnomalyEngine>;
  let reportService: jest.Mocked<ReportService>;
  let taxService: jest.Mocked<TaxManagementService>;
  let paymentService: jest.Mocked<PaymentService>;
  let cacheService: jest.Mocked<DashboardCacheService>;

  const mockOrganizationId = 'org-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardDataService,
        {
          provide: AnalyticsService,
          useValue: {
            getCashFlowAnalysis: jest.fn(),
            getRevenueBreakdown: jest.fn(),
            getTrendAnalysis: jest.fn(),
            getFinancialRatios: jest.fn(),
            getRevenueChartData: jest.fn(),
            getCashFlowChartData: jest.fn(),
            getRevenueExpensesComparison: jest.fn(),
            getReceivablesAnalysis: jest.fn(),
          },
        },
        {
          provide: BaseAnalyticsService,
          useValue: {
            getOrganizationAnalytics: jest.fn(),
            getFinancialMetrics: jest.fn(),
            getPeriodComparison: jest.fn(),
            getTotalRevenue: jest.fn(),
            getTotalExpenses: jest.fn(),
            getNetProfit: jest.fn(),
            getKpiSummary: jest.fn(),
          },
        },
        {
          provide: EnhancedRevenueForecastingService,
          useValue: {
            generateRevenueForecast: jest.fn(),
            generateExpenseForecast: jest.fn(),
          },
        },
        {
          provide: StatisticalAnomalyEngine,
          useValue: {
            detectAnomalies: jest.fn(),
          },
        },
        {
          provide: ReportService,
          useValue: {
            getProfitLossStatement: jest.fn(),
            getCashFlowStatement: jest.fn(),
            getBalanceSheet: jest.fn(),
          },
        },
        {
          provide: TaxManagementService,
          useValue: {
            getComplianceStatus: jest.fn(),
            getZraIntegrationStatus: jest.fn(),
            getVatSummary: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            getMobileMoneySummary: jest.fn(),
          },
        },
        {
          provide: DashboardCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardDataService>(DashboardDataService);
    analyticsService = module.get(AnalyticsService);
    baseAnalyticsService = module.get(BaseAnalyticsService);
    forecastingService = module.get(EnhancedRevenueForecastingService);
    anomalyEngine = module.get(StatisticalAnomalyEngine);
    reportService = module.get(ReportService);
    taxService = module.get(TaxManagementService);
    paymentService = module.get(PaymentService);
    cacheService = module.get(DashboardCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardOverview', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        period: 'month',
        financial: { totalRevenue: 100000 },
        kpis: { totalRevenue: 100000 },
      };

      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.getDashboardOverview(
        mockOrganizationId,
        'month',
        true
      );

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(
        'dashboard_overview_org-123_month_true'
      );
    });

    it('should generate new data when cache is empty', async () => {
      const mockFinancialMetrics = {
        totalRevenue: 100000,
        totalExpenses: 60000,
        netProfit: 40000,
        profitMargin: 40,
        cashBalance: 25000,
      };

      const mockKpiMetrics = {
        totalRevenue: 100000,
        customerCount: 50,
      };

      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getFinancialMetrics.mockResolvedValue(
        mockFinancialMetrics
      );
      baseAnalyticsService.getOrganizationAnalytics.mockResolvedValue(
        mockKpiMetrics
      );
      analyticsService.getCashFlowAnalysis.mockResolvedValue({
        inflow: 100000,
        outflow: 60000,
      });
      analyticsService.getRevenueBreakdown.mockResolvedValue({
        categories: [],
      });
      taxService.getComplianceStatus.mockResolvedValue({ overallScore: 85 });
      taxService.getZraIntegrationStatus.mockResolvedValue({ connected: true });
      taxService.getVatSummary.mockResolvedValue({ amount: 5000 });

      const result = await service.getDashboardOverview(
        mockOrganizationId,
        'month',
        false
      );

      expect(result).toHaveProperty('financial');
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('summary');
      expect(result.summary.totalRevenue).toBe(100000);
      expect(result.summary.netProfit).toBe(40000);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getFinancialMetrics.mockRejectedValue(
        new Error('Analytics service error')
      );

      await expect(
        service.getDashboardOverview(mockOrganizationId)
      ).rejects.toThrow('Analytics service error');
    });
  });

  describe('getKpiMetrics', () => {
    it('should return all KPIs when no specific metrics requested', async () => {
      const mockAnalyticsData = {
        totalRevenue: 100000,
        totalExpenses: 60000,
        cashBalance: 25000,
        customerCount: 50,
        invoiceCount: 25,
        averageInvoiceValue: 4000,
        paymentCycleTime: 30,
        revenueGrowth: 15,
        customerGrowth: 10,
        zraComplianceScore: 85,
        mobileMoneySales: 30000,
      };

      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getOrganizationAnalytics.mockResolvedValue(
        mockAnalyticsData
      );

      const result = await service.getKpiMetrics(mockOrganizationId);

      expect(result).toHaveProperty('totalRevenue', 100000);
      expect(result).toHaveProperty('netProfit', 40000);
      expect(result).toHaveProperty('profitMargin', 40);
      expect(result).toHaveProperty('customerCount', 50);
      expect(result).toHaveProperty('currency', 'ZMW');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('should return filtered KPIs when specific metrics requested', async () => {
      const mockAnalyticsData = {
        totalRevenue: 100000,
        totalExpenses: 60000,
        customerCount: 50,
      };

      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getOrganizationAnalytics.mockResolvedValue(
        mockAnalyticsData
      );

      const result = await service.getKpiMetrics(mockOrganizationId, [
        'totalRevenue',
        'customerCount',
      ]);

      expect(result).toHaveProperty('totalRevenue', 100000);
      expect(result).toHaveProperty('customerCount', 50);
      expect(result).not.toHaveProperty('totalExpenses');
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('currency', 'ZMW');
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should include forecasts when requested', async () => {
      const mockRevenueForecast = {
        periods: [
          { period: '2024-02', amount: 110000, confidence: 0.85 },
          { period: '2024-03', amount: 115000, confidence: 0.82 },
        ],
      };

      const mockExpenseForecast = {
        periods: [
          { period: '2024-02', amount: 65000, confidence: 0.88 },
          { period: '2024-03', amount: 67000, confidence: 0.85 },
        ],
      };

      cacheService.get.mockResolvedValue(null);
      forecastingService.generateRevenueForecast.mockResolvedValue(
        mockRevenueForecast
      );
      forecastingService.generateExpenseForecast.mockResolvedValue(
        mockExpenseForecast
      );
      anomalyEngine.detectAnomalies.mockResolvedValue([]);
      analyticsService.getTrendAnalysis.mockResolvedValue({ trends: [] });

      const result = await service.getAnalyticsSummary(
        mockOrganizationId,
        true,
        true
      );

      expect(result).toHaveProperty('forecasts');
      expect(result.forecasts).toHaveProperty('revenue', mockRevenueForecast);
      expect(result.forecasts).toHaveProperty('expenses', mockExpenseForecast);
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('trends');
    });

    it('should exclude forecasts when not requested', async () => {
      cacheService.get.mockResolvedValue(null);
      anomalyEngine.detectAnomalies.mockResolvedValue([]);
      analyticsService.getTrendAnalysis.mockResolvedValue({ trends: [] });

      const result = await service.getAnalyticsSummary(
        mockOrganizationId,
        false,
        true
      );

      expect(result).not.toHaveProperty('forecasts');
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('trends');
    });
  });

  describe('getZambianComplianceSummary', () => {
    it('should return comprehensive compliance data', async () => {
      const mockTaxCompliance = {
        vatStatus: 'current',
        monthlyReturns: 'filed',
        annualReturns: 'pending',
      };

      const mockZraStatus = {
        connected: true,
        lastSync: '2024-01-15T10:00:00Z',
        status: 'active',
      };

      const mockVatSummary = {
        currentPeriod: '2024-01',
        dueDate: '2024-02-15',
        amount: 5000,
      };

      cacheService.get.mockResolvedValue(null);
      taxService.getComplianceStatus.mockResolvedValue(mockTaxCompliance);
      taxService.getZraIntegrationStatus.mockResolvedValue(mockZraStatus);
      taxService.getVatSummary.mockResolvedValue(mockVatSummary);

      const result =
        await service.getZambianComplianceSummary(mockOrganizationId);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('taxCompliance', mockTaxCompliance);
      expect(result).toHaveProperty('zraStatus', mockZraStatus);
      expect(result).toHaveProperty('vatSummary', mockVatSummary);
      expect(result).toHaveProperty('recommendations');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getMobileMoneySummary', () => {
    it('should return mobile money data for all providers', async () => {
      const mockMobileMoneySummary = {
        totalAmount: 50000,
        totalTransactions: 100,
        byProvider: [
          { provider: 'airtel', amount: 25000, transactions: 50 },
          { provider: 'mtn', amount: 20000, transactions: 40 },
          { provider: 'zamtel', amount: 5000, transactions: 10 },
        ],
      };

      cacheService.get.mockResolvedValue(null);
      paymentService.getMobileMoneySummary.mockResolvedValue(
        mockMobileMoneySummary
      );

      const result = await service.getMobileMoneySummary(
        mockOrganizationId,
        'all'
      );

      expect(result).toEqual(mockMobileMoneySummary);
      expect(paymentService.getMobileMoneySummary).toHaveBeenCalledWith(
        mockOrganizationId,
        'all'
      );
    });

    it('should return mobile money data for specific provider', async () => {
      const mockAirtelSummary = {
        totalAmount: 25000,
        totalTransactions: 50,
        provider: 'airtel',
      };

      cacheService.get.mockResolvedValue(null);
      paymentService.getMobileMoneySummary.mockResolvedValue(mockAirtelSummary);

      const result = await service.getMobileMoneySummary(
        mockOrganizationId,
        'airtel'
      );

      expect(result).toEqual(mockAirtelSummary);
      expect(paymentService.getMobileMoneySummary).toHaveBeenCalledWith(
        mockOrganizationId,
        'airtel'
      );
    });
  });

  describe('error handling', () => {
    it('should handle cache service errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache connection failed'));
      baseAnalyticsService.getOrganizationAnalytics.mockResolvedValue({
        totalRevenue: 100000,
        totalExpenses: 60000,
      });

      const result = await service.getKpiMetrics(mockOrganizationId);

      expect(result).toHaveProperty('totalRevenue', 100000);
      expect(result).toHaveProperty('netProfit', 40000);
    });

    it('should handle analytics service errors', async () => {
      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getOrganizationAnalytics.mockRejectedValue(
        new Error('Analytics unavailable')
      );

      await expect(service.getKpiMetrics(mockOrganizationId)).rejects.toThrow(
        'Analytics unavailable'
      );
    });
  });
});
