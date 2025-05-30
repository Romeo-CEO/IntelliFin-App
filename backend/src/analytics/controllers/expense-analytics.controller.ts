import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  AnalyticsErrorDto,
  AnalyticsQueryDto,
  AnalyticsResponseDto,
  FinancialRatiosDto,
  FinancialRatiosQueryDto,
  FinancialRatioTrendsResult,
  IndustryBenchmarksResult,
  AnalyticsDataSource,
  AccountAnalyticsData,
  BalanceSheetData,
  ExpenseTrendAnalysisResult,
  ExpenseCategoryBreakdownResult,
  ExpenseAnomaly,
  CostOptimizationRecommendation,
  ExpenseAnalyticsData,
  ExpenseTrendPeriod,
  ExpenseCategoryDetail,
  ExpensePattern,
  ExpenseTrendSummary,
  ExpenseTrendInsights,
  AnalyticsInsight
} from '../interfaces/analytics-data.interface';
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
 * - Anomaly detection for unusual expense patterns (now delegated to service via factory)
 * - Cost optimization recommendations (now delegated to service)
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
    description:
      'Provides comprehensive expense trend analysis with pattern detection and seasonal insights',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense trends analyzed successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'groupBy',
    description: 'Group results by time period',
    required: false,
    enum: ['DAY', 'WEEK', 'MONTH', 'QUARTER'],
    example: 'MONTH',
  })
  async getExpenseTrends(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<ExpenseTrendAnalysisResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'EXPENSE_TRENDS',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        { groupBy: query.groupBy }
      );

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Validate query parameters
      this.validateQuery(query);

      // Check data sufficiency
      await this.checkDataSufficiency(
        organizationId,
        dateRange,
        'EXPENSE_TRENDS'
      );

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
    description:
      'Provides detailed expense analysis by category with tax implications and optimization insights',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense category breakdown generated successfully',
    type: AnalyticsResponseDto,
  })
  async getExpenseCategoryBreakdown(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<ExpenseCategoryBreakdownResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'EXPENSE_CATEGORIES',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange)
      );

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
          const financialData =
            await this.aggregationService.aggregateFinancialData(
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
   * Get expense anomalies
   */
  @Get('anomalies')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Detect expense anomalies',
    description:
      'Identifies unusual expense patterns using statistical analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense anomalies detected successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto,
  })
  @ApiQuery({
    name: 'sensitivityLevel',
    description: 'Anomaly detection sensitivity level',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'MEDIUM',
  })
  async getExpenseAnomalies(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<ExpenseAnomaly[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'EXPENSE_ANOMALIES',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        { sensitivityLevel: query.sensitivityLevel }
      );

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Check data sufficiency (consider if specific data sufficiency check is needed for anomalies)
      // await this.checkDataSufficiency(organizationId, dateRange, 'EXPENSE_ANOMALIES');

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'EXPENSE_ANOMALIES',
        dateRange,
        { sensitivityLevel: query.sensitivityLevel || 'MEDIUM' }
      );

      // Get cached or execute anomaly detection
      const anomaliesData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'ANOMALY_DETECTION',
        async () => {
          // Use enhanced expense trend analysis service for anomaly detection
          return this.expenseTrendAnalysisService.detectExpenseAnomalies(
            organizationId,
            dateRange,
            query.sensitivityLevel || 'MEDIUM'
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        anomaliesData.anomalies, // Assuming service returns { anomalies, summary, recommendations }
        organizationId,
        dateRange,
        cacheKey,
        anomaliesData.insights || anomaliesData.recommendations // Include insights/recommendations from service
      );
    } catch (error) {
      this.handleAnalyticsError(error, 'EXPENSE_ANOMALIES', organizationId);
    }
  }

  /**
   * Get cost optimization recommendations
   */
  @Get('recommendations/cost-optimization')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get cost optimization recommendations',
    description:
      'Provides actionable recommendations to optimize expenses based on analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost optimization recommendations generated successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  async getCostOptimizationRecommendations(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<CostOptimizationRecommendation[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'COST_OPTIMIZATION_RECOMMENDATIONS',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange)
      );

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Check data sufficiency
      await this.checkDataSufficiency(
        organizationId,
        dateRange,
        'COST_OPTIMIZATION'
      );

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'COST_OPTIMIZATION',
        dateRange
      );

      // Get cached or execute recommendations generation
      const recommendationsData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'RECOMMENDATIONS',
        async () => {
          // Use enhanced expense trend analysis service for recommendations
          // This service method will internally use the anomaly detection engine if needed
          return this.expenseTrendAnalysisService.generateCostOptimizationRecommendations(
            organizationId,
            dateRange
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        recommendationsData.recommendations, // Assuming service returns { recommendations, potentialSavings, summary }
        organizationId,
        dateRange,
        cacheKey,
        [
          ...(recommendationsData.insights || []),
          `Potential Savings: ${this.baseAnalyticsService.formatZMW(recommendationsData.potentialSavings || 0)}`,
        ] // Include insights and potential savings
      );
    } catch (error) {
      this.handleAnalyticsError(
        error,
        'COST_OPTIMIZATION_RECOMMENDATIONS',
        organizationId
      );
    }
  }

  /**
   * Analyze expense trends with pattern detection
   */
  private async analyzeExpenseTrends(
    financialData: AnalyticsDataSource,
    query: AnalyticsQueryDto
  ): Promise<ExpenseTrendAnalysisResult> {
    const groupBy = query.groupBy || 'MONTH';
    const expenses = financialData.expenses;

    // Group expenses by period
    const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(
      financialData.dateRange,
      groupBy
    );

    const trends = this.calculateExpenseTrends(
      expenses,
      periods
    );

    // Detect expense patterns
    const patterns = this.detectExpensePatterns(
      expenses,
      trends
    );

    // Generate summary statistics
    const summary = this.generateExpenseSummary(trends, patterns);

    // Generate actionable insights
    const insights = this.generateExpenseTrendInsights(trends, patterns, summary, this.calculateExpenseGrowthRate(trends));

    return {
      trends,
      patterns,
      summary,
      insights,
    };
  }

  /**
   * Analyze expenses by category
   */
  private async analyzeExpenseCategories(financialData: AnalyticsDataSource): Promise<ExpenseCategoryBreakdownResult> {
    const expenses = financialData.expenses;

    // Group expenses by category
    const categoryBreakdown: Record<string, ExpenseCategoryDetail> = {};

    expenses.forEach((expense: ExpenseAnalyticsData) => {
      const category = expense.categoryName || 'Uncategorized';

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = {
          categoryName: category,
          totalAmount: 0,
          expenseCount: 0,
          taxDeductibleAmount: 0,
          averageAmount: 0,
          expenses: [],
          percentage: 0,
          taxDeductiblePercentage: 0,
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
    const totalExpenses = expenses.reduce(
      (sum: number, expense: ExpenseAnalyticsData) => sum + expense.amount,
      0
    );
    const categories = Object.values(categoryBreakdown)
      .map((category: ExpenseCategoryDetail) => ({
        ...category,
        percentage:
          totalExpenses > 0 ? (category.totalAmount / totalExpenses) * 100 : 0,
        averageAmount:
          category.expenseCount > 0
            ? category.totalAmount / category.expenseCount
            : 0,
        taxDeductiblePercentage:
          category.totalAmount > 0
            ? (category.taxDeductibleAmount / category.totalAmount) * 100
            : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      categories,
      summary: {
        totalCategories: categories.length,
        totalExpenses,
        largestCategory: categories[0]?.categoryName || 'None',
        largestCategoryAmount: categories[0]?.totalAmount || 0,
        totalTaxDeductible: categories.reduce(
          (sum, cat) => sum + cat.taxDeductibleAmount,
          0
        ),
      },
    };
  }

  /**
   * Calculate expense growth rate
   */
  private calculateExpenseGrowthRate(trends: ExpenseTrendPeriod[]): number {
    if (trends.length < 2) return 0;

    const firstPeriod = trends[0].totalAmount;
    const lastPeriod = trends[trends.length - 1].totalAmount;

    return firstPeriod > 0
      ? ((lastPeriod - firstPeriod) / firstPeriod) * 100
      : 0;
  }

  /**
   * Detect expense seasonality patterns
   */
  private detectExpenseSeasonality(trends: ExpenseTrendPeriod[]): string {
    const expenses = trends.map(t => t.totalAmount);
    const average =
      expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;
    const variance =
      expenses.reduce((sum, exp) => sum + Math.pow(exp - average, 2), 0) /
      expenses.length;

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
  private generateExpenseTrendInsights(
    trends: ExpenseTrendPeriod[],
    patterns: ExpensePattern[],
    summary: ExpenseTrendSummary,
    growthRate: number
  ): ExpenseTrendInsights[] {
    const insights: ExpenseTrendInsights[] = [];

    if (growthRate > 20) {
      insights.push({
        type: 'WARNING',
        title: 'High expense growth detected',
        description: `Expenses have grown by ${growthRate.toFixed(1)}% over the period`,
        recommendation: 'Review expense categories and implement cost controls',
      });
    } else if (growthRate < -10) {
      insights.push({
        type: 'POSITIVE',
        title: 'Expense reduction achieved',
        description: `Expenses have decreased by ${Math.abs(growthRate).toFixed(1)}% over the period`,
        recommendation: 'Continue current cost management strategies',
      });
    }

    return insights;
  }

  /**
   * Calculate expense trends for time periods
   */
  private calculateExpenseTrends(
    expenses: ExpenseAnalyticsData[],
    periods: DateRange[]
  ): ExpenseTrendPeriod[] {
    return periods.map(period => {
      const periodExpenses = expenses.filter(
        (expense: ExpenseAnalyticsData) =>
          expense.expenseDate >= period.startDate &&
          expense.expenseDate <= period.endDate
      );

      const totalAmount = periodExpenses.reduce(
        (sum: number, expense: ExpenseAnalyticsData) => sum + expense.amount,
        0
      );
      const taxDeductibleAmount = periodExpenses
        .filter((expense: ExpenseAnalyticsData) => expense.isTaxDeductible)
        .reduce((sum, expense) => sum + expense.amount, 0);

      // Category breakdown
      const categoryBreakdown = this.calculateCategoryBreakdown(periodExpenses);

      // Calculate period-over-period change
      const previousPeriodIndex = periods.indexOf(period) - 1;
      let changeFromPrevious = 0;
      if (previousPeriodIndex >= 0) {
        const previousPeriodExpenses = expenses.filter(
          (expense: ExpenseAnalyticsData) =>
            expense.expenseDate >= periods[previousPeriodIndex].startDate &&
            expense.expenseDate <= periods[previousPeriodIndex].endDate
        );
        const previousTotal = previousPeriodExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0
        );
        changeFromPrevious =
          previousTotal > 0
            ? ((totalAmount - previousTotal) / previousTotal) * 100
            : 0;
      }

      return {
        period: period.startDate.toISOString().slice(0, 7),
        startDate: period.startDate,
        endDate: period.endDate,
        totalAmount,
        expenseCount: periodExpenses.length,
        averageExpenseAmount:
          periodExpenses.length > 0 ? totalAmount / periodExpenses.length : 0,
        taxDeductibleAmount,
        taxDeductiblePercentage:
          totalAmount > 0 ? (taxDeductibleAmount / totalAmount) * 100 : 0,
        categoryBreakdown,
        changeFromPrevious,
        zambianSeason: this.baseAnalyticsService.getZambianSeason(
          period.startDate
        ),
      };
    });
  }

  /**
   * Detect expense patterns across categories and time
   */
  private detectExpensePatterns(
    expenses: ExpenseAnalyticsData[],
    trends: ExpenseTrendPeriod[]
  ): ExpensePattern[] {
    const patterns: ExpensePattern[] = [];

    // Group expenses by category
    const categoryGroups: Record<string, ExpenseAnalyticsData[]> = {};
    expenses.forEach((expense: ExpenseAnalyticsData) => {
      const category = expense.categoryName || 'Uncategorized';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(expense);
    });

    // Analyze patterns for each category
    Object.entries(categoryGroups).forEach(([category, categoryExpenses]: [string, ExpenseAnalyticsData[]]) => {
      if (categoryExpenses.length < 3) return; // Need minimum data for pattern detection

      const monthlyAmounts = this.getMonthlyAmounts(categoryExpenses);
      const pattern = this.analyzePattern(monthlyAmounts);
      const seasonality = this.detectSeasonality(categoryExpenses);

      patterns.push({
        category,
        pattern: pattern.direction,
        changeRate: pattern.changeRate,
        confidence: pattern.confidence,
        recommendations: this.generatePatternRecommendations(
          category,
          pattern,
          seasonality
        ),
        seasonalityDetected: seasonality.detected,
      });
    });

    return patterns;
  }

  /**
   * Get monthly expense amounts for a category
   */
  private getMonthlyAmounts(expenses: ExpenseAnalyticsData[]): number[] {
    const monthlyAmounts: Record<string, number> = {};

    expenses.forEach((expense: ExpenseAnalyticsData) => {
      const month = expense.expenseDate.toISOString().slice(0, 7);
      monthlyAmounts[month] = (monthlyAmounts[month] || 0) + expense.amount;
    });

    return Object.values(monthlyAmounts);
  }

  /**
   * Generate expense summary statistics
   */
  private generateExpenseSummary(
    trends: ExpenseTrendPeriod[],
    patterns: ExpensePattern[]
  ): ExpenseTrendSummary {
    const totalExpenses = trends.reduce(
      (sum, trend) => sum + trend.totalAmount,
      0
    );
    const averageMonthlyExpenses = totalExpenses / trends.length;

    const increasingPatterns = patterns.filter(
      p => p.pattern === 'INCREASING'
    ).length;
    const volatilePatterns = patterns.filter(
      p => p.pattern === 'VOLATILE'
    ).length;

    const overallGrowthRate =
      trends.length > 1
        ? this.baseAnalyticsService.calculatePercentageChange(
            trends[trends.length - 1].totalAmount,
            trends[0].totalAmount
          )
        : 0;

    return {
      totalExpenses,
      averageMonthlyExpenses,
      overallGrowthRate,
      increasingCategories: increasingPatterns,
      volatileCategories: volatilePatterns,
      totalCategories: patterns.length,
      averageTaxDeductiblePercentage:
        trends.reduce((sum, trend) => sum + trend.taxDeductiblePercentage, 0) /
        trends.length,
    };
  }
}
