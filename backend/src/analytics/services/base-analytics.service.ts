import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DateRange, AnalyticsConfiguration } from '../interfaces/analytics-data.interface';

/**
 * Base Analytics Service
 * 
 * Provides common utilities and functionality for all analytics services.
 * Handles multi-tenant data isolation, date calculations, and Zambian business context.
 * 
 * Features:
 * - Multi-tenant data isolation
 * - Date range utilities for Zambian business cycles
 * - Common analytics calculations
 * - Performance optimization helpers
 * - Zambian currency and formatting utilities
 */
@Injectable()
export class BaseAnalyticsService {
  protected readonly logger = new Logger(BaseAnalyticsService.name);

  constructor(protected readonly databaseService: DatabaseService) {}

  // ============================================================================
  // DATE UTILITIES
  // ============================================================================

  /**
   * Get standard date ranges for Zambian business context
   */
  getStandardDateRanges(): Record<string, DateRange> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return {
      // Current periods
      thisMonth: {
        startDate: new Date(currentYear, currentMonth, 1),
        endDate: new Date(currentYear, currentMonth + 1, 0)
      },
      thisQuarter: this.getCurrentQuarter(),
      thisYear: {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31)
      },

      // Previous periods
      lastMonth: {
        startDate: new Date(currentYear, currentMonth - 1, 1),
        endDate: new Date(currentYear, currentMonth, 0)
      },
      lastQuarter: this.getPreviousQuarter(),
      lastYear: {
        startDate: new Date(currentYear - 1, 0, 1),
        endDate: new Date(currentYear - 1, 11, 31)
      },

      // Rolling periods
      last30Days: {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      },
      last90Days: {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: now
      },
      last12Months: {
        startDate: new Date(currentYear - 1, currentMonth, 1),
        endDate: now
      },

