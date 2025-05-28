import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../../auth/decorators/get-current-user.decorator';
import { GetCurrentOrganization } from '../../auth/decorators/get-current-organization.decorator';
import { BaseAnalyticsController } from './base-analytics.controller';
import { BaseAnalyticsService } from '../services/base-analytics.service';
import { AnalyticsCacheService } from '../services/analytics-cache.service';
import { AnalyticsAggregationService } from '../services/analytics-aggregation.service';
import { ProfitabilityAnalysisEngineService } from '../services/profitability-analysis-engine.service';
import {
  ProfitabilityQueryDto,
  CustomerProfitabilityDto,
  AnalyticsResponseDto,
  AnalyticsErrorDto
} from '../dto/analytics-query.dto';
import { UserRole } from '@prisma/client';

/**
 * Profitability Analytics Controller
 *
 * Provides comprehensive profitability analysis for Zambian SMEs including
 * customer profitability, product margins, segment analysis, and optimization insights.
 *
 * Features:
 * - Customer profitability analysis with ranking
 * - Product/service margin analysis
 * - Business segment profitability
 * - Cost allocation and margin optimization
 * - Profitability trends and forecasting
 * - Risk assessment and recommendations
 */
@Controller('analytics/profitability')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Profitability Analytics')
export class ProfitabilityAnalyticsController extends BaseAnalyticsController {
  constructor(
    baseAnalyticsService: BaseAnalyticsService,
    cacheService: AnalyticsCacheService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly profitabilityAnalysisEngineService: ProfitabilityAnalysisEngineService
  ) {
    super(baseAnalyticsService, cacheService);
  }

