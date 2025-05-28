import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WidgetType } from '@prisma/client';
import { DashboardWidgetRepository } from '../repositories/dashboard-widget.repository';
import { AnalyticsService } from '../../analytics/analytics.service';
import { BaseAnalyticsService } from '../../analytics/services/base-analytics.service';
import { ExpenseTrendAnalysisService } from '../../analytics/services/expense-trend-analysis.service';
import { ProfitabilityAnalysisEngineService } from '../../analytics/services/profitability-analysis-engine.service';
import { ReportService } from '../../reports/report.service';
import { CustomerService } from '../../customers/customer.service';
import { InvoiceService } from '../../invoices/invoice.service';
import { PaymentService } from '../../payments/payment.service';
import { DashboardCacheService } from './dashboard-cache.service';

/**
 * Widget Data Service
 * Provides specific data for individual dashboard widgets
 * Handles data transformation and formatting for widget display
 */
@Injectable()
export class WidgetDataService {
  private readonly logger = new Logger(WidgetDataService.name);

  constructor(
    private readonly widgetRepository: DashboardWidgetRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly baseAnalyticsService: BaseAnalyticsService,
    private readonly expenseTrendService: ExpenseTrendAnalysisService,
    private readonly profitabilityService: ProfitabilityAnalysisEngineService,
    private readonly reportService: ReportService,
    private readonly customerService: CustomerService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly cacheService: DashboardCacheService,
  ) {}

  /**
   * Get data for a specific widget
   */
  async getWidgetData(
    widgetId: string,
    organizationId: string,
    forceRefresh: boolean = false,
  ) {
    try {
      // Get widget configuration
      const widget = await this.widgetRepository.findById(widgetId);
      if (!widget) {
        throw new NotFoundException(`Widget not found: ${widgetId}`);
      }

      // Verify organization access
      if (widget.dashboard.organizationId !== organizationId) {
        throw new NotFoundException(`Widget not found: ${widgetId}`);
      }

      const cacheKey = `widget_data_${widgetId}`;
      
      // Check cache unless force refresh is requested
      if (!forceRefresh) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          this.logger.log(`Returning cached data for widget: ${widgetId}`);
          return cached;
        }
      }

      // Generate data based on widget type
      const data = await this.generateWidgetData(widget, organizationId);

      // Cache the data based on widget refresh interval
      const cacheTime = widget.refreshInterval || 300; // Default 5 minutes
      await this.cacheService.set(cacheKey, data, cacheTime);

