import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import { BaseAnalyticsService } from '../../analytics/services/base-analytics.service';
import { EnhancedRevenueForecastingService } from '../../analytics/services/enhanced-revenue-forecasting.service';
import { StatisticalAnomalyEngine } from '../../analytics/engines/statistical-anomaly.engine';
import { ReportService } from '../../reports/report.service';
import { TaxManagementService } from '../../tax-management/tax-management.service';
import { PaymentService } from '../../payments/payment.service';
import { DashboardCacheService } from './dashboard-cache.service';

/**
 * Dashboard Data Service
 * Provides aggregated data for dashboard widgets with analytics integration
 * Optimized for Zambian SME requirements and low-bandwidth environments
 */
@Injectable()
export class DashboardDataService {
  private readonly logger = new Logger(DashboardDataService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly baseAnalyticsService: BaseAnalyticsService,
    private readonly enhancedForecastingService: EnhancedRevenueForecastingService,
    private readonly anomalyEngine: StatisticalAnomalyEngine,
    private readonly reportService: ReportService,
    private readonly taxManagementService: TaxManagementService,
    private readonly paymentService: PaymentService,
    private readonly cacheService: DashboardCacheService
  ) {}

  /**
   * Get comprehensive dashboard overview data
   */
  async getDashboardOverview(
    organizationId: string,
    period: string = 'month',
    includeComparison: boolean = true
  ) {
    try {
      const cacheKey = `dashboard_overview_${organizationId}_${period}_${includeComparison}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(
          `Returning cached dashboard overview for organization: ${organizationId}`
        );
        return cached;
      }

      const [
        financialMetrics,
        kpiMetrics,
        cashFlowData,
        revenueBreakdown,
        complianceStatus,
      ] = await Promise.all([
        this.getFinancialMetrics(organizationId, period),
        this.getKpiMetrics(organizationId),
        this.getCashFlowData(organizationId, period),
        this.getRevenueBreakdown(organizationId, period),
        this.getZambianComplianceSummary(organizationId),
      ]);

      const overview = {
        period,
        lastUpdated: new Date().toISOString(),
        financial: financialMetrics,
        kpis: kpiMetrics,
        cashFlow: cashFlowData,
        revenue: revenueBreakdown,
        compliance: complianceStatus,
        summary: {
          totalRevenue: financialMetrics.totalRevenue,
          totalExpenses: financialMetrics.totalExpenses,
          netProfit: financialMetrics.netProfit,
          profitMargin: financialMetrics.profitMargin,
          cashBalance: financialMetrics.cashBalance,
          complianceScore: complianceStatus.overallScore,
        },
      };

      // Add period comparison if requested
      if (includeComparison) {
        overview['comparison'] = await this.getPeriodComparison(
          organizationId,
          period
        );
      }

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, overview, 300);

      this.logger.log(
        `Dashboard overview generated for organization: ${organizationId}`
      );
      return overview;
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard overview: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get KPI metrics for dashboard widgets
   */
  async getKpiMetrics(organizationId: string, requestedMetrics?: string[]) {
    try {
      const cacheKey = `kpi_metrics_${organizationId}_${requestedMetrics?.join(',') || 'all'}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get base analytics data
      const analyticsData =
        await this.baseAnalyticsService.getOrganizationAnalytics(
          organizationId
        );

      const kpis = {
        // Financial KPIs
        totalRevenue: analyticsData.totalRevenue || 0,
        totalExpenses: analyticsData.totalExpenses || 0,
        netProfit:
          (analyticsData.totalRevenue || 0) -
          (analyticsData.totalExpenses || 0),
        profitMargin: this.calculateProfitMargin(
          analyticsData.totalRevenue,
          analyticsData.totalExpenses
        ),

        // Cash Flow KPIs
        cashBalance: analyticsData.cashBalance || 0,
        accountsReceivable: analyticsData.accountsReceivable || 0,
        accountsPayable: analyticsData.accountsPayable || 0,

        // Business KPIs
        customerCount: analyticsData.customerCount || 0,
        invoiceCount: analyticsData.invoiceCount || 0,
        averageInvoiceValue: analyticsData.averageInvoiceValue || 0,
        paymentCycleTime: analyticsData.paymentCycleTime || 0,

        // Growth KPIs
        revenueGrowth: analyticsData.revenueGrowth || 0,
        customerGrowth: analyticsData.customerGrowth || 0,

        // Zambian-specific KPIs
        zraComplianceScore: analyticsData.zraComplianceScore || 0,
        mobileMoneySales: analyticsData.mobileMoneySales || 0,

        // Metadata
        lastUpdated: new Date().toISOString(),
        currency: 'ZMW',
      };

      // Filter requested metrics if specified
      if (requestedMetrics && requestedMetrics.length > 0) {
        const filteredKpis = {};
        requestedMetrics.forEach(metric => {
          if (kpis[metric] !== undefined) {
            filteredKpis[metric] = kpis[metric];
          }
        });
        filteredKpis['lastUpdated'] = kpis.lastUpdated;
        filteredKpis['currency'] = kpis.currency;

        // Cache for 3 minutes
        await this.cacheService.set(cacheKey, filteredKpis, 180);
        return filteredKpis;
      }

      // Cache for 3 minutes
      await this.cacheService.set(cacheKey, kpis, 180);
      return kpis;
    } catch (error) {
      this.logger.error(`Failed to get KPI metrics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get financial summary data
   */
  async getFinancialSummary(organizationId: string, period: string = 'month') {
    try {
      const cacheKey = `financial_summary_${organizationId}_${period}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [profitLoss, cashFlow, balanceSheet, ratios] = await Promise.all([
        this.reportService.getProfitLossStatement(organizationId, { period }),
        this.reportService.getCashFlowStatement(organizationId, { period }),
        this.reportService.getBalanceSheet(organizationId),
        this.analyticsService.getFinancialRatios(organizationId),
      ]);

      const summary = {
        period,
        profitLoss,
        cashFlow,
        balanceSheet,
        ratios,
        insights: await this.generateFinancialInsights(organizationId, period),
        lastUpdated: new Date().toISOString(),
      };

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, summary, 600);
      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to get financial summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get analytics summary with forecasts and anomalies
   */
  async getAnalyticsSummary(
    organizationId: string,
    includeForecasts: boolean = true,
    includeAnomalies: boolean = true
  ) {
    try {
      const cacheKey = `analytics_summary_${organizationId}_${includeForecasts}_${includeAnomalies}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const summary: any = {
        organizationId,
        lastUpdated: new Date().toISOString(),
      };

      // Add forecasts if requested
      if (includeForecasts) {
        const [revenueForecast, expenseForecast] = await Promise.all([
          this.enhancedForecastingService.generateRevenueForecast(
            organizationId,
            {
              periods: 6,
              confidence: 0.85,
              includeSeasonality: true,
            }
          ),
          this.enhancedForecastingService.generateExpenseForecast(
            organizationId,
            {
              periods: 6,
              confidence: 0.85,
            }
          ),
        ]);

        summary.forecasts = {
          revenue: revenueForecast,
          expenses: expenseForecast,
        };
      }

      // Add anomalies if requested
      if (includeAnomalies) {
        const anomalies = await this.anomalyEngine.detectAnomalies(
          organizationId,
          {
            sensitivity: 'MEDIUM',
            lookbackPeriods: 12,
          }
        );

        summary.anomalies = anomalies;
      }

      // Add trend analysis
      summary.trends = await this.getTrendAnalysis(organizationId);

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, summary, 900);
      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to get analytics summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get Zambian compliance summary
   */
  async getZambianComplianceSummary(organizationId: string) {
    try {
      const cacheKey = `zambian_compliance_${organizationId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [taxCompliance, zraStatus, vatSummary] = await Promise.all([
        this.taxManagementService.getComplianceStatus(organizationId),
        this.taxManagementService.getZraIntegrationStatus(organizationId),
        this.taxManagementService.getVatSummary(organizationId),
      ]);

      const summary = {
        overallScore: this.calculateComplianceScore(taxCompliance, zraStatus),
        taxCompliance,
        zraStatus,
        vatSummary,
        recommendations: this.generateComplianceRecommendations(
          taxCompliance,
          zraStatus
        ),
        lastUpdated: new Date().toISOString(),
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, summary, 1800);
      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to get Zambian compliance summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get mobile money summary
   */
  async getMobileMoneySummary(
    organizationId: string,
    provider: string = 'all'
  ) {
    try {
      const cacheKey = `mobile_money_summary_${organizationId}_${provider}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const mobileMoneySummary =
        await this.paymentService.getMobileMoneySummary(
          organizationId,
          provider
        );

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, mobileMoneySummary, 300);
      return mobileMoneySummary;
    } catch (error) {
      this.logger.error(
        `Failed to get mobile money summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // Helper methods
  private calculateProfitMargin(revenue: number, expenses: number): number {
    if (!revenue || revenue === 0) return 0;
    return ((revenue - expenses) / revenue) * 100;
  }

  private async getFinancialMetrics(organizationId: string, period: string) {
    // Implementation would call analytics service for financial metrics
    return this.baseAnalyticsService.getFinancialMetrics(
      organizationId,
      period
    );
  }

  private async getCashFlowData(organizationId: string, period: string) {
    // Implementation would call analytics service for cash flow data
    return this.analyticsService.getCashFlowAnalysis(organizationId);
  }

  private async getRevenueBreakdown(organizationId: string, period: string) {
    // Implementation would call analytics service for revenue breakdown
    return this.analyticsService.getRevenueBreakdown(organizationId);
  }

  private async getPeriodComparison(organizationId: string, period: string) {
    // Implementation would compare current period with previous period
    return this.baseAnalyticsService.getPeriodComparison(
      organizationId,
      period
    );
  }

  private async getTrendAnalysis(organizationId: string) {
    // Implementation would get trend analysis from analytics service
    return this.analyticsService.getTrendAnalysis(organizationId);
  }

  private async generateFinancialInsights(
    organizationId: string,
    period: string
  ) {
    // Implementation would generate AI-powered financial insights
    return {
      insights: [],
      recommendations: [],
      alerts: [],
    };
  }

  private calculateComplianceScore(taxCompliance: any, zraStatus: any): number {
    // Implementation would calculate overall compliance score
    return 85; // Placeholder
  }

  private generateComplianceRecommendations(
    taxCompliance: any,
    zraStatus: any
  ): string[] {
    // Implementation would generate compliance recommendations
    return [
      'Ensure VAT returns are filed on time',
      'Update ZRA registration details',
      'Review tax calculation accuracy',
    ];
  }
}