  /**
   * Get customer profitability analysis
   */
  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze customer profitability',
    description: 'Provides detailed profitability analysis by customer with cost allocation and ranking'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer profitability analysis completed successfully',
    type: AnalyticsResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (YYYY-MM-DD)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (YYYY-MM-DD)',
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'minProfitThreshold',
    description: 'Minimum profit threshold for inclusion',
    required: false,
    example: 1000
  })
  @ApiQuery({
    name: 'includeCostAllocation',
    description: 'Include detailed cost allocation',
    required: false,
    example: true
  })
  async getCustomerProfitability(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<CustomerProfitabilityDto[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('CUSTOMER_PROFITABILITY', organizationId, userId,
        this.validateDateRange(query.dateRange), {
          minProfitThreshold: query.minProfitThreshold,
          includeCostAllocation: query.includeCostAllocation
        });

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Validate query parameters
      this.validateQuery(query);

      // Check data sufficiency
      await this.checkDataSufficiency(organizationId, dateRange, 'CUSTOMER_PROFITABILITY');

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'CUSTOMER_PROFITABILITY',
        dateRange,
        {
          minProfitThreshold: query.minProfitThreshold || 0,
          includeCostAllocation: query.includeCostAllocation || false
        }
      );

      // Get cached or execute profitability analysis
      const profitabilityData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'PROFITABILITY',
        async () => {
          // Use enhanced profitability analysis engine
          return this.profitabilityAnalysisEngineService.analyzeCustomerProfitability(
            organizationId,
            dateRange,
            query.includeCostAllocation !== false, // Default to true
            query.minProfitThreshold
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        profitabilityData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'CUSTOMER_PROFITABILITY', organizationId);
    }
  }

  /**
   * Get overall profitability summary
   */
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get profitability summary',
    description: 'Provides overall profitability metrics and trends for the organization'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profitability summary generated successfully',
    type: AnalyticsResponseDto
  })
  async getProfitabilitySummary(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('PROFITABILITY_SUMMARY', organizationId, userId,
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'PROFITABILITY_SUMMARY',
        dateRange
      );

      // Get cached or execute summary analysis
      const summaryData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'PROFITABILITY',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Generate profitability summary
          return this.generateProfitabilitySummary(financialData);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        summaryData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'PROFITABILITY_SUMMARY', organizationId);
    }
  }

  /**
   * Get profitability trends
   */
  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze profitability trends',
    description: 'Provides profitability trend analysis over time with margin insights'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profitability trends analyzed successfully',
    type: AnalyticsResponseDto
  })
  async getProfitabilityTrends(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('PROFITABILITY_TRENDS', organizationId, userId,
        this.validateDateRange(query.dateRange), { groupBy: query.groupBy });

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'PROFITABILITY_TRENDS',
        dateRange,
        { groupBy: query.groupBy || 'MONTH' }
      );

      // Get cached or execute trends analysis
      const trendsData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'PROFITABILITY',
        async () => {
          // Use enhanced profitability analysis engine
          return this.profitabilityAnalysisEngineService.analyzeProfitabilityTrends(
            organizationId,
            dateRange,
            query.groupBy || 'MONTH'
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        trendsData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'PROFITABILITY_TRENDS', organizationId);
    }
  }

  /**
   * Get margin optimization recommendations
   */
  @Get('optimization')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get margin optimization recommendations',
    description: 'Provides actionable recommendations for improving profitability and margins'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Margin optimization recommendations generated successfully',
    type: AnalyticsResponseDto
  })
  async getMarginOptimization(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('MARGIN_OPTIMIZATION', organizationId, userId,
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'MARGIN_OPTIMIZATION',
        dateRange
      );

      // Get cached or execute optimization analysis
      const optimizationData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'PROFITABILITY',
        async () => {
          // Use enhanced profitability analysis engine
          return this.profitabilityAnalysisEngineService.generateMarginOptimizationRecommendations(
            organizationId,
            dateRange
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        optimizationData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'MARGIN_OPTIMIZATION', organizationId);
    }
  }

  /**
   * Analyze customer profitability with cost allocation
   */
  private async analyzeCustomerProfitability(financialData: any, query: ProfitabilityQueryDto): Promise<any> {
    const customers = financialData.customers;
    const expenses = financialData.expenses;
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
    const totalRevenue = customers.reduce((sum: number, customer: any) => sum + customer.totalRevenue, 0);

    // Calculate customer profitability with cost allocation
    const customerProfitability = customers.map((customer: any) => {
      const revenue = customer.totalRevenue;

      // Simple cost allocation based on revenue percentage
      const revenuePercentage = totalRevenue > 0 ? revenue / totalRevenue : 0;
      const allocatedCosts = totalExpenses * revenuePercentage;

      // Assume 70% of revenue as direct costs (simplified)
      const directCosts = revenue * 0.7;
      const grossProfit = revenue - directCosts;
      const netProfit = grossProfit - allocatedCosts;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Risk assessment based on various factors
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (profitMargin < 5) riskLevel = 'HIGH';
      else if (profitMargin < 15) riskLevel = 'MEDIUM';

      return {
        customerId: customer.id,
        customerName: customer.name,
        revenue,
        directCosts,
        allocatedCosts,
        grossProfit,
        netProfit,
        profitMargin,
        ranking: 0, // Will be set after sorting
        riskLevel
      };
    });

    // Sort by net profit and assign rankings
    customerProfitability.sort((a, b) => b.netProfit - a.netProfit);
    customerProfitability.forEach((customer, index) => {
      customer.ranking = index + 1;
    });

    // Filter by minimum profit threshold if specified
    const filteredCustomers = query.minProfitThreshold
      ? customerProfitability.filter(c => c.netProfit >= query.minProfitThreshold)
      : customerProfitability;

    return {
      customers: filteredCustomers,
      summary: {
        totalCustomers: filteredCustomers.length,
        totalRevenue: filteredCustomers.reduce((sum, c) => sum + c.revenue, 0),
        totalNetProfit: filteredCustomers.reduce((sum, c) => sum + c.netProfit, 0),
        averageProfitMargin: filteredCustomers.length > 0
          ? filteredCustomers.reduce((sum, c) => sum + c.profitMargin, 0) / filteredCustomers.length
          : 0,
        top10Revenue: filteredCustomers.slice(0, 10).reduce((sum, c) => sum + c.revenue, 0),
        profitableCustomers: filteredCustomers.filter(c => c.netProfit > 0).length,
        unprofitableCustomers: filteredCustomers.filter(c => c.netProfit <= 0).length
      }
    };
  }

  /**
   * Generate overall profitability summary
   */
  private async generateProfitabilitySummary(financialData: any): Promise<any> {
    const summary = await this.aggregationService.getFinancialSummary(
      financialData.organizationId,
      financialData.dateRange
    );

    // Calculate additional profitability metrics
    const grossMargin = summary.revenue > 0 ? (summary.grossProfit / summary.revenue) * 100 : 0;
    const netMargin = summary.revenue > 0 ? (summary.netProfit / summary.revenue) * 100 : 0;
    const operatingMargin = grossMargin; // Simplified - same as gross margin for now

    // Calculate expense ratios
    const expenseRatio = summary.revenue > 0 ? (summary.expenses / summary.revenue) * 100 : 0;

    // Performance indicators
    const indicators = {
      profitability: netMargin > 15 ? 'EXCELLENT' : netMargin > 10 ? 'GOOD' : netMargin > 5 ? 'FAIR' : 'POOR',
      efficiency: expenseRatio < 70 ? 'EXCELLENT' : expenseRatio < 80 ? 'GOOD' : expenseRatio < 90 ? 'FAIR' : 'POOR',
      growth: 'STABLE' // Would be calculated with historical data
    };

    return {
      summary: {
        ...summary,
        grossMargin,
        netMargin,
        operatingMargin,
        expenseRatio
      },
      indicators,
      insights: this.generateProfitabilityInsights(summary, grossMargin, netMargin)
    };
  }

  /**
   * Analyze profitability trends over time
   */
  private async analyzeProfitabilityTrends(financialData: any, query: ProfitabilityQueryDto): Promise<any> {
    const groupBy = query.groupBy || 'MONTH';
    const invoices = financialData.invoices;
    const expenses = financialData.expenses;

    // Group data by period
    const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(
      financialData.dateRange,
      groupBy
    );

    const trends = periods.map(period => {
      // Calculate revenue for period
      const periodInvoices = invoices.filter((invoice: any) =>
        invoice.issueDate >= period.startDate && invoice.issueDate <= period.endDate
      );
      const revenue = periodInvoices.reduce((sum: number, invoice: any) => sum + invoice.totalAmount, 0);

      // Calculate expenses for period
      const periodExpenses = expenses.filter((expense: any) =>
        expense.expenseDate >= period.startDate && expense.expenseDate <= period.endDate
      );
      const totalExpenses = periodExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

      // Calculate profitability metrics
      const grossProfit = revenue - (revenue * 0.7); // Simplified COGS
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        period: period.startDate.toISOString().slice(0, 7),
        revenue,
        expenses: totalExpenses,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin
      };
    });

    return {
      trends,
      summary: {
        averageGrossMargin: trends.reduce((sum, trend) => sum + trend.grossMargin, 0) / trends.length,
        averageNetMargin: trends.reduce((sum, trend) => sum + trend.netMargin, 0) / trends.length,
        totalRevenue: trends.reduce((sum, trend) => sum + trend.revenue, 0),
        totalProfit: trends.reduce((sum, trend) => sum + trend.netProfit, 0),
        profitabilityTrend: this.calculateProfitabilityTrend(trends)
      }
    };
  }

  /**
   * Generate margin optimization recommendations
   */
  private async generateMarginOptimizationRecommendations(financialData: any): Promise<any> {
    const summary = await this.generateProfitabilitySummary(financialData);
    const customerAnalysis = await this.analyzeCustomerProfitability(financialData, {});
    const recommendations: any[] = [];

    // Recommendation 1: Focus on high-margin customers
    const topCustomers = customerAnalysis.customers.slice(0, 5);
    if (topCustomers.length > 0) {
      recommendations.push({
        type: 'CUSTOMER_FOCUS',
        priority: 'HIGH',
        title: 'Focus on high-margin customers',
        description: `Top 5 customers generate ${topCustomers.reduce((sum: number, c: any) => sum + c.profitMargin, 0) / 5}% average margin`,
        potentialImpact: 'Increase overall profitability by 15-25%',
        actionItems: [
          'Develop retention strategies for top customers',
          'Analyze what makes these customers profitable',
          'Replicate successful customer patterns'
        ]
      });
    }

    // Recommendation 2: Address unprofitable customers
    const unprofitableCustomers = customerAnalysis.customers.filter((c: any) => c.netProfit <= 0);
    if (unprofitableCustomers.length > 0) {
      recommendations.push({
        type: 'CUSTOMER_OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Address unprofitable customers',
        description: `${unprofitableCustomers.length} customers are unprofitable`,
        potentialImpact: 'Improve margins by 10-20%',
        actionItems: [
          'Review pricing for unprofitable customers',
          'Reduce service costs or increase efficiency',
          'Consider customer relationship restructuring'
        ]
      });
    }

    // Recommendation 3: Cost optimization
    if (summary.summary.expenseRatio > 80) {
      recommendations.push({
        type: 'COST_OPTIMIZATION',
        priority: 'HIGH',
        title: 'Reduce operational costs',
        description: `Expense ratio of ${summary.summary.expenseRatio.toFixed(1)}% is above optimal range`,
        potentialImpact: 'Improve net margin by 5-10%',
        actionItems: [
          'Review and optimize major expense categories',
          'Implement cost control measures',
          'Negotiate better supplier terms'
        ]
      });
    }

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'HIGH').length,
        estimatedImpact: 'Potential 20-40% improvement in overall profitability'
      }
    };
  }

  /**
   * Generate profitability insights
   */
  private generateProfitabilityInsights(summary: any, grossMargin: number, netMargin: number): any[] {
    const insights: any[] = [];

    if (netMargin > 20) {
      insights.push({
        type: 'POSITIVE',
        title: 'Excellent profitability',
        description: `Net margin of ${netMargin.toFixed(1)}% indicates strong profitability`,
        recommendation: 'Maintain current strategies and consider expansion'
      });
    } else if (netMargin < 5) {
      insights.push({
        type: 'WARNING',
        title: 'Low profitability',
        description: `Net margin of ${netMargin.toFixed(1)}% is below healthy levels`,
        recommendation: 'Focus on cost reduction and pricing optimization'
      });
    }

    if (grossMargin > 40) {
      insights.push({
        type: 'POSITIVE',
        title: 'Strong gross margins',
        description: `Gross margin of ${grossMargin.toFixed(1)}% indicates good pricing power`,
        recommendation: 'Focus on controlling operating expenses'
      });
    }

    return insights;
  }

  /**
   * Calculate profitability trend direction
   */
  private calculateProfitabilityTrend(trends: any[]): string {
    if (trends.length < 2) return 'STABLE';

    const firstMargin = trends[0].netMargin;
    const lastMargin = trends[trends.length - 1].netMargin;
    const change = lastMargin - firstMargin;

    if (change > 2) return 'IMPROVING';
    else if (change < -2) return 'DECLINING';
    else return 'STABLE';
  }
}
