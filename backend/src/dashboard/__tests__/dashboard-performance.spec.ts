import { Test, TestingModule } from '@nestjs/testing';
import { DashboardDataService } from '../services/dashboard-data.service';
import { WidgetDataService } from '../services/widget-data.service';
import { DashboardCacheService } from '../services/dashboard-cache.service';
import { DashboardRealtimeService } from '../services/dashboard-realtime.service';
import { PerformanceObserver, performance } from 'perf_hooks';

describe('Dashboard Performance Tests', () => {
  let dashboardDataService: DashboardDataService;
  let widgetDataService: WidgetDataService;
  let cacheService: DashboardCacheService;
  let realtimeService: DashboardRealtimeService;

  const mockOrganizationId = 'org-perf-test';
  const mockWidgetId = 'widget-perf-test';

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    DASHBOARD_OVERVIEW: 3000, // 3 seconds for 3G requirement
    KPI_METRICS: 1000, // 1 second for KPIs
    WIDGET_DATA: 500, // 500ms for individual widgets
    CACHE_OPERATIONS: 100, // 100ms for cache operations
    REALTIME_UPDATES: 200, // 200ms for realtime updates
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardDataService,
        WidgetDataService,
        DashboardCacheService,
        DashboardRealtimeService,
        // Mock all dependencies
        {
          provide: 'AnalyticsService',
          useValue: {
            getCashFlowAnalysis: jest.fn().mockResolvedValue({ inflow: 100000, outflow: 60000 }),
            getRevenueBreakdown: jest.fn().mockResolvedValue({ categories: [] }),
            getTrendAnalysis: jest.fn().mockResolvedValue({ trends: [] }),
          },
        },
        {
          provide: 'BaseAnalyticsService',
          useValue: {
            getOrganizationAnalytics: jest.fn().mockResolvedValue({
              totalRevenue: 100000,
              totalExpenses: 60000,
              customerCount: 150,
            }),
            getFinancialMetrics: jest.fn().mockResolvedValue({
              totalRevenue: 100000,
              totalExpenses: 60000,
              netProfit: 40000,
              profitMargin: 40,
              cashBalance: 25000,
            }),
            getTotalRevenue: jest.fn().mockResolvedValue({ amount: 100000, trend: 15 }),
          },
        },
        {
          provide: 'EnhancedRevenueForecastingService',
          useValue: {
            generateRevenueForecast: jest.fn().mockResolvedValue({ periods: [] }),
            generateExpenseForecast: jest.fn().mockResolvedValue({ periods: [] }),
          },
        },
        {
          provide: 'StatisticalAnomalyEngine',
          useValue: {
            detectAnomalies: jest.fn().mockResolvedValue([]),
          },
        },
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
          provide: 'DashboardWidgetRepository',
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: mockWidgetId,
              widgetType: 'METRIC_CARD',
              configuration: { metric: 'total_revenue', period: 'month' },
              dashboard: { organizationId: mockOrganizationId },
            }),
          },
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn().mockReturnValue({
              host: 'localhost',
              port: 6379,
              password: null,
              db: 0,
            }),
          },
        },
        {
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    dashboardDataService = module.get<DashboardDataService>(DashboardDataService);
    widgetDataService = module.get<WidgetDataService>(WidgetDataService);
    cacheService = module.get<DashboardCacheService>(DashboardCacheService);
    realtimeService = module.get<DashboardRealtimeService>(DashboardRealtimeService);
  });

  describe('Dashboard Overview Performance', () => {
    it('should load dashboard overview within 3 seconds (3G requirement)', async () => {
      const startTime = performance.now();

      await dashboardDataService.getDashboardOverview(mockOrganizationId, 'month', true);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_OVERVIEW);
    });

    it('should handle concurrent dashboard overview requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        dashboardDataService.getDashboardOverview(mockOrganizationId, 'month', false)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle concurrent requests within reasonable time
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_OVERVIEW * 2);
    });

    it('should benefit from caching on subsequent requests', async () => {
      // Mock cache to return data on second call
      let cacheCallCount = 0;
      jest.spyOn(cacheService, 'get').mockImplementation(async () => {
        cacheCallCount++;
        if (cacheCallCount > 1) {
          return {
            period: 'month',
            financial: { totalRevenue: 100000 },
            kpis: { totalRevenue: 100000 },
          };
        }
        return null;
      });

      // First request (cache miss)
      const startTime1 = performance.now();
      await dashboardDataService.getDashboardOverview(mockOrganizationId, 'month', false);
      const duration1 = performance.now() - startTime1;

      // Second request (cache hit)
      const startTime2 = performance.now();
      await dashboardDataService.getDashboardOverview(mockOrganizationId, 'month', false);
      const duration2 = performance.now() - startTime2;

      // Cached request should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.1); // At least 10x faster
      expect(duration2).toBeLessThan(100); // Under 100ms
    });
  });

  describe('KPI Metrics Performance', () => {
    it('should load KPI metrics within 1 second', async () => {
      const startTime = performance.now();

      await dashboardDataService.getKpiMetrics(mockOrganizationId);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.KPI_METRICS);
    });

    it('should handle filtered KPI requests efficiently', async () => {
      const startTime = performance.now();

      await dashboardDataService.getKpiMetrics(mockOrganizationId, ['totalRevenue', 'customerCount']);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.KPI_METRICS);
    });
  });

  describe('Widget Data Performance', () => {
    it('should load widget data within 500ms', async () => {
      const startTime = performance.now();

      await widgetDataService.getWidgetData(mockWidgetId, mockOrganizationId);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_DATA);
    });

    it('should handle multiple widget requests concurrently', async () => {
      const widgetCount = 8; // Typical dashboard widget count
      const startTime = performance.now();

      const promises = Array.from({ length: widgetCount }, (_, index) =>
        widgetDataService.getWidgetData(`widget-${index}`, mockOrganizationId)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should load all widgets within reasonable time
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_DATA * 2);
    });
  });

  describe('Cache Performance', () => {
    it('should perform cache operations within 100ms', async () => {
      const testData = { value: 100000, timestamp: Date.now() };

      // Test cache set
      const setStartTime = performance.now();
      await cacheService.set('test-key', testData);
      const setDuration = performance.now() - setStartTime;

      expect(setDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_OPERATIONS);

      // Test cache get
      const getStartTime = performance.now();
      await cacheService.get('test-key');
      const getDuration = performance.now() - getStartTime;

      expect(getDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_OPERATIONS);
    });

    it('should handle batch cache operations efficiently', async () => {
      const batchSize = 10;
      const keyValuePairs = Array.from({ length: batchSize }, (_, index) => ({
        key: `batch-key-${index}`,
        value: { data: index },
        ttl: 300,
      }));

      const startTime = performance.now();
      await cacheService.mset(keyValuePairs);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_OPERATIONS * 2);
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should handle subscription operations within 200ms', async () => {
      const dashboardId = 'dashboard-123';

      const startTime = performance.now();
      await realtimeService.subscribeToDashboard(mockOrganizationId, dashboardId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.REALTIME_UPDATES);
    });

    it('should handle dashboard refresh triggers efficiently', async () => {
      const dashboardId = 'dashboard-123';

      const startTime = performance.now();
      await realtimeService.triggerDashboardRefresh(mockOrganizationId, dashboardId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.REALTIME_UPDATES);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 100;

      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        await dashboardDataService.getKpiMetrics(mockOrganizationId);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Low-bandwidth Optimization', () => {
    it('should reduce data payload for low-bandwidth mode', async () => {
      // Mock reduced data for low-bandwidth
      const fullData = await dashboardDataService.getKpiMetrics(mockOrganizationId);
      const reducedMetrics = ['totalRevenue', 'netProfit'];
      const reducedData = await dashboardDataService.getKpiMetrics(mockOrganizationId, reducedMetrics);

      // Reduced data should have fewer properties
      expect(Object.keys(reducedData)).toHaveLength(4); // 2 metrics + currency + lastUpdated
      expect(Object.keys(fullData)).toBeGreaterThan(Object.keys(reducedData).length);
    });

    it('should handle analytics summary with reduced complexity', async () => {
      const startTime = performance.now();

      // Request analytics without forecasts and anomalies for low-bandwidth
      await dashboardDataService.getAnalyticsSummary(mockOrganizationId, false, false);

      const duration = performance.now() - startTime;

      // Should be faster without complex analytics
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.KPI_METRICS);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high concurrent load', async () => {
      const concurrentUsers = 50;
      const requestsPerUser = 5;
      const totalRequests = concurrentUsers * requestsPerUser;

      const startTime = performance.now();

      const promises = Array.from({ length: totalRequests }, (_, index) => {
        const orgId = `org-${index % concurrentUsers}`;
        return dashboardDataService.getKpiMetrics(orgId);
      });

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(totalRequests);
      expect(results.every(result => result.currency === 'ZMW')).toBe(true);
      
      // Should handle stress load within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const metrics: Array<{ name: string; duration: number }> = [];

      // Wrap operations with performance tracking
      const trackPerformance = async (name: string, operation: () => Promise<any>) => {
        const startTime = performance.now();
        await operation();
        const duration = performance.now() - startTime;
        metrics.push({ name, duration });
      };

      await trackPerformance('dashboard-overview', () =>
        dashboardDataService.getDashboardOverview(mockOrganizationId)
      );

      await trackPerformance('kpi-metrics', () =>
        dashboardDataService.getKpiMetrics(mockOrganizationId)
      );

      await trackPerformance('widget-data', () =>
        widgetDataService.getWidgetData(mockWidgetId, mockOrganizationId)
      );

      // Verify all operations completed within thresholds
      metrics.forEach(metric => {
        const threshold = PERFORMANCE_THRESHOLDS[metric.name.toUpperCase().replace('-', '_')] || 1000;
        expect(metric.duration).toBeLessThan(threshold);
      });

      // Log performance metrics for analysis
      console.log('Performance Metrics:', metrics);
    });
  });
});
