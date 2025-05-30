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
import { RevenueForecastingService } from '../services/revenue-forecasting.service';
import {
  AnalyticsErrorDto,
  AnalyticsResponseDto,
  ForecastResultDto,
  ForecastingQueryDto,
} from '../dto/analytics-query.dto';
import { UserRole } from '@prisma/client';
import {
  DateRange,
  AnalyticsInsight,
  SeasonalPattern
} from '../interfaces/analytics-data.interface';
import { AnalyticsDataSource } from '../interfaces/analytics-data.interface';
import { InvoiceAnalyticsData } from '../interfaces/analytics-data.interface';
import { CustomerAnalyticsData } from '../interfaces/analytics-data.interface';

// Define interfaces for Revenue Trends result
interface RevenueTrendPeriod {
  period: string; // YYYY-MM or other period format
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  averageRevenuePerInvoice: number;
  invoiceCount: number;
  changeFromPrevious: number; // Percentage change from the previous period
  zambianSeason?: string; // Optional, based on implementation
}

interface RevenueTrendSummary {
  totalRevenue: number;
  averagePeriodRevenue: number;
  overallGrowthRate: number; // Percentage change over the entire period
  periodsAnalyzed: number;
}

interface RevenueTrendsResult {
  trends: RevenueTrendPeriod[];
  summary: RevenueTrendSummary;
  seasonalPattern?: SeasonalPattern; // Optional, if detected
  insights: AnalyticsInsight[];
}

// Define interfaces for Customer Revenue Breakdown result
interface CustomerRevenueDetail {
  id: string;
  name: string;
  totalRevenue: number;
  totalPayments: number;
  invoiceCount: number;
  paymentCount: number;
  averageInvoiceValue: number;
  paymentTerms: number;
  isActive: boolean;
  ranking: number;
  revenuePercentage: number;
}

interface CustomerRevenueSummary {
  totalCustomers: number;
  totalRevenue: number;
  top10Revenue: number;
  averageRevenuePerCustomer: number;
}

interface CustomerRevenueBreakdownResult {
  customers: CustomerRevenueDetail[];
  summary: CustomerRevenueSummary;
}

/**
 * Revenue Analytics Controller
 *
 * Provides revenue forecasting and trend analysis endpoints for Zambian SMEs.
 * Includes time series analysis, seasonal pattern detection, and predictive modeling.
 *
 * Features:
 * - Revenue forecasting with multiple algorithms (now delegated to service via factory)
 * - Historical revenue trend analysis
 * - Seasonal pattern recognition for Zambian business cycles
 * - Customer revenue breakdown and analysis
 * - Integration with existing invoice and payment data
 */
@Controller('analytics/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Revenue Analytics')
export class RevenueAnalyticsController extends BaseAnalyticsController {
  constructor(
    baseAnalyticsService: BaseAnalyticsService,
    cacheService: AnalyticsCacheService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly revenueForecastingService: RevenueForecastingService
  ) {
    super(baseAnalyticsService, cacheService);
  }

  /**
   * Get revenue forecast for specified period
   */
  @Get('forecast')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Generate revenue forecast',
    description:
      'Provides revenue forecasting using time series analysis optimized for Zambian SME patterns',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue forecast generated successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for historical data (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for historical data (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'forecastPeriods',
    description: 'Number of periods to forecast',
    required: false,
    example: 6,
  })
  @ApiQuery({
    name: 'modelType',
    description: 'Forecasting model type',
    required: false,
    enum: ['LINEAR', 'SEASONAL', 'ARIMA', 'EXPONENTIAL'],
    example: 'SEASONAL',
  })
  async getRevenueForecast(
    @Query() query: ForecastingQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<ForecastResultDto[]>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'REVENUE_FORECAST',
        organizationId,
        userId,
        this.validateDateRange(query.dateRange),
        {
          forecastPeriods: query.forecastPeriods,
          modelType: query.modelType,
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
        'REVENUE_FORECAST'
      );

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'REVENUE_FORECAST',
        dateRange,
        {
          forecastPeriods: query.forecastPeriods || 6,
          modelType: query.modelType || 'SEASONAL',
        }
      );

