import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WidgetType } from '@prisma/client';
import { WidgetDataService } from '../widget-data.service';
import { DashboardWidgetRepository } from '../../repositories/dashboard-widget.repository';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { BaseAnalyticsService } from '../../../analytics/services/base-analytics.service';
import { ExpenseTrendAnalysisService } from '../../../analytics/services/expense-trend-analysis.service';
import { ProfitabilityAnalysisEngineService } from '../../../analytics/services/profitability-analysis-engine.service';
import { ReportService } from '../../../reports/report.service';
import { CustomerService } from '../../../customers/customer.service';
import { InvoiceService } from '../../../invoices/invoice.service';
import { PaymentService } from '../../../payments/payment.service';
import { DashboardCacheService } from '../dashboard-cache.service';

describe('WidgetDataService', () => {
  let service: WidgetDataService;
  let widgetRepository: jest.Mocked<DashboardWidgetRepository>;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let baseAnalyticsService: jest.Mocked<BaseAnalyticsService>;
  let expenseTrendService: jest.Mocked<ExpenseTrendAnalysisService>;
  let profitabilityService: jest.Mocked<ProfitabilityAnalysisEngineService>;
  let cacheService: jest.Mocked<DashboardCacheService>;

  const mockOrganizationId = 'org-123';
  const mockWidgetId = 'widget-456';

  const mockWidget = {
    id: mockWidgetId,
    widgetType: WidgetType.METRIC_CARD,
    title: 'Test Widget',
    configuration: { metric: 'total_revenue', period: 'month' },
    refreshInterval: 300,
    dashboard: {
      organizationId: mockOrganizationId,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WidgetDataService,
        {
          provide: DashboardWidgetRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            getRevenueChartData: jest.fn(),
            getCashFlowChartData: jest.fn(),
            getRevenueExpensesComparison: jest.fn(),
            getCashFlowAnalysis: jest.fn(),
            getReceivablesAnalysis: jest.fn(),
          },
        },
        {
          provide: BaseAnalyticsService,
          useValue: {
            getTotalRevenue: jest.fn(),
            getTotalExpenses: jest.fn(),
            getNetProfit: jest.fn(),
            getKpiSummary: jest.fn(),
          },
        },
        {
          provide: ExpenseTrendAnalysisService,
          useValue: {
            getExpenseChartData: jest.fn(),
            getExpenseBreakdown: jest.fn(),
            getExpenseTrendAnalysis: jest.fn(),
          },
        },
        {
          provide: ProfitabilityAnalysisEngineService,
          useValue: {
            getProfitChartData: jest.fn(),
            getProfitabilityAnalysis: jest.fn(),
          },
        },
        {
          provide: ReportService,
          useValue: {
            getRecentInvoices: jest.fn(),
          },
        },
        {
          provide: CustomerService,
          useValue: {
            getTopCustomers: jest.fn(),
            getCustomerCount: jest.fn(),
          },
        },
        {
          provide: InvoiceService,
          useValue: {
            getRecentInvoices: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            getPendingPayments: jest.fn(),
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

    service = module.get<WidgetDataService>(WidgetDataService);
    widgetRepository = module.get(DashboardWidgetRepository);
    analyticsService = module.get(AnalyticsService);
    baseAnalyticsService = module.get(BaseAnalyticsService);
    expenseTrendService = module.get(ExpenseTrendAnalysisService);
    profitabilityService = module.get(ProfitabilityAnalysisEngineService);
    cacheService = module.get(DashboardCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWidgetData', () => {
    it('should throw NotFoundException when widget not found', async () => {
      widgetRepository.findById.mockResolvedValue(null);

      await expect(service.getWidgetData(mockWidgetId, mockOrganizationId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when organization mismatch', async () => {
      const widgetWithDifferentOrg = {
        ...mockWidget,
        dashboard: { organizationId: 'different-org' },
      };

      widgetRepository.findById.mockResolvedValue(widgetWithDifferentOrg);

      await expect(service.getWidgetData(mockWidgetId, mockOrganizationId)).rejects.toThrow(NotFoundException);
    });

    it('should return cached data when available and not force refresh', async () => {
      const cachedData = { value: 100000, trend: 15 };

      widgetRepository.findById.mockResolvedValue(mockWidget);
      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.getWidgetData(mockWidgetId, mockOrganizationId, false);

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(`widget_data_${mockWidgetId}`);
    });

    it('should generate new data when cache is empty', async () => {
      const mockRevenueData = {
        amount: 100000,
        trend: 15,
      };

      widgetRepository.findById.mockResolvedValue(mockWidget);
      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getTotalRevenue.mockResolvedValue(mockRevenueData);

      const result = await service.getWidgetData(mockWidgetId, mockOrganizationId);

      expect(result).toHaveProperty('value', 100000);
      expect(result).toHaveProperty('trend', 15);
      expect(result).toHaveProperty('currency', 'ZMW');
      expect(cacheService.set).toHaveBeenCalledWith(`widget_data_${mockWidgetId}`, expect.any(Object), 300);
    });

    it('should force refresh when requested', async () => {
      const cachedData = { value: 90000, trend: 10 };
      const newData = { amount: 100000, trend: 15 };

      widgetRepository.findById.mockResolvedValue(mockWidget);
      cacheService.get.mockResolvedValue(cachedData);
      baseAnalyticsService.getTotalRevenue.mockResolvedValue(newData);

      const result = await service.getWidgetData(mockWidgetId, mockOrganizationId, true);

      expect(result).toHaveProperty('value', 100000);
      expect(result).toHaveProperty('trend', 15);
      expect(cacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('generateWidgetData - METRIC_CARD', () => {
    it('should generate total revenue metric data', async () => {
      const mockRevenueData = {
        amount: 100000,
        trend: 15,
      };

      baseAnalyticsService.getTotalRevenue.mockResolvedValue(mockRevenueData);

      const widget = {
        ...mockWidget,
        configuration: { metric: 'total_revenue', period: 'month' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual({
        value: 100000,
        trend: 15,
        currency: 'ZMW',
        period: 'month',
        lastUpdated: expect.any(String),
      });
    });

    it('should generate total expenses metric data', async () => {
      const mockExpensesData = {
        amount: 60000,
        trend: 8,
      };

      baseAnalyticsService.getTotalExpenses.mockResolvedValue(mockExpensesData);

      const widget = {
        ...mockWidget,
        configuration: { metric: 'total_expenses', period: 'month' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual({
        value: 60000,
        trend: 8,
        currency: 'ZMW',
        period: 'month',
        lastUpdated: expect.any(String),
      });
    });

    it('should generate customer count metric data', async () => {
      const mockCustomerCount = 150;

      const customerService = module.get(CustomerService);
      customerService.getCustomerCount.mockResolvedValue(mockCustomerCount);

      const widget = {
        ...mockWidget,
        configuration: { metric: 'customer_count', period: 'month' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual({
        value: 150,
        trend: 0,
        period: 'month',
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('generateWidgetData - CHART', () => {
    it('should generate revenue chart data', async () => {
      const mockChartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Revenue',
          data: [80000, 90000, 100000],
        }],
      };

      analyticsService.getRevenueChartData.mockResolvedValue(mockChartData);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.CHART,
        configuration: { chartType: 'line', dataType: 'revenue', period: 'last_6_months' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockChartData);
      expect(analyticsService.getRevenueChartData).toHaveBeenCalledWith(
        mockOrganizationId,
        'last_6_months',
        'line'
      );
    });

    it('should generate expense chart data', async () => {
      const mockChartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Expenses',
          data: [50000, 55000, 60000],
        }],
      };

      expenseTrendService.getExpenseChartData.mockResolvedValue(mockChartData);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.CHART,
        configuration: { chartType: 'bar', dataType: 'expenses', period: 'last_6_months' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockChartData);
      expect(expenseTrendService.getExpenseChartData).toHaveBeenCalledWith(
        mockOrganizationId,
        'last_6_months',
        'bar'
      );
    });
  });

  describe('generateWidgetData - CASH_FLOW', () => {
    it('should generate cash flow widget data', async () => {
      const mockCashFlowData = {
        inflow: 120000,
        outflow: 80000,
        netFlow: 40000,
        periods: [
          { period: 'Week 1', inflow: 30000, outflow: 20000 },
          { period: 'Week 2', inflow: 35000, outflow: 25000 },
        ],
      };

      analyticsService.getCashFlowAnalysis.mockResolvedValue(mockCashFlowData);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.CASH_FLOW,
        configuration: { period: 'last_30_days' },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockCashFlowData);
      expect(analyticsService.getCashFlowAnalysis).toHaveBeenCalledWith(
        mockOrganizationId,
        { period: 'last_30_days' }
      );
    });
  });

  describe('generateWidgetData - KPI_SUMMARY', () => {
    it('should generate KPI summary widget data', async () => {
      const mockKpiData = {
        totalRevenue: 100000,
        totalExpenses: 60000,
        netProfit: 40000,
        customerCount: 150,
        profitMargin: 40,
      };

      baseAnalyticsService.getKpiSummary.mockResolvedValue(mockKpiData);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.KPI_SUMMARY,
        configuration: { metrics: ['revenue', 'expenses', 'profit', 'customers'] },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockKpiData);
      expect(baseAnalyticsService.getKpiSummary).toHaveBeenCalledWith(
        mockOrganizationId,
        ['revenue', 'expenses', 'profit', 'customers']
      );
    });
  });

  describe('generateWidgetData - TABLE', () => {
    it('should generate recent invoices table data', async () => {
      const mockInvoices = [
        { id: 'inv-1', customerName: 'Customer A', amount: 5000, status: 'paid' },
        { id: 'inv-2', customerName: 'Customer B', amount: 3000, status: 'pending' },
      ];

      const invoiceService = module.get(InvoiceService);
      invoiceService.getRecentInvoices.mockResolvedValue(mockInvoices);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.TABLE,
        configuration: { tableType: 'recent_invoices', limit: 10 },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockInvoices);
      expect(invoiceService.getRecentInvoices).toHaveBeenCalledWith(mockOrganizationId, 10);
    });

    it('should generate top customers table data', async () => {
      const mockCustomers = [
        { id: 'cust-1', name: 'Customer A', totalSpent: 50000 },
        { id: 'cust-2', name: 'Customer B', totalSpent: 30000 },
      ];

      const customerService = module.get(CustomerService);
      customerService.getTopCustomers.mockResolvedValue(mockCustomers);

      const widget = {
        ...mockWidget,
        widgetType: WidgetType.TABLE,
        configuration: { tableType: 'top_customers', limit: 5 },
      };

      const result = await service['generateWidgetData'](widget, mockOrganizationId);

      expect(result).toEqual(mockCustomers);
      expect(customerService.getTopCustomers).toHaveBeenCalledWith(mockOrganizationId, 5);
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported widget type', async () => {
      const widget = {
        ...mockWidget,
        widgetType: 'UNSUPPORTED_TYPE' as WidgetType,
      };

      await expect(service['generateWidgetData'](widget, mockOrganizationId))
        .rejects.toThrow('Unsupported widget type: UNSUPPORTED_TYPE');
    });

    it('should throw error for unsupported metric type', async () => {
      const widget = {
        ...mockWidget,
        configuration: { metric: 'unsupported_metric', period: 'month' },
      };

      await expect(service['generateWidgetData'](widget, mockOrganizationId))
        .rejects.toThrow('Unsupported metric: unsupported_metric');
    });

    it('should handle analytics service errors', async () => {
      widgetRepository.findById.mockResolvedValue(mockWidget);
      cacheService.get.mockResolvedValue(null);
      baseAnalyticsService.getTotalRevenue.mockRejectedValue(new Error('Analytics service error'));

      await expect(service.getWidgetData(mockWidgetId, mockOrganizationId))
        .rejects.toThrow('Analytics service error');
    });
  });
});