      // Zambian fiscal year (January to December)
      fiscalYear: {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31)
      },
      previousFiscalYear: {
        startDate: new Date(currentYear - 1, 0, 1),
        endDate: new Date(currentYear - 1, 11, 31)
      }
    };
  }

  /**
   * Get current quarter based on Zambian business calendar
   */
  private getCurrentQuarter(): DateRange {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const quarter = Math.floor(currentMonth / 3);

    return {
      startDate: new Date(currentYear, quarter * 3, 1),
      endDate: new Date(currentYear, (quarter + 1) * 3, 0)
    };
  }

  /**
   * Get previous quarter
   */
  private getPreviousQuarter(): DateRange {
    const current = this.getCurrentQuarter();
    const prevQuarterStart = new Date(current.startDate);
    prevQuarterStart.setMonth(prevQuarterStart.getMonth() - 3);
    
    const prevQuarterEnd = new Date(current.startDate);
    prevQuarterEnd.setDate(prevQuarterEnd.getDate() - 1);

    return {
      startDate: prevQuarterStart,
      endDate: prevQuarterEnd
    };
  }

  /**
   * Split date range into periods for trend analysis
   */
  splitDateRangeIntoPeriods(
    dateRange: DateRange,
    periodType: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH'
  ): DateRange[] {
    const periods: DateRange[] = [];
    const current = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    while (current <= end) {
      const periodStart = new Date(current);
      let periodEnd: Date;

      switch (periodType) {
        case 'DAY':
          periodEnd = new Date(current);
          current.setDate(current.getDate() + 1);
          break;
        case 'WEEK':
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6);
          current.setDate(current.getDate() + 7);
          break;
        case 'MONTH':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          current.setMonth(current.getMonth() + 1);
          break;
        case 'QUARTER':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);
          current.setMonth(current.getMonth() + 3);
          break;
      }

      // Ensure we don't exceed the end date
      if (periodEnd > end) {
        periodEnd = new Date(end);
      }

      periods.push({ startDate: periodStart, endDate: periodEnd });

      if (periodEnd >= end) break;
    }

    return periods;
  }

  /**
   * Check if date falls within Zambian seasonal patterns
   */
  getZambianSeason(date: Date): 'DRY_SEASON' | 'RAINY_SEASON' | 'TRANSITION' {
    const month = date.getMonth() + 1; // 1-based month

    if (month >= 5 && month <= 9) {
      return 'DRY_SEASON'; // May to September
    } else if (month >= 11 || month <= 3) {
      return 'RAINY_SEASON'; // November to March
    } else {
      return 'TRANSITION'; // April and October
    }
  }

  // ============================================================================
  // CALCULATION UTILITIES
  // ============================================================================

  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const subset = values.slice(start, i + 1);
      const average = subset.reduce((sum, val) => sum + val, 0) / subset.length;
      result.push(average);
    }

    return result;
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate correlation coefficient between two datasets
   */
  calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // ============================================================================
  // CURRENCY AND FORMATTING
  // ============================================================================

  /**
   * Format amount in Zambian Kwacha
   */
  formatZMW(amount: number): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format large numbers with appropriate suffixes
   */
  formatLargeNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Get analytics configuration for organization
   */
  async getAnalyticsConfiguration(
    organizationId: string,
    analyticsType: string
  ): Promise<AnalyticsConfiguration | null> {
    try {
      const config = await this.databaseService.analyticsConfiguration.findFirst({
        where: {
          organizationId,
          analyticsType,
          isActive: true
        }
      });

      if (!config) {
        return null;
      }

      return {
        organizationId: config.organizationId,
        type: config.analyticsType as any,
        settings: config.configuration as Record<string, any>,
        isActive: config.isActive,
        lastUpdated: config.updatedAt
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics configuration: ${error.message}`);
      return null;
    }
  }

  /**
   * Save analytics configuration
   */
  async saveAnalyticsConfiguration(config: AnalyticsConfiguration): Promise<void> {
    try {
      await this.databaseService.analyticsConfiguration.upsert({
        where: {
          organizationId_analyticsType: {
            organizationId: config.organizationId,
            analyticsType: config.type
          }
        },
        update: {
          configuration: config.settings,
          isActive: config.isActive
        },
        create: {
          organizationId: config.organizationId,
          analyticsType: config.type,
          configuration: config.settings,
          isActive: config.isActive
        }
      });
    } catch (error) {
      this.logger.error(`Failed to save analytics configuration: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  /**
   * Validate date range
   */
  validateDateRange(dateRange: DateRange): boolean {
    return dateRange.startDate <= dateRange.endDate;
  }

  /**
   * Validate organization access
   */
  async validateOrganizationAccess(organizationId: string): Promise<boolean> {
    try {
      const organization = await this.databaseService.organization.findUnique({
        where: { id: organizationId }
      });
      return !!organization;
    } catch (error) {
      this.logger.error(`Failed to validate organization access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get minimum data requirements for analytics
   */
  getMinimumDataRequirements(): {
    minimumInvoices: number;
    minimumExpenses: number;
    minimumPeriodDays: number;
  } {
    return {
      minimumInvoices: 5,
      minimumExpenses: 10,
      minimumPeriodDays: 30
    };
  }

  /**
   * Check if organization has sufficient data for analytics
   */
  async checkDataSufficiency(
    organizationId: string,
    dateRange: DateRange
  ): Promise<{
    sufficient: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const requirements = this.getMinimumDataRequirements();
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check invoice count
      const invoiceCount = await this.databaseService.invoice.count({
        where: {
          organizationId,
          issueDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      });

      if (invoiceCount < requirements.minimumInvoices) {
        issues.push(`Insufficient invoices (${invoiceCount}/${requirements.minimumInvoices})`);
        recommendations.push('Create more invoices to improve forecast accuracy');
      }

      // Check expense count
      const expenseCount = await this.databaseService.expense.count({
        where: {
          organizationId,
          expenseDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      });

      if (expenseCount < requirements.minimumExpenses) {
        issues.push(`Insufficient expenses (${expenseCount}/${requirements.minimumExpenses})`);
        recommendations.push('Record more expenses for better trend analysis');
      }

      // Check period length
      const periodDays = Math.floor(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (periodDays < requirements.minimumPeriodDays) {
        issues.push(`Period too short (${periodDays}/${requirements.minimumPeriodDays} days)`);
        recommendations.push('Use a longer period for more reliable analytics');
      }

      return {
        sufficient: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error(`Failed to check data sufficiency: ${error.message}`);
      return {
        sufficient: false,
        issues: ['Failed to validate data sufficiency'],
        recommendations: ['Please try again later']
      };
    }
  }
}