      // Get cached or execute forecast
      const forecastData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'FORECASTING',
        async () => {
          // Generate enhanced revenue forecast using production algorithms
          // This now uses the AnalyticsEngineFactory internally
          return this.revenueForecastingService.generateEnhancedRevenueForecast(
            organizationId,
            dateRange,
            query.forecastPeriods || 6,
            query.modelType
          );
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        forecastData,
        organizationId,
        dateRange,
        cacheKey,
        [] // Insights will be added when forecast service is implemented
      );
    } catch (error) {
      this.handleAnalyticsError(error, 'REVENUE_FORECAST', organizationId);
    }
  }

  /**
   * Get revenue trends analysis
   */
  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze revenue trends',
    description:
      'Provides revenue trend analysis with seasonal pattern detection for Zambian business cycles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue trends analyzed successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or insufficient data',
    type: AnalyticsErrorDto,
  })
  async getRevenueTrends(
    @Query() query: ForecastingQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<RevenueTrendsResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'REVENUE_TRENDS',
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
        'REVENUE_TRENDS'
      );

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'REVENUE_TRENDS',
        dateRange,
        { groupBy: query.groupBy || 'MONTH' }
      );

      // Get cached or execute trends analysis
      const trendsData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TRENDS',
        async () => {
          // Get aggregated financial data
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );

          // Analyze revenue trends (placeholder implementation)
          return this.analyzeRevenueTrends(financialData, query);
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
      this.handleAnalyticsError(error, 'REVENUE_TRENDS', organizationId);
    }
  }

  /**
   * Get customer revenue breakdown
   */
  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get customer revenue breakdown',
    description:
      'Provides detailed revenue analysis by customer with profitability insights',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer revenue breakdown generated successfully',
    type: AnalyticsResponseDto,
  })
  async getCustomerRevenueBreakdown(
    @Query() query: ForecastingQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<CustomerRevenueBreakdownResult>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest(
        'CUSTOMER_REVENUE',
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
        'CUSTOMER_REVENUE',
        dateRange
      );

      // Get cached or execute customer analysis
      const customerData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'CUSTOMER_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData =
            await this.aggregationService.aggregateFinancialData(
              organizationId,
              dateRange
            );

          // Analyze customer revenue (placeholder implementation)
          return this.analyzeCustomerRevenue(financialData);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        customerData,
        organizationId,
        dateRange,
        cacheKey
      );
    } catch (error) {
      this.handleAnalyticsError(error, 'CUSTOMER_REVENUE', organizationId);
    }
  }

  /**
   * Placeholder implementation for revenue forecasting
   * This will be replaced with actual forecasting algorithms in Week 2
   */
  private async generateRevenueForecast(
    financialData: AnalyticsDataSource,
    query: ForecastingQueryDto
  ): Promise<ForecastResultDto[]> {
    const forecastPeriods = query.forecastPeriods || 6;
    const modelType = query.modelType || 'SEASONAL';

    // Calculate average monthly revenue from historical data
    const monthlyRevenues = this.calculateMonthlyRevenues(
      financialData.invoices
    );
    const averageRevenue =
      monthlyRevenues.reduce((sum, rev) => sum + rev, 0) /
      monthlyRevenues.length;

    // Generate simple forecast (will be enhanced with actual algorithms)
    const forecasts: ForecastResultDto[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= forecastPeriods; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      // Simple seasonal adjustment for Zambian business patterns
      const seasonalMultiplier = this.getSeasonalMultiplier(forecastDate);
      const predictedValue = averageRevenue * seasonalMultiplier;

      forecasts.push({
        period: forecastDate.toISOString().slice(0, 7), // YYYY-MM format
        predictedValue,
        confidenceInterval: {
          lower: predictedValue * 0.85,
          upper: predictedValue * 1.15,
        },
        confidence: 0.75, // 75% confidence for simple model
        factors: [
          {
            factor: 'Historical Average',
            impact: 0.7,
            description: 'Based on historical revenue patterns',
          },
          {
            factor: 'Seasonal Adjustment',
            impact: seasonalMultiplier - 1,
            description: `${this.baseAnalyticsService.getZambianSeason(forecastDate)} seasonal pattern`,
          },
        ],
      });
    }

    return forecasts;
  }

  /**
   * Calculate monthly revenues from invoice data
   */
  private calculateMonthlyRevenues(invoices: InvoiceAnalyticsData[]): number[] {
    const monthlyRevenues: Record<string, number> = {};

    invoices.forEach(invoice => {
      const month = invoice.issueDate.toISOString().slice(0, 7);
      monthlyRevenues[month] =
        (monthlyRevenues[month] || 0) + invoice.totalAmount;
    });

    return Object.values(monthlyRevenues);
  }

  /**
   * Get seasonal multiplier for Zambian business patterns
   */
  private getSeasonalMultiplier(date: Date): number {
    const season = this.baseAnalyticsService.getZambianSeason(date);

    switch (season) {
      case 'DRY_SEASON':
        return 1.1; // Higher business activity during dry season
      case 'RAINY_SEASON':
        return 0.9; // Lower activity during rainy season
      case 'TRANSITION':
        return 1.0; // Normal activity during transition
      default:
        return 1.0;
    }
  }

  /**
   * Placeholder implementation for revenue trends analysis
   */
  private async analyzeRevenueTrends(
    financialData: AnalyticsDataSource,
    query: ForecastingQueryDto
  ): Promise<RevenueTrendsResult> {
    const groupBy = query.groupBy || 'MONTH';
    const invoices = financialData.invoices;

    // Group revenue by period
    const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(
      financialData.dateRange,
      groupBy
    );

    const trends: RevenueTrendPeriod[] = periods.map(period => {
      const periodInvoices: InvoiceAnalyticsData[] = invoices.filter(
        (invoice: InvoiceAnalyticsData) =>
          invoice.issueDate >= period.startDate &&
          invoice.issueDate <= period.endDate
      );

      const totalRevenue = periodInvoices.reduce(
        (sum: number, invoice: InvoiceAnalyticsData) => sum + invoice.totalAmount,
        0
      );

      return {
        period: period.startDate.toISOString().slice(0, 7),
        startDate: period.startDate,
        endDate: period.endDate,
        totalRevenue,
        averageRevenuePerInvoice: periodInvoices.length > 0 ? totalRevenue / periodInvoices.length : 0,
        invoiceCount: periodInvoices.length,
        changeFromPrevious: 0, // Placeholder, actual implementation needed
        zambianSeason: this.baseAnalyticsService.getZambianSeason(period.startDate),
      };
    });

    const summary: RevenueTrendSummary = {
      totalRevenue: trends.reduce((sum, trend) => sum + trend.totalRevenue, 0),
      averagePeriodRevenue: trends.reduce((sum, trend) => sum + trend.totalRevenue, 0) / trends.length,
      overallGrowthRate: this.calculateGrowthRate(trends),
      periodsAnalyzed: trends.length,
    };

    const seasonalPattern = this.detectSeasonalPattern(trends);
    const insights: AnalyticsInsight[] = [];

    return {
      trends,
      summary,
      seasonalPattern,
      insights,
    };
  }

  /**
   * Placeholder implementation for customer revenue analysis
   */
  private async analyzeCustomerRevenue(
    financialData: AnalyticsDataSource,
  ): Promise<CustomerRevenueBreakdownResult> {
    const customers: CustomerAnalyticsData[] = financialData.customers;

    // Sort customers by revenue
    const sortedCustomers = customers
      .sort((a: CustomerAnalyticsData, b: CustomerAnalyticsData) => b.totalRevenue - a.totalRevenue)
      .map((customer: CustomerAnalyticsData, index: number) => ({
        ...customer,
        ranking: index + 1,
        revenuePercentage:
          (customer.totalRevenue /
            customers.reduce(
              (sum: number, c: CustomerAnalyticsData) => sum + c.totalRevenue,
              0
            )) *
          100,
      }));

    const summary: CustomerRevenueSummary = {
      totalCustomers: customers.length,
      totalRevenue: customers.reduce(
        (sum: number, c: CustomerAnalyticsData) => sum + c.totalRevenue,
        0
      ),
      top10Revenue: sortedCustomers
        .slice(0, 10)
        .reduce((sum: number, c: CustomerAnalyticsData) => sum + c.totalRevenue, 0),
      averageRevenuePerCustomer:
        customers.reduce((sum: number, c: CustomerAnalyticsData) => sum + c.totalRevenue, 0) /
        customers.length,
    };

    return {
      customers: sortedCustomers,
      summary,
    };
  }

  /**
   * Calculate growth rate from trends data
   */
  private calculateGrowthRate(trends: RevenueTrendPeriod[]): number {
    if (trends.length < 2) return 0;

    const firstPeriod = trends[0].totalRevenue;
    const lastPeriod = trends[trends.length - 1].totalRevenue;

    return firstPeriod > 0
      ? ((lastPeriod - firstPeriod) / firstPeriod) * 100
      : 0;
  }

  /**
   * Detect seasonal patterns in trends data
   */
  private detectSeasonalPattern(trends: RevenueTrendPeriod[]): SeasonalPattern | null {
    // Simple seasonal pattern detection
    // This will be enhanced with proper statistical analysis in Week 2
    const revenues = trends.map(t => t.totalRevenue);
    const average =
      revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    const variance =
      revenues.reduce((sum, rev) => sum + Math.pow(rev - average, 2), 0) /
      revenues.length;

    if (variance / (average * average) > 0.2) {
      return 'HIGH_SEASONALITY';
    } else if (variance / (average * average) > 0.1) {
      return 'MODERATE_SEASONALITY';
    } else {
      return null;
    }
  }
}
