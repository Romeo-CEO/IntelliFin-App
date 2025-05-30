import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BaseAnalyticsService } from '../services/base-analytics.service';
import { AnalyticsCacheService } from '../services/analytics-cache.service';
import {
  AnalyticsResponse,
  DateRange,
} from '../interfaces/analytics-data.interface';
import {
  AnalyticsQueryDto,
  DateRangeDto,
} from '../dto/analytics-query.dto';

/**
 * Base Analytics Controller
 *
 * Provides common functionality for all analytics controllers.
 * Handles authentication, authorization, validation, and caching.
 *
 * Features:
 * - JWT authentication and role-based authorization
 * - Multi-tenant organization isolation
 * - Request validation and error handling
 * - Caching integration for performance
 * - Zambian business context validation
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Analytics')
export abstract class BaseAnalyticsController {
  protected readonly logger = new Logger(BaseAnalyticsController.name);

  constructor(
    protected readonly baseAnalyticsService: BaseAnalyticsService,
    protected readonly cacheService: AnalyticsCacheService
  ) {}

  /**
   * Validate and convert date range DTO to interface
   */
  protected validateDateRange(dateRangeDto: DateRangeDto): DateRange {
    const startDate = new Date(dateRangeDto.startDate);
    const endDate = new Date(dateRangeDto.endDate);

    // Validate date format
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use YYYY-MM-DD format.'
      );
    }

    // Validate date range
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be before or equal to end date.'
      );
    }

    // Validate date range is not too far in the past (more than 5 years)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (startDate < fiveYearsAgo) {
      throw new BadRequestException(
        'Date range cannot be more than 5 years in the past.'
      );
    }

    // Validate date range is not in the future (beyond 2 years)
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (endDate > twoYearsFromNow) {
      throw new BadRequestException(
        'End date cannot be more than 2 years in the future.'
      );
    }

    // Validate maximum date range (not more than 3 years)
    const maxRangeMs = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      throw new BadRequestException('Date range cannot exceed 3 years.');
    }

    return { startDate, endDate };
  }

  /**
   * Validate organization access and permissions
   */
  protected async validateOrganizationAccess(
    userId: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Check if organization exists and user has access
      const hasAccess =
        await this.baseAnalyticsService.validateOrganizationAccess(
          organizationId
        );

      if (!hasAccess) {
        throw new ForbiddenException(
          'Access denied to organization analytics.'
        );
      }

      this.logger.debug(
        `User ${userId} validated for organization ${organizationId}`
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Failed to validate organization access: ${error.message}`
      );
      throw new ForbiddenException('Unable to validate organization access.');
    }
  }

  /**
   * Check data sufficiency for analytics
   */
  protected async checkDataSufficiency(
    organizationId: string,
    dateRange: DateRange,
    analyticsType: string
  ): Promise<void> {
    try {
      const sufficiency = await this.baseAnalyticsService.checkDataSufficiency(
        organizationId,
        dateRange
      );

      if (!sufficiency.sufficient) {
        const errorMessage = `Insufficient data for ${analyticsType} analytics: ${sufficiency.issues.join(', ')}`;
        const suggestions = sufficiency.recommendations;

        throw new BadRequestException({
          message: errorMessage,
          code: 'INSUFFICIENT_DATA',
          suggestions,
          details: {
            issues: sufficiency.issues,
            recommendations: sufficiency.recommendations,
          },
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to check data sufficiency: ${error.message}`);
      throw new BadRequestException(
        'Unable to validate data sufficiency for analytics.'
      );
    }
  }

  /**
   * Get cached analytics data or execute function if not cached
   */
  protected async getCachedOrExecute<T>(
    organizationId: string,
    cacheKey: string,
    analyticsType: string,
    executeFn: () => Promise<T>
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.cacheService.getCachedData<T>(
        organizationId,
        cacheKey
      );

      if (cached) {
        this.logger.debug(`Cache hit for ${analyticsType}: ${cacheKey}`);
        return cached;
      }

      // Execute function and cache result
      this.logger.debug(
        `Cache miss for ${analyticsType}: ${cacheKey}, executing function`
      );
      const result = await executeFn();

      // Cache the result (fire and forget)
      this.cacheService
        .setCachedData(organizationId, cacheKey, result, analyticsType)
        .catch(error => {
          this.logger.warn(
            `Failed to cache result for ${cacheKey}: ${error.message}`
          );
        });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get cached or execute for ${analyticsType}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Create standardized analytics response
   */
  protected createAnalyticsResponse<T>(
    data: T,
    organizationId: string,
    dateRange: DateRange,
    cacheKey?: string,
    insights?: AnalyticsInsight[]
  ): AnalyticsResponse<T> {
    const now = new Date();

    return {
      data,
      metadata: {
        organizationId,
        dateRange,
        generatedAt: now,
        cacheKey,
        expiresAt: cacheKey
          ? new Date(now.getTime() + 30 * 60 * 1000)
          : undefined, // 30 minutes default
      },
      insights,
    };
  }

  /**
   * Handle analytics errors with proper logging and user-friendly messages
   */
  protected handleAnalyticsError(
    error: unknown,
    analyticsType: string,
    organizationId: string
  ): never {
    this.logger.error(
      `Analytics error for ${analyticsType} in organization ${organizationId}: ${error.message}`,
      error.stack
    );

    // Handle specific error types
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }

    // Handle database errors
    if (error.code === 'P2002') {
      // Prisma unique constraint error
      throw new BadRequestException(
        'Data conflict detected. Please try again.'
      );
    }

    if (error.code === 'P2025') {
      // Prisma record not found error
      throw new BadRequestException(
        'Required data not found for analytics calculation.'
      );
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      throw new BadRequestException(
        'Analytics calculation timed out. Please try with a smaller date range.'
      );
    }

    // Generic error handling
    throw new BadRequestException({
      message: `Failed to generate ${analyticsType} analytics. Please try again later.`,
      code: 'ANALYTICS_ERROR',
      suggestions: [
        'Try reducing the date range',
        'Ensure sufficient data exists for the selected period',
        'Contact support if the problem persists',
      ],
    });
  }

  /**
   * Validate query parameters
   */
  protected validateQuery(query: AnalyticsQueryDto): void {
    // Validate metrics array
    if (query.metrics && query.metrics.length > 20) {
      throw new BadRequestException(
        'Too many metrics requested. Maximum 20 metrics allowed.'
      );
    }

    // Validate filters
    if (query.filters) {
      const filterKeys = Object.keys(query.filters);
      if (filterKeys.length > 10) {
        throw new BadRequestException(
          'Too many filters. Maximum 10 filters allowed.'
        );
      }

      // Validate filter values
      filterKeys.forEach(key => {
        const value = query.filters![key];
        if (typeof value === 'string' && value.length > 100) {
          throw new BadRequestException(
            `Filter value for '${key}' is too long. Maximum 100 characters.`
          );
        }
      });
    }
  }

  /**
   * Get standard date ranges for quick access
   */
  protected getStandardDateRanges(): Record<string, DateRange> {
    return this.baseAnalyticsService.getStandardDateRanges();
  }

  /**
   * Format currency amounts for Zambian context
   */
  protected formatZMW(amount: number): string {
    return this.baseAnalyticsService.formatZMW(amount);
  }

  /**
   * Format percentage values
   */
  protected formatPercentage(value: number, decimals: number = 1): string {
    return this.baseAnalyticsService.formatPercentage(value, decimals);
  }

  /**
   * Calculate percentage change between periods
   */
  protected calculatePercentageChange(
    current: number,
    previous: number
  ): number {
    return this.baseAnalyticsService.calculatePercentageChange(
      current,
      previous
    );
  }

  /**
   * Log analytics request for monitoring
   */
  protected logAnalyticsRequest(
    analyticsType: string,
    organizationId: string,
    userId: string,
    dateRange: DateRange,
    additionalParams?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  ): void {
    this.logger.log(
      `Analytics request: ${analyticsType} | Org: ${organizationId} | User: ${userId} | ` +
        `Range: ${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}${ 
        additionalParams
          ? ` | Params: ${JSON.stringify(additionalParams)}`
          : ''}`
    );
  }

  /**
   * Validate business hours for real-time analytics (Zambian timezone)
   */
  protected isBusinessHours(): boolean {
    const now = new Date();
    const zambianTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Africa/Lusaka' })
    );
    const hour = zambianTime.getHours();
    const day = zambianTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Business hours: Monday-Friday 8 AM to 6 PM, Saturday 8 AM to 2 PM
    if (day >= 1 && day <= 5) {
      // Monday to Friday
      return hour >= 8 && hour < 18;
    } else if (day === 6) {
      // Saturday
      return hour >= 8 && hour < 14;
    }

    return false; // Sunday or outside business hours
  }

  /**
   * Get cache TTL based on business hours and analytics type
   */
  protected getCacheTTL(analyticsType: string): number {
    const baseTTL = {
      FORECASTING: 3600,
      TRENDS: 1800,
      RATIOS: 7200,
      TAX_ANALYTICS: 3600,
      PROFITABILITY: 1800,
    };

    const ttl = baseTTL[analyticsType as keyof typeof baseTTL] || 1800;

    // Extend cache during non-business hours
    return this.isBusinessHours() ? ttl : ttl * 2;
  }
}
