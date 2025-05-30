import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsRepository,
  BusinessHealthScore,
  CashFlowData,
  FinancialRatios,
  KpiMetrics,
  ReceivablesAgingData,
  RevenueExpensesData,
  TaxAnalytics,
} from './analytics.repository';
import {
  ForecastResult,
  ForecastingOptions,
  RevenueForecastingService,
} from './services/revenue-forecasting.service';
import {
  ExpenseAnomalyDetection,
  ExpenseTrendAnalysis,
  ExpenseTrendService,
} from './services/expense-trend.service';
import {
  ProfitabilityAnalysis,
  ProfitabilityAnalysisService,
  ProfitabilityTrends,
} from './services/profitability-analysis.service';
import {
  TaxAnalyticsService,
  TaxOptimizationInsights,
  ZraComplianceAnalysis,
} from './services/tax-analytics.service';
import {
  FinancialHealthService,
  HealthScoreComponents,
} from './services/financial-health.service';

export interface AnalyticsQuery {
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly revenueForecastingService: RevenueForecastingService,
    private readonly expenseTrendService: ExpenseTrendService,
    private readonly profitabilityAnalysisService: ProfitabilityAnalysisService,
    private readonly taxAnalyticsService: TaxAnalyticsService,
    private readonly financialHealthService: FinancialHealthService
  ) {}

  /**
   * Get cash flow analytics data
   */
  async getCashFlowAnalytics(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<{
    data: CashFlowData[];
    summary: {
      totalInflow: number;
      totalOutflow: number;
      netCashFlow: number;
      currentBalance: number;
    };
  }> {
    try {
      const { startDate, endDate } = this.getDateRange(query);
      const groupBy = query.groupBy || 'month';

      this.logger.log(
        `Getting cash flow analytics for organization: ${organizationId}, period: ${startDate} to ${endDate}`
      );

      const data = await this.analyticsRepository.getCashFlowData(
        organizationId,
        startDate,
        endDate,
        groupBy
      );

      // Calculate summary metrics
      const summary = data.reduce(
        (acc, item) => ({
          totalInflow: acc.totalInflow + item.inflow,
          totalOutflow: acc.totalOutflow + item.outflow,
          netCashFlow: acc.netCashFlow + item.netFlow,
          currentBalance: item.cumulativeBalance, // Last item's cumulative balance
        }),
        { totalInflow: 0, totalOutflow: 0, netCashFlow: 0, currentBalance: 0 }
      );

      this.logger.log(
        `Retrieved cash flow analytics: ${data.length} periods, net flow: ${summary.netCashFlow}`
      );
      return { data, summary };
    } catch (error) {
      this.logger.error(
        `Failed to get cash flow analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get revenue vs expenses analytics
   */
  async getRevenueExpensesAnalytics(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<{
    data: RevenueExpensesData[];
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      totalProfit: number;
      averageProfitMargin: number;
    };
  }> {
    try {
      const { startDate, endDate } = this.getDateRange(query);
      const groupBy = query.groupBy || 'month';

      this.logger.log(
        `Getting revenue vs expenses analytics for organization: ${organizationId}, period: ${startDate} to ${endDate}`
      );

      const data = await this.analyticsRepository.getRevenueExpensesData(
        organizationId,
        startDate,
        endDate,
        groupBy
      );

      // Calculate summary metrics
      const summary = data.reduce(
        (acc, item) => ({
          totalRevenue: acc.totalRevenue + item.revenue,
          totalExpenses: acc.totalExpenses + item.expenses,
          totalProfit: acc.totalProfit + item.profit,
          averageProfitMargin: 0, // Will calculate after reduce
        }),
        {
          totalRevenue: 0,
          totalExpenses: 0,
          totalProfit: 0,
          averageProfitMargin: 0,
        }
      );

      // Calculate average profit margin
      summary.averageProfitMargin =
        summary.totalRevenue > 0
          ? (summary.totalProfit / summary.totalRevenue) * 100
          : 0;

      this.logger.log(
        `Retrieved revenue vs expenses analytics: ${data.length} periods, profit: ${summary.totalProfit}`
      );
      return { data, summary };
    } catch (error) {
      this.logger.error(
        `Failed to get revenue vs expenses analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get comprehensive KPI metrics
   */
  async getKpiSummary(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<KpiMetrics> {
    try {
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Getting KPI summary for organization: ${organizationId}, period: ${startDate} to ${endDate}`
      );

      const metrics = await this.analyticsRepository.getKpiMetrics(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(
        `Retrieved KPI summary: revenue: ${metrics.totalRevenue}, profit: ${metrics.netProfit}`
      );
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get KPI summary: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get accounts receivable aging analysis
   */
  async getReceivablesAging(organizationId: string): Promise<{
    aging: ReceivablesAgingData;
    insights: {
      riskLevel: 'low' | 'medium' | 'high';
      overduePercentage: number;
      averageDaysOverdue: number;
      recommendations: string[];
    };
  }> {
    try {
      this.logger.log(
        `Getting receivables aging for organization: ${organizationId}`
      );

      const aging =
        await this.analyticsRepository.getReceivablesAging(organizationId);

      // Calculate insights
      const overdueAmount =
        aging.thirtyDays +
        aging.sixtyDays +
        aging.ninetyDays +
        aging.overNinety;
      const overduePercentage =
        aging.total > 0 ? (overdueAmount / aging.total) * 100 : 0;

      const overdueDetails = aging.details.filter(d => d.daysOverdue > 0);
      const averageDaysOverdue =
        overdueDetails.length > 0
          ? overdueDetails.reduce((sum, d) => sum + d.daysOverdue, 0) /
            overdueDetails.length
          : 0;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (overduePercentage > 30 || aging.overNinety > aging.total * 0.1) {
        riskLevel = 'high';
      } else if (
        overduePercentage > 15 ||
        aging.ninetyDays > aging.total * 0.05
      ) {
        riskLevel = 'medium';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (overduePercentage > 20) {
        recommendations.push('Consider implementing stricter credit policies');
      }
      if (aging.overNinety > 0) {
        recommendations.push(
          'Review accounts over 90 days for collection action'
        );
      }
      if (averageDaysOverdue > 45) {
        recommendations.push(
          'Improve follow-up processes for overdue accounts'
        );
      }
      if (recommendations.length === 0) {
        recommendations.push('Receivables management is performing well');
      }

      const insights = {
        riskLevel,
        overduePercentage,
        averageDaysOverdue,
        recommendations,
      };

      this.logger.log(
        `Retrieved receivables aging: total: ${aging.total}, overdue: ${overduePercentage.toFixed(1)}%`
      );
      return { aging, insights };
    } catch (error) {
      this.logger.error(
        `Failed to get receivables aging: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get date range from query parameters
   */
  private getDateRange(query: AnalyticsQuery): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format. Use YYYY-MM-DD format.'
        );
      }

      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date.');
      }
    } else {
      // Default to current month if no dates specified
      const period = query.period || 'month';

      switch (period) {
        case 'day':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }

    return { startDate, endDate };
  }

  /**
   * Generate revenue forecast
   */
  async generateRevenueForecast(
    organizationId: string,
    query: AnalyticsQuery & {
      periods?: number;
      confidence?: number;
      method?: 'linear' | 'exponential' | 'seasonal';
    } = {}
  ): Promise<ForecastResult> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Generating revenue forecast for organization: ${organizationId}`
      );

      const options: ForecastingOptions = {
        periods: query.periods || 6,
        confidence: query.confidence || 0.9,
        method: query.method || 'seasonal',
        includeSeasonality: true,
      };

      const result =
        await this.revenueForecastingService.generateRevenueForecast(
          organizationId,
          startDate,
          endDate,
          options
        );

      this.logger.log(`Revenue forecast generated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate revenue forecast: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Analyze expense trends
   */
  async analyzeExpenseTrends(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<ExpenseTrendAnalysis> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Analyzing expense trends for organization: ${organizationId}`
      );

      const result = await this.expenseTrendService.analyzeExpenseTrends(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Expense trend analysis completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze expense trends: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Detect expense anomalies
   */
  async detectExpenseAnomalies(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<ExpenseAnomalyDetection> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Detecting expense anomalies for organization: ${organizationId}`
      );

      const result = await this.expenseTrendService.detectExpenseAnomalies(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Expense anomaly detection completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to detect expense anomalies: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Analyze profitability
   */
  async analyzeProfitability(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<ProfitabilityAnalysis> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Analyzing profitability for organization: ${organizationId}`
      );

      const result =
        await this.profitabilityAnalysisService.analyzeProfitability(
          organizationId,
          startDate,
          endDate
        );

      this.logger.log(`Profitability analysis completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze profitability: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Analyze profitability trends
   */
  async analyzeProfitabilityTrends(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<ProfitabilityTrends> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Analyzing profitability trends for organization: ${organizationId}`
      );

      const result =
        await this.profitabilityAnalysisService.analyzeProfitabilityTrends(
          organizationId,
          startDate,
          endDate
        );

      this.logger.log(`Profitability trends analysis completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze profitability trends: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate tax analytics
   */
  async generateTaxAnalytics(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<TaxAnalytics> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Generating tax analytics for organization: ${organizationId}`
      );

      const result = await this.taxAnalyticsService.generateTaxAnalytics(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Tax analytics generated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate tax analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate tax optimization insights
   */
  async generateTaxOptimizationInsights(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<TaxOptimizationInsights> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Generating tax optimization insights for organization: ${organizationId}`
      );

      const result =
        await this.taxAnalyticsService.generateTaxOptimizationInsights(
          organizationId,
          startDate,
          endDate
        );

      this.logger.log(`Tax optimization insights generated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate tax optimization insights: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Analyze ZRA compliance
   */
  async analyzeZraCompliance(
    organizationId: string
  ): Promise<ZraComplianceAnalysis> {
    try {
      this.validateOrganizationAccess(organizationId);

      this.logger.log(
        `Analyzing ZRA compliance for organization: ${organizationId}`
      );

      const result =
        await this.taxAnalyticsService.analyzeZraCompliance(organizationId);

      this.logger.log(`ZRA compliance analysis completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze ZRA compliance: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate business health score
   */
  async calculateBusinessHealthScore(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<BusinessHealthScore> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Calculating business health score for organization: ${organizationId}`
      );

      const result =
        await this.financialHealthService.calculateBusinessHealthScore(
          organizationId,
          startDate,
          endDate
        );

      this.logger.log(`Business health score calculated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to calculate business health score: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate financial ratios
   */
  async calculateFinancialRatios(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<FinancialRatios> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Calculating financial ratios for organization: ${organizationId}`
      );

      const result = await this.financialHealthService.calculateFinancialRatios(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Financial ratios calculated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to calculate financial ratios: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get health score components
   */
  async getHealthScoreComponents(
    organizationId: string,
    query: AnalyticsQuery = {}
  ): Promise<HealthScoreComponents> {
    try {
      this.validateOrganizationAccess(organizationId);
      const { startDate, endDate } = this.getDateRange(query);

      this.logger.log(
        `Getting health score components for organization: ${organizationId}`
      );

      const result = await this.financialHealthService.getHealthScoreComponents(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Health score components retrieved successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get health score components: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate organization access
   */
  private validateOrganizationAccess(organizationId: string): void {
    if (!organizationId || typeof organizationId !== 'string') {
      throw new BadRequestException('Valid organization ID is required');
    }
  }
}
