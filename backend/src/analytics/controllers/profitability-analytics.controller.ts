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
import { ProfitabilityAnalysisEngineService } from '../services/profitability-analysis-engine.service';
import {
  AnalyticsErrorDto,
  AnalyticsQueryDto,
  AnalyticsResponseDto,
  CustomerProfitabilityDto,
  ProfitabilityQueryDto,
  FinancialSummary,
  DateRange,
  ForecastResult,
  CostOptimizationRecommendation
} from '../interfaces/analytics-data.interface';
import { UserRole } from '@prisma/client';

// Define interfaces for Profitability Trends result
interface ProfitabilityTrendPeriod {
  period: string; // YYYY-MM or other period format
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  changeFromPreviousNetProfit: number; // Percentage change from the previous period
  zambianSeason?: string; // Optional, based on implementation
}

interface ProfitabilityTrendSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  averageGrossMargin: number;
  averageNetMargin: number;
  overallNetProfitGrowthRate: number; // Percentage change over the entire period
  periodsAnalyzed: number;
}

interface ProfitabilityTrendsResult {
  trends: ProfitabilityTrendPeriod[];
  summary: ProfitabilityTrendSummary;
  forecasts: ForecastResult[];
}

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
    description:
      'Provides detailed profitability analysis by customer with cost allocation and ranking',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer profitability analysis completed successfully',
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
    name: 'minProfitThreshold',
    description: 'Minimum profit threshold for inclusion',
    required: false,
    example: 1000,
  })
  @ApiQuery({
    name: 'includeCostAllocation',
    description: 'Include detailed cost allocation',
    required: false,
    example: true,
  })
  async getCustomerProfitability(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<CustomerProfitabilityDto[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'CUSTOMER_PROFITABILITY',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        {
          minProfitThreshold: query.minProfitThreshold,
          includeCostAllocation: query.includeCostAllocation,
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
        'CUSTOMER_PROFITABILITY'
      );

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'CUSTOMER_PROFITABILITY',
        dateRange,
        {
          minProfitThreshold: query.minProfitThreshold || 0,
          includeCostAllocation: query.includeCostAllocation || false,
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
      this.handleAnalyticsError(
        error,
        'CUSTOMER_PROFITABILITY',
        organizationId
      );
    }
  }

  /**
   * Get overall profitability summary
   */
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get profitability summary',
    description:
      'Provides overall profitability metrics and trends for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profitability summary generated successfully',
    type: AnalyticsResponseDto,
  })
  async getProfitabilitySummary(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<FinancialSummary>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'PROFITABILITY_SUMMARY',
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
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );

          // Generate profitability summary
          return this.profitabilityAnalysisEngineService.getProfitabilitySummary(
            organizationId,
            dateRange
          );
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
    description:
      'Provides profitability trend analysis over time with margin insights',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profitability trends generated successfully',
    type: AnalyticsResponseDto,
  })
  async getProfitabilityTrends(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<ProfitabilityTrendsResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'PROFITABILITY_TRENDS',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        { groupBy: query.groupBy }
      );

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
    description:
      'Provides actionable recommendations for improving profitability and margins',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Margin optimization recommendations generated successfully',
    type: AnalyticsResponseDto,
  })
  async getMarginOptimization(
    @Query() query: ProfitabilityQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<CostOptimizationRecommendation[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'MARGIN_OPTIMIZATION',
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
}