      this.logger.log(`Generated data for widget: ${widgetId} (${widget.widgetType})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get widget data: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate data based on widget type
   */
  private async generateWidgetData(widget: any, organizationId: string) {
    const { widgetType, configuration } = widget;

    switch (widgetType) {
      case WidgetType.METRIC_CARD:
        return this.generateMetricCardData(organizationId, configuration);
      
      case WidgetType.CHART:
        return this.generateChartData(organizationId, configuration);
      
      case WidgetType.TABLE:
        return this.generateTableData(organizationId, configuration);
      
      case WidgetType.LIST:
        return this.generateListData(organizationId, configuration);
      
      case WidgetType.CASH_FLOW:
        return this.generateCashFlowData(organizationId, configuration);
      
      case WidgetType.REVENUE_EXPENSES:
        return this.generateRevenueExpensesData(organizationId, configuration);
      
      case WidgetType.KPI_SUMMARY:
        return this.generateKpiSummaryData(organizationId, configuration);
      
      case WidgetType.RECEIVABLES:
        return this.generateReceivablesData(organizationId, configuration);
      
      case WidgetType.EXPENSE_TRENDS:
        return this.generateExpenseTrendsData(organizationId, configuration);
      
      case WidgetType.PROFITABILITY:
        return this.generateProfitabilityData(organizationId, configuration);
      
      default:
        throw new Error(`Unsupported widget type: ${widgetType}`);
    }
  }

  /**
   * Generate metric card data
   */
  private async generateMetricCardData(organizationId: string, config: any) {
    const metric = config.metric || 'total_revenue';
    const period = config.period || 'month';

    switch (metric) {
      case 'total_revenue':
        const revenue = await this.baseAnalyticsService.getTotalRevenue(organizationId, period);
        return {
          value: revenue.amount,
          trend: revenue.trend,
          currency: 'ZMW',
          period,
          lastUpdated: new Date().toISOString(),
        };
      
      case 'total_expenses':
        const expenses = await this.baseAnalyticsService.getTotalExpenses(organizationId, period);
        return {
          value: expenses.amount,
          trend: expenses.trend,
          currency: 'ZMW',
          period,
          lastUpdated: new Date().toISOString(),
        };
      
      case 'net_profit':
        const profit = await this.baseAnalyticsService.getNetProfit(organizationId, period);
        return {
          value: profit.amount,
          trend: profit.trend,
          currency: 'ZMW',
          period,
          lastUpdated: new Date().toISOString(),
        };
      
      case 'customer_count':
        const customerCount = await this.customerService.getCustomerCount(organizationId);
        return {
          value: customerCount,
          trend: 0, // Would need historical data for trend
          period,
          lastUpdated: new Date().toISOString(),
        };
      
      default:
        throw new Error(`Unsupported metric: ${metric}`);
    }
  }

  /**
   * Generate chart data
   */
  private async generateChartData(organizationId: string, config: any) {
    const chartType = config.chartType || 'line';
    const dataType = config.dataType || 'revenue';
    const period = config.period || 'last_6_months';

    switch (dataType) {
      case 'revenue':
        return this.analyticsService.getRevenueChartData(organizationId, period, chartType);
      
      case 'expenses':
        return this.expenseTrendService.getExpenseChartData(organizationId, period, chartType);
      
      case 'profit':
        return this.profitabilityService.getProfitChartData(organizationId, period, chartType);
      
      case 'cash_flow':
        return this.analyticsService.getCashFlowChartData(organizationId, period, chartType);
      
      default:
        throw new Error(`Unsupported chart data type: ${dataType}`);
    }
  }

  /**
   * Generate table data
   */
  private async generateTableData(organizationId: string, config: any) {
    const tableType = config.tableType || 'recent_invoices';
    const limit = config.limit || 10;

    switch (tableType) {
      case 'recent_invoices':
        return this.invoiceService.getRecentInvoices(organizationId, limit);
      
      case 'top_customers':
        return this.customerService.getTopCustomers(organizationId, limit);
      
      case 'pending_payments':
        return this.paymentService.getPendingPayments(organizationId, limit);
      
      case 'expense_breakdown':
        return this.expenseTrendService.getExpenseBreakdown(organizationId, limit);
      
      default:
        throw new Error(`Unsupported table type: ${tableType}`);
    }
  }

  /**
   * Generate list data
   */
  private async generateListData(organizationId: string, config: any) {
    const listType = config.listType || 'alerts';
    const limit = config.limit || 5;

    switch (listType) {
      case 'alerts':
        return this.generateAlertsList(organizationId, limit);
      
      case 'tasks':
        return this.generateTasksList(organizationId, limit);
      
      case 'notifications':
        return this.generateNotificationsList(organizationId, limit);
      
      default:
        throw new Error(`Unsupported list type: ${listType}`);
    }
  }

  /**
   * Generate cash flow widget data
   */
  private async generateCashFlowData(organizationId: string, config: any) {
    const period = config.period || 'last_30_days';
    return this.analyticsService.getCashFlowAnalysis(organizationId, { period });
  }

  /**
   * Generate revenue vs expenses widget data
   */
  private async generateRevenueExpensesData(organizationId: string, config: any) {
    const period = config.period || 'last_6_months';
    return this.analyticsService.getRevenueExpensesComparison(organizationId, { period });
  }

  /**
   * Generate KPI summary widget data
   */
  private async generateKpiSummaryData(organizationId: string, config: any) {
    const metrics = config.metrics || ['revenue', 'expenses', 'profit', 'customers'];
    return this.baseAnalyticsService.getKpiSummary(organizationId, metrics);
  }

  /**
   * Generate receivables widget data
   */
  private async generateReceivablesData(organizationId: string, config: any) {
    return this.analyticsService.getReceivablesAnalysis(organizationId);
  }

  /**
   * Generate expense trends widget data
   */
  private async generateExpenseTrendsData(organizationId: string, config: any) {
    const period = config.period || 'last_12_months';
    return this.expenseTrendService.getExpenseTrendAnalysis(organizationId, { period });
  }

  /**
   * Generate profitability widget data
   */
  private async generateProfitabilityData(organizationId: string, config: any) {
    const analysisType = config.analysisType || 'overall';
    return this.profitabilityService.getProfitabilityAnalysis(organizationId, { analysisType });
  }

  // Helper methods for list data
  private async generateAlertsList(organizationId: string, limit: number) {
    // Implementation would generate business alerts
    return {
      items: [
        {
          id: '1',
          type: 'warning',
          message: 'Invoice payment overdue by 30 days',
          priority: 'high',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'info',
          message: 'Monthly VAT return due in 5 days',
          priority: 'medium',
          timestamp: new Date().toISOString(),
        },
      ],
      total: 2,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async generateTasksList(organizationId: string, limit: number) {
    // Implementation would generate business tasks
    return {
      items: [
        {
          id: '1',
          title: 'Review monthly expenses',
          status: 'pending',
          dueDate: new Date().toISOString(),
          priority: 'medium',
        },
        {
          id: '2',
          title: 'Submit ZRA tax return',
          status: 'pending',
          dueDate: new Date().toISOString(),
          priority: 'high',
        },
      ],
      total: 2,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async generateNotificationsList(organizationId: string, limit: number) {
    // Implementation would generate notifications
    return {
      items: [
        {
          id: '1',
          message: 'New payment received from customer',
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          message: 'Invoice #INV-001 has been paid',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ],
      total: 2,
      lastUpdated: new Date().toISOString(),
    };
  }
}
