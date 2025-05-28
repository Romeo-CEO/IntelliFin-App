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
import { ExpenseTrendAnalysisService } from '../services/expense-trend-analysis.service';
import {
  AnalyticsQueryDto,
  AnalyticsResponseDto,
  AnalyticsErrorDto
} from '../dto/analytics-query.dto';
import { UserRole } from '@prisma/client';

/**
 * Expense Analytics Controller
 *
 * Provides expense trend analysis, pattern detection, and anomaly identification
 * for Zambian SMEs with category-based insights and cost optimization recommendations.
 *
 * Features:
 * - Expense trend analysis with pattern detection
 * - Category-wise expense breakdown and analysis
 * - Anomaly detection for unusual expense patterns
 * - Cost optimization recommendations
 * - Seasonal expense pattern recognition
 * - Tax-deductible expense tracking
 */
@Controller('analytics/expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Expense Analytics')
export class ExpenseAnalyticsController extends BaseAnalyticsController {
  constructor(
    baseAnalyticsService: BaseAnalyticsService,
    cacheService: AnalyticsCacheService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly expenseTrendAnalysisService: ExpenseTrendAnalysisService
  ) {
    super(baseAnalyticsService, cacheService);
  }

  /**
   * Get expense trends analysis
   */
  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze expense trends',
    description: 'Provides comprehensive expense trend analysis with pattern detection and seasonal insights'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense trends analyzed successfully',
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
    name: 'groupBy',
    description: 'Group results by time period',
    required: false,
    enum: ['DAY', 'WEEK', 'MONTH', 'QUARTER'],
    example: 'MONTH'
  })
  async getExpenseTrends(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('EXPENSE_TRENDS', organizationId, userId,
        this.validateDateRange(query.dateRange), { groupBy: query.groupBy });

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Validate query parameters
      this.validateQuery(query);

      // Check data sufficiency
      await this.checkDataSufficiency(organizationId, dateRange, 'EXPENSE_TRENDS');

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'EXPENSE_TRENDS',
        dateRange,
        { groupBy: query.groupBy || 'MONTH' }
      );

      // Get cached or execute trends analysis
      const trendsData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TRENDS',
        async () => {
          // Use enhanced expense trend analysis service
          return this.expenseTrendAnalysisService.analyzeExpenseTrends(
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
      this.handleAnalyticsError(error, 'EXPENSE_TRENDS', organizationId);
    }
  }

  /**
   * Get expense category breakdown
   */
  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get expense breakdown by category',
    description: 'Provides detailed expense analysis by category with tax implications and optimization insights'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense category breakdown generated successfully',
    type: AnalyticsResponseDto
  })
  async getExpenseCategoryBreakdown(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('EXPENSE_CATEGORIES', organizationId, userId,
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'EXPENSE_CATEGORIES',
        dateRange
      );

      // Get cached or execute category analysis
      const categoryData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'EXPENSE_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Analyze expense categories
          return this.analyzeExpenseCategories(financialData);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        categoryData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'EXPENSE_CATEGORIES', organizationId);
    }
  }

  /**
   * Detect expense anomalies
   */
  @Get('anomalies')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Detect expense anomalies',
    description: 'Identifies unusual expense patterns and potential cost optimization opportunities'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense anomalies detected successfully',
    type: AnalyticsResponseDto
  })
  async getExpenseAnomalies(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('EXPENSE_ANOMALIES', organizationId, userId,
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'EXPENSE_ANOMALIES',
        dateRange
      );

      // Get cached or execute anomaly detection
      const anomalyData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'EXPENSE_ANALYTICS',
        async () => {
          // Use enhanced expense anomaly detection service
          return this.expenseTrendAnalysisService.detectExpenseAnomalies(
            organizationId,
            dateRange,
            'MEDIUM' // Default sensitivity level
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        anomalyData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'EXPENSE_ANOMALIES', organizationId);
    }
  }

  /**
   * Get cost optimization recommendations
   */
  @Get('optimization')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get cost optimization recommendations',
    description: 'Provides actionable recommendations for cost reduction and expense optimization'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost optimization recommendations generated successfully',
    type: AnalyticsResponseDto
  })
  async getCostOptimizationRecommendations(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('COST_OPTIMIZATION', organizationId, userId,
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'COST_OPTIMIZATION',
        dateRange
      );

      // Get cached or execute optimization analysis
      const optimizationData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'EXPENSE_ANALYTICS',
        async () => {
          // Use enhanced cost optimization service
          return this.expenseTrendAnalysisService.generateCostOptimizationRecommendations(
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
      this.handleAnalyticsError(error, 'COST_OPTIMIZATION', organizationId);
    }
  }

  /**
   * Analyze expense trends with pattern detection
   */
  private async analyzeExpenseTrends(financialData: any, query: AnalyticsQueryDto): Promise<any> {
    const groupBy = query.groupBy || 'MONTH';
    const expenses = financialData.expenses;

    // Group expenses by period
    const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(
      financialData.dateRange,
      groupBy
    );

    const trends = periods.map(period => {
      const periodExpenses = expenses.filter((expense: any) =>
        expense.expenseDate >= period.startDate && expense.expenseDate <= period.endDate
      );

      const totalExpenses = periodExpenses.reduce((sum: number, expense: any) =>
        sum + expense.amount, 0
      );

      const taxDeductibleExpenses = periodExpenses
        .filter((expense: any) => expense.isTaxDeductible)
        .reduce((sum: number, expense: any) => sum + expense.amount, 0);

      return {
        period: period.startDate.toISOString().slice(0, 7),
        totalExpenses,
        expenseCount: periodExpenses.length,
        averageExpenseAmount: periodExpenses.length > 0 ? totalExpenses / periodExpenses.length : 0,
        taxDeductibleExpenses,
        taxDeductiblePercentage: totalExpenses > 0 ? (taxDeductibleExpenses / totalExpenses) * 100 : 0
      };
    });

    // Calculate trend metrics
    const totalExpenses = trends.reduce((sum, trend) => sum + trend.totalExpenses, 0);
    const averageMonthlyExpenses = totalExpenses / trends.length;
    const growthRate = this.calculateExpenseGrowthRate(trends);

    return {
      trends,
      summary: {
        totalExpenses,
        averageMonthlyExpenses,
        growthRate,
        seasonalPattern: this.detectExpenseSeasonality(trends),
        totalTaxDeductible: trends.reduce((sum, trend) => sum + trend.taxDeductibleExpenses, 0)
      },
      insights: this.generateExpenseTrendInsights(trends, growthRate)
    };
  }

  /**
   * Analyze expenses by category
   */
  private async analyzeExpenseCategories(financialData: any): Promise<any> {
    const expenses = financialData.expenses;

    // Group expenses by category
    const categoryBreakdown: Record<string, any> = {};

    expenses.forEach((expense: any) => {
      const category = expense.categoryName || 'Uncategorized';

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = {
          categoryName: category,
          totalAmount: 0,
          expenseCount: 0,
          taxDeductibleAmount: 0,
          averageAmount: 0,
          expenses: []
        };
      }

      categoryBreakdown[category].totalAmount += expense.amount;
      categoryBreakdown[category].expenseCount += 1;
      if (expense.isTaxDeductible) {
        categoryBreakdown[category].taxDeductibleAmount += expense.amount;
      }
      categoryBreakdown[category].expenses.push(expense);
    });

    // Calculate percentages and sort by amount
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
    const categories = Object.values(categoryBreakdown)
      .map((category: any) => ({
        ...category,
        percentage: totalExpenses > 0 ? (category.totalAmount / totalExpenses) * 100 : 0,
        averageAmount: category.expenseCount > 0 ? category.totalAmount / category.expenseCount : 0,
        taxDeductiblePercentage: category.totalAmount > 0 ? (category.taxDeductibleAmount / category.totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      categories,
      summary: {
        totalCategories: categories.length,
        totalExpenses,
        largestCategory: categories[0]?.categoryName || 'None',
        largestCategoryAmount: categories[0]?.totalAmount || 0,
        totalTaxDeductible: categories.reduce((sum, cat) => sum + cat.taxDeductibleAmount, 0)
      }
    };
  }

  /**
   * Detect expense anomalies using statistical analysis
   */
  private async detectExpenseAnomalies(financialData: any): Promise<any> {
    const expenses = financialData.expenses;
    const anomalies: any[] = [];

    // Group expenses by category for anomaly detection
    const categoryGroups: Record<string, any[]> = {};
    expenses.forEach((expense: any) => {
      const category = expense.categoryName || 'Uncategorized';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(expense);
    });

    // Detect anomalies in each category
    Object.entries(categoryGroups).forEach(([category, categoryExpenses]) => {
      if (categoryExpenses.length < 3) return; // Need at least 3 data points

      const amounts = categoryExpenses.map(e => e.amount);
      const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const stdDev = this.baseAnalyticsService.calculateStandardDeviation(amounts);

      // Detect outliers (expenses > 2 standard deviations from mean)
      categoryExpenses.forEach(expense => {
        const zScore = Math.abs((expense.amount - mean) / stdDev);
        if (zScore > 2) {
          anomalies.push({
            expenseId: expense.id,
            description: expense.description,
            amount: expense.amount,
            expectedAmount: mean,
            variance: expense.amount - mean,
            anomalyScore: zScore,
            category,
            date: expense.expenseDate,
            reason: zScore > 3 ? 'Extreme outlier' : 'Significant deviation from normal pattern'
          });
        }
      });
    });

    // Sort anomalies by severity
    anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

    return {
      anomalies: anomalies.slice(0, 20), // Return top 20 anomalies
      summary: {
        totalAnomalies: anomalies.length,
        totalAnomalyAmount: anomalies.reduce((sum, anomaly) => sum + Math.abs(anomaly.variance), 0),
        highSeverityCount: anomalies.filter(a => a.anomalyScore > 3).length,
        mediumSeverityCount: anomalies.filter(a => a.anomalyScore > 2 && a.anomalyScore <= 3).length
      }
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  private async generateOptimizationRecommendations(financialData: any): Promise<any> {
    const expenses = financialData.expenses;
    const recommendations: any[] = [];

    // Analyze expense patterns for optimization opportunities
    const categoryAnalysis = await this.analyzeExpenseCategories(financialData);
    const anomalies = await this.detectExpenseAnomalies(financialData);

    // Recommendation 1: High-cost categories
    const topCategories = categoryAnalysis.categories.slice(0, 3);
    topCategories.forEach((category: any, index: number) => {
      if (category.percentage > 20) {
        recommendations.push({
          type: 'HIGH_COST_CATEGORY',
          priority: index === 0 ? 'HIGH' : 'MEDIUM',
          title: `Optimize ${category.categoryName} expenses`,
          description: `${category.categoryName} represents ${category.percentage.toFixed(1)}% of total expenses`,
          potentialSaving: category.totalAmount * 0.1, // Assume 10% potential saving
          actionItems: [
            'Review vendor contracts and negotiate better rates',
            'Implement approval workflows for this category',
            'Consider alternative suppliers or solutions'
          ]
        });
      }
    });

    // Recommendation 2: Recurring anomalies
    if (anomalies.anomalies.length > 5) {
      recommendations.push({
        type: 'EXPENSE_CONTROL',
        priority: 'HIGH',
        title: 'Implement expense controls',
        description: `${anomalies.anomalies.length} expense anomalies detected`,
        potentialSaving: anomalies.summary.totalAnomalyAmount * 0.5,
        actionItems: [
          'Set up expense approval workflows',
          'Implement spending limits by category',
          'Regular expense audits and reviews'
        ]
      });
    }

    // Recommendation 3: Tax optimization
    const totalTaxDeductible = expenses
      .filter((e: any) => e.isTaxDeductible)
      .reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    if (totalTaxDeductible / totalExpenses < 0.6) {
      recommendations.push({
        type: 'TAX_OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Maximize tax-deductible expenses',
        description: `Only ${((totalTaxDeductible / totalExpenses) * 100).toFixed(1)}% of expenses are tax-deductible`,
        potentialSaving: (totalExpenses - totalTaxDeductible) * 0.25 * 0.3, // Assume 25% could be deductible at 30% tax rate
        actionItems: [
          'Review expense categorization for tax deductibility',
          'Ensure proper documentation for tax-deductible expenses',
          'Consult with tax advisor for optimization strategies'
        ]
      });
    }

    return {
      recommendations: recommendations.slice(0, 10), // Return top 10 recommendations
      summary: {
        totalRecommendations: recommendations.length,
        totalPotentialSaving: recommendations.reduce((sum, rec) => sum + rec.potentialSaving, 0),
        highPriorityCount: recommendations.filter(r => r.priority === 'HIGH').length,
        mediumPriorityCount: recommendations.filter(r => r.priority === 'MEDIUM').length
      }
    };
  }

  /**
   * Calculate expense growth rate
   */
  private calculateExpenseGrowthRate(trends: any[]): number {
    if (trends.length < 2) return 0;

    const firstPeriod = trends[0].totalExpenses;
    const lastPeriod = trends[trends.length - 1].totalExpenses;

    return firstPeriod > 0 ? ((lastPeriod - firstPeriod) / firstPeriod) * 100 : 0;
  }

  /**
   * Detect expense seasonality patterns
   */
  private detectExpenseSeasonality(trends: any[]): string {
    const expenses = trends.map(t => t.totalExpenses);
    const average = expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;
    const variance = expenses.reduce((sum, exp) => sum + Math.pow(exp - average, 2), 0) / expenses.length;

    if (variance / (average * average) > 0.3) {
      return 'HIGH_SEASONALITY';
    } else if (variance / (average * average) > 0.15) {
      return 'MODERATE_SEASONALITY';
    } else {
      return 'LOW_SEASONALITY';
    }
  }

  /**
   * Generate insights from expense trends
   */
  private generateExpenseTrendInsights(trends: any[], growthRate: number): any[] {
    const insights: any[] = [];

    if (growthRate > 20) {
      insights.push({
        type: 'WARNING',
        title: 'High expense growth detected',
        description: `Expenses have grown by ${growthRate.toFixed(1)}% over the period`,
        recommendation: 'Review expense categories and implement cost controls'
      });
    } else if (growthRate < -10) {
      insights.push({
        type: 'POSITIVE',
        title: 'Expense reduction achieved',
        description: `Expenses have decreased by ${Math.abs(growthRate).toFixed(1)}% over the period`,
        recommendation: 'Continue current cost management strategies'
      });
    }

    return insights;
  }
}
