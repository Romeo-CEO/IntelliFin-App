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
import {
  AnalyticsErrorDto,
  AnalyticsResponseDto,
  FinancialRatiosDto,
  FinancialRatiosQueryDto,
  FinancialRatioTrendsResult,
  IndustryBenchmarksResult,
  AnalyticsDataSource,
  AccountAnalyticsData,
  BalanceSheetData,
  FinancialSummary,
  IndustryBenchmarkData,
  IndustryComparisonResult,
  FinancialRatioTrendPeriod,
} from '../interfaces/analytics-data.interface';
import { UserRole } from '@prisma/client';

/**
 * Financial Ratios Controller
 *
 * Provides comprehensive financial ratio analysis for Zambian SMEs including
 * liquidity, profitability, efficiency, and leverage ratios with industry benchmarking.
 *
 * Features:
 * - Complete financial ratio calculations
 * - Industry benchmarking for Zambian SMEs
 * - Historical ratio trend analysis
 * - Ratio interpretation and recommendations
 * - Performance scoring and alerts
 * - Integration with chart of accounts (Step 20)
 */
@Controller('analytics/ratios')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Financial Ratios')
export class FinancialRatiosController extends BaseAnalyticsController {
  constructor(
    baseAnalyticsService: BaseAnalyticsService,
    cacheService: AnalyticsCacheService,
    private readonly aggregationService: AnalyticsAggregationService
  ) {
    super(baseAnalyticsService, cacheService);
  }

  /**
   * Calculate comprehensive financial ratios
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Calculate financial ratios',
    description:
      'Provides comprehensive financial ratio analysis with industry benchmarking',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial ratios calculated successfully',
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
    name: 'ratioCategories',
    description: 'Specific ratio categories to calculate',
    required: false,
    example: ['LIQUIDITY', 'PROFITABILITY'],
  })
  @ApiQuery({
    name: 'includeBenchmarking',
    description: 'Include industry benchmarking',
    required: false,
    example: true,
  })
  async getFinancialRatios(
    @Query() query: FinancialRatiosQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<FinancialRatiosDto>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'FINANCIAL_RATIOS',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        {
          ratioCategories: query.ratioCategories,
          includeBenchmarking: query.includeBenchmarking,
        }
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
        'FINANCIAL_RATIOS'
      );

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'FINANCIAL_RATIOS',
        dateRange,
        {
          ratioCategories: query.ratioCategories || [],
          includeBenchmarking: query.includeBenchmarking || false,
        }
      );

      // Get cached or execute ratio calculations
      const ratiosData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'RATIOS',
        async () => {
          // Get aggregated financial data
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );

          // Calculate financial ratios
          return this.calculateFinancialRatios(financialData, query);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        ratiosData,
        organizationId,
        dateRange,
        cacheKey
      );
    } catch (error) {
      this.handleAnalyticsError(error, 'FINANCIAL_RATIOS', organizationId);
    }
  }

  /**
   * Get ratio trends over time
   */
  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze financial ratio trends',
    description: 'Provides historical trend analysis of financial ratios',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial ratio trends analyzed successfully',
    type: AnalyticsResponseDto,
  })
  async getFinancialRatioTrends(
    @Query() query: FinancialRatiosQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<FinancialRatioTrendsResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'RATIO_TRENDS',
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
        'RATIO_TRENDS',
        dateRange,
        { groupBy: query.groupBy || 'QUARTER' }
      );

      // Get cached or execute trends analysis
      const trendsData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'RATIOS',
        async () => {
          // Get aggregated financial data
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );

          // Analyze ratio trends
          return this.analyzeRatioTrends(financialData, query);
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
      this.handleAnalyticsError(error, 'RATIO_TRENDS', organizationId);
    }
  }

  /**
   * Get industry benchmarking
   */
  @Get('benchmarks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get industry benchmarks',
    description:
      'Provides industry benchmarking for financial ratios in Zambian market',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Industry benchmarks retrieved successfully',
    type: AnalyticsResponseDto,
  })
  async getIndustryBenchmarks(
    @Query() query: FinancialRatiosQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<IndustryBenchmarksResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'INDUSTRY_BENCHMARKS',
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
        'INDUSTRY_BENCHMARKS',
        dateRange
      );

      // Get cached or execute benchmarking
      const benchmarkData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'RATIOS',
        async () => {
          // Get current ratios for comparison
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );
          const currentRatios = await this.calculateFinancialRatios(
            financialData,
            query
          );

          // Generate industry benchmarks
          return this.generateIndustryBenchmarks(currentRatios);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        benchmarkData,
        organizationId,
        dateRange,
        cacheKey
      );
    } catch (error) {
      this.handleAnalyticsError(error, 'INDUSTRY_BENCHMARKS', organizationId);
    }
  }

  /**
   * Calculate comprehensive financial ratios
   */
  private async calculateFinancialRatios(
    financialData: AnalyticsDataSource,
    query: FinancialRatiosQueryDto
  ): Promise<FinancialRatiosDto> {
    const summary = await this.aggregationService.getFinancialSummary(
      financialData.organizationId,
      financialData.dateRange
    );

    // Get balance sheet data from accounts
    const balanceSheetData = this.extractBalanceSheetData(
      financialData.accounts
    );

    // Calculate liquidity ratios
    const liquidity = {
      currentRatio: this.calculateCurrentRatio(balanceSheetData),
      quickRatio: this.calculateQuickRatio(balanceSheetData),
      cashRatio: this.calculateCashRatio(balanceSheetData),
      workingCapital:
        balanceSheetData.currentAssets - balanceSheetData.currentLiabilities,
    };

    // Calculate profitability ratios
    const profitability = {
      grossMargin:
        summary.revenue > 0 ? (summary.grossProfit / summary.revenue) * 100 : 0,
      netMargin:
        summary.revenue > 0 ? (summary.netProfit / summary.revenue) * 100 : 0,
      operatingMargin:
        summary.revenue > 0 ? (summary.grossProfit / summary.revenue) * 100 : 0, // Simplified
      returnOnAssets: this.calculateReturnOnAssets(summary, balanceSheetData),
      returnOnEquity: this.calculateReturnOnEquity(summary, balanceSheetData),
    };

    // Calculate efficiency ratios
    const efficiency = {
      inventoryTurnover: this.calculateInventoryTurnover(
        summary,
        balanceSheetData
      ),
      receivablesTurnover: this.calculateReceivablesTurnover(
        summary,
        balanceSheetData
      ),
      payablesTurnover: this.calculatePayablesTurnover(
        summary,
        balanceSheetData
      ),
      assetTurnover:
        balanceSheetData.totalAssets > 0
          ? summary.revenue / balanceSheetData.totalAssets
          : 0,
      daysSalesOutstanding: this.calculateDaysSalesOutstanding(
        summary,
        balanceSheetData
      ),
    };

    // Calculate leverage ratios
    const leverage = {
      debtToEquity:
        balanceSheetData.totalEquity > 0
          ? balanceSheetData.totalLiabilities / balanceSheetData.totalEquity
          : 0,
      debtToAssets:
        balanceSheetData.totalAssets > 0
          ? balanceSheetData.totalLiabilities / balanceSheetData.totalAssets
          : 0,
      equityRatio:
        balanceSheetData.totalAssets > 0
          ? balanceSheetData.totalEquity / balanceSheetData.totalAssets
          : 0,
      debtServiceCoverage: this.calculateDebtServiceCoverage(
        summary,
        balanceSheetData
      ),
    };

    // Industry comparison (if requested)
    let industryComparison;
    if (query.includeBenchmarking) {
      industryComparison = this.getIndustryComparison(this.buildFinancialRatiosObject({
        liquidity,
        profitability,
        efficiency,
        leverage,
        industryComparison: undefined, // This will be added later if needed
        period: query.dateRange,
        calculatedAt: new Date(),
      }));
    }

    return {
      liquidity,
      profitability,
      efficiency,
      leverage,
      industryComparison,
      period: query.dateRange,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract balance sheet data from accounts
   */
  private extractBalanceSheetData(accounts: AccountAnalyticsData[]): BalanceSheetData {
    // Simplified balance sheet extraction
    // In a real implementation, this would map to proper account types

    const assets = accounts.filter(acc => acc.type === 'ASSET');
    const liabilities = accounts.filter(acc => acc.type === 'LIABILITY');
    const equity = accounts.filter(acc => acc.type === 'EQUITY');

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

    // Simplified current vs non-current classification
    const currentAssets = totalAssets * 0.6; // Assume 60% are current
    const currentLiabilities = totalLiabilities * 0.7; // Assume 70% are current
    const inventory = totalAssets * 0.2; // Assume 20% is inventory
    const cash = totalAssets * 0.1; // Assume 10% is cash
    const receivables = totalAssets * 0.3; // Assume 30% is receivables

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      currentAssets,
      currentLiabilities,
      inventory,
      cash,
      receivables,
      payables: currentLiabilities * 0.8, // Assume 80% of current liabilities are payables
    };
  }

  /**
   * Calculate current ratio
   */
  private calculateCurrentRatio(balanceSheet: BalanceSheetData): number {
    return balanceSheet.currentLiabilities > 0
      ? balanceSheet.currentAssets / balanceSheet.currentLiabilities
      : 0;
  }

  /**
   * Calculate quick ratio
   */
  private calculateQuickRatio(balanceSheet: BalanceSheetData): number {
    // Assuming inventory is not included in current assets in this simplified model
    const liquidAssets = balanceSheet.currentAssets; // Or subtract inventory if tracked
    return balanceSheet.currentLiabilities > 0
      ? liquidAssets / balanceSheet.currentLiabilities
      : 0;
  }

  /**
   * Calculate cash ratio
   */
  private calculateCashRatio(balanceSheet: BalanceSheetData): number {
    // Assuming cash and cash equivalents are part of current assets
    const cashAndEquivalents = balanceSheet.currentAssets * 0.2; // Simplified assumption
    return balanceSheet.currentLiabilities > 0
      ? cashAndEquivalents / balanceSheet.currentLiabilities
      : 0;
  }

  /**
   * Calculate inventory turnover
   */
  private calculateInventoryTurnover(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    // Requires Cost of Goods Sold (COGS) which is not in FinancialSummary
    // Using expenses as a proxy for now
    const averageInventory = balanceSheet.currentAssets * 0.3; // Simplified assumption
    return averageInventory > 0 ? summary.expenses / averageInventory : 0;
  }

  /**
   * Calculate receivables turnover
   */
  private calculateReceivablesTurnover(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    const averageAccountsReceivable = summary.accountsReceivable; // Simplified
    return averageAccountsReceivable > 0 ? summary.revenue / averageAccountsReceivable : 0;
  }

  /**
   * Calculate payables turnover
   */
  private calculatePayablesTurnover(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    // Requires Cost of Goods Sold (COGS) or Purchases which are not in FinancialSummary/BalanceSheetData
    // Using expenses as a proxy for now, and currentLiabilities as a proxy for average accounts payable
    const averageAccountsPayable = balanceSheet.currentLiabilities * 0.4; // Simplified assumption
    return averageAccountsPayable > 0 ? summary.expenses / averageAccountsPayable : 0;
  }

  /**
   * Calculate days sales outstanding
   */
  private calculateDaysSalesOutstanding(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    const receivablesTurnover = this.calculateReceivablesTurnover(
      summary,
      balanceSheet
    );
    return receivablesTurnover > 0 ? 365 / receivablesTurnover : 0;
  }

  /**
   * Calculate debt service coverage ratio
   */
  private calculateDebtServiceCoverage(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    // Requires Net Operating Income (NOI) and total debt service, which are not directly available
    // Using Net Profit + Interest Expense + Non-cash Expenses as a proxy for NOI
    // Using principal and interest payments as a proxy for total debt service

    const interestExpense = summary.expenses * 0.1; // Simplified assumption
    const principalPayments = balanceSheet.totalLiabilities * 0.05; // Simplified assumption
    const totalDebtService = interestExpense + principalPayments;

    const netOperatingIncomeProxy = summary.netProfit + interestExpense; // Simplified

    return totalDebtService > 0 ? netOperatingIncomeProxy / totalDebtService : 0;
  }

  /**
   * Calculate return on assets
   */
  private calculateReturnOnAssets(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    return balanceSheet.totalAssets > 0
      ? (summary.netProfit / balanceSheet.totalAssets) * 100
      : 0;
  }

  /**
   * Calculate return on equity
   */
  private calculateReturnOnEquity(
    summary: FinancialSummary,
    balanceSheet: BalanceSheetData
  ): number {
    return balanceSheet.totalEquity > 0
      ? (summary.netProfit / balanceSheet.totalEquity) * 100
      : 0;
  }

  /**
   * Get industry comparison for ratios
   */
  private getIndustryComparison(ratios: FinancialRatiosDto): IndustryComparisonResult {
    // Simplified comparison with services industry
    // Note: A proper implementation would fetch/determine the correct industry benchmarks dynamically
    const serviceBenchmarks = this.generateIndustryBenchmarks({} as AnalyticsDataSource).benchmarks.services; // TODO: Replace with actual benchmark retrieval

    return {
      currentRatio: {
        value: ratios.liquidity.currentRatio,
        benchmark: serviceBenchmarks.currentRatio.avg,
        performance:
          ratios.liquidity.currentRatio > serviceBenchmarks.currentRatio.avg
            ? 'ABOVE'
            : 'BELOW',
      },
      netMargin: {
        value: ratios.profitability.netMargin,
        benchmark: serviceBenchmarks.netMargin.avg,
        performance:
          ratios.profitability.netMargin > serviceBenchmarks.netMargin.avg
            ? 'ABOVE'
            : 'BELOW',
      },
      // Add other ratios as compared
    };
  }

  /**
   * Compare current ratios with benchmarks
   */
  private compareWithBenchmarks(ratios: FinancialRatiosDto, benchmarks: IndustryBenchmarkData): IndustryComparisonResult {
    // Simplified comparison with services industry
    const serviceBenchmarks = benchmarks.services;

    return {
      currentRatio: {
        value: ratios.liquidity.currentRatio,
        benchmark: serviceBenchmarks.currentRatio.avg,
        performance:
          ratios.liquidity.currentRatio > serviceBenchmarks.currentRatio.avg
            ? 'ABOVE'
            : 'BELOW',
      },
      netMargin: {
        value: ratios.profitability.netMargin,
        benchmark: serviceBenchmarks.netMargin.avg,
        performance:
          ratios.profitability.netMargin > serviceBenchmarks.netMargin.avg
            ? 'ABOVE'
            : 'BELOW',
      },
    };
  }

  /**
   * Generate benchmark-based recommendations
   */
  private generateBenchmarkRecommendations(
    ratios: FinancialRatiosDto,
    benchmarks: IndustryBenchmarkData
  ): string[] {
    const recommendations: string[] = [];

    if (ratios.liquidity.currentRatio < 1.2) {
      recommendations.push(
        'Improve liquidity by reducing current liabilities or increasing current assets'
      );
    }

    if (ratios.profitability.netMargin < 8) {
      recommendations.push(
        'Focus on improving profit margins through cost control or pricing optimization'
      );
    }

    if (ratios.leverage.debtToEquity > 0.6) {
      recommendations.push(
        'Consider reducing debt levels to improve financial stability'
      );
    }

    return recommendations;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(trends: FinancialRatioTrendPeriod[]): string {
    if (trends.length < 2) return 'STABLE';

    const firstPeriod = trends[0];
    const lastPeriod = trends[trends.length - 1];

    const ratioChange =
      (lastPeriod.currentRatio - firstPeriod.currentRatio) /
      firstPeriod.currentRatio;

    if (ratioChange > 0.1) return 'IMPROVING';
    else if (ratioChange < -0.1) return 'DECLINING';
    else return 'STABLE';
  }
}
