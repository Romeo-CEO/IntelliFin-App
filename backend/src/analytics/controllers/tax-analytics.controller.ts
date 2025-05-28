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
import { 
  TaxAnalyticsQueryDto,
  TaxOptimizationDto,
  AnalyticsResponseDto,
  AnalyticsErrorDto 
} from '../dto/analytics-query.dto';
import { UserRole } from '@prisma/client';

/**
 * Tax Analytics Controller
 * 
 * Provides comprehensive tax analytics and optimization for Zambian SMEs
 * with ZRA compliance insights, tax liability tracking, and optimization strategies.
 * 
 * Features:
 * - VAT liability tracking and optimization
 * - Withholding tax analysis and certificate management
 * - Tax compliance scoring and risk assessment
 * - ZRA deadline tracking and calendar management
 * - Tax optimization recommendations
 * - Integration with existing tax management system (Step 17)
 */
@Controller('analytics/tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Tax Analytics')
export class TaxAnalyticsController extends BaseAnalyticsController {
  constructor(
    baseAnalyticsService: BaseAnalyticsService,
    cacheService: AnalyticsCacheService,
    private readonly aggregationService: AnalyticsAggregationService
  ) {
    super(baseAnalyticsService, cacheService);
  }

  /**
   * Get tax liability analysis
   */
  @Get('liability')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Analyze tax liability',
    description: 'Provides comprehensive tax liability analysis with VAT and withholding tax breakdown'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax liability analysis completed successfully',
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
    name: 'taxTypes',
    description: 'Specific tax types to analyze',
    required: false,
    example: ['VAT', 'WITHHOLDING_TAX']
  })
  async getTaxLiabilityAnalysis(
    @Query() query: TaxAnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('TAX_LIABILITY', organizationId, userId, 
        this.validateDateRange(query.dateRange), { taxTypes: query.taxTypes });

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Validate query parameters
      this.validateQuery(query);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'TAX_LIABILITY',
        dateRange,
        { taxTypes: query.taxTypes || [] }
      );

      // Get cached or execute tax liability analysis
      const liabilityData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TAX_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Analyze tax liability
          return this.analyzeTaxLiability(financialData, query);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        liabilityData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'TAX_LIABILITY', organizationId);
    }
  }

  /**
   * Get tax optimization recommendations
   */
  @Get('optimization')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get tax optimization recommendations',
    description: 'Provides actionable tax optimization strategies for Zambian tax regulations'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax optimization recommendations generated successfully',
    type: AnalyticsResponseDto
  })
  async getTaxOptimization(
    @Query() query: TaxAnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<TaxOptimizationDto>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('TAX_OPTIMIZATION', organizationId, userId, 
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'TAX_OPTIMIZATION',
        dateRange
      );

      // Get cached or execute optimization analysis
      const optimizationData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TAX_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Generate tax optimization recommendations
          return this.generateTaxOptimizationRecommendations(financialData);
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
      this.handleAnalyticsError(error, 'TAX_OPTIMIZATION', organizationId);
    }
  }

  /**
   * Get tax compliance score
   */
  @Get('compliance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get tax compliance score',
    description: 'Provides tax compliance scoring and risk assessment for ZRA requirements'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax compliance score calculated successfully',
    type: AnalyticsResponseDto
  })
  async getTaxComplianceScore(
    @Query() query: TaxAnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('TAX_COMPLIANCE', organizationId, userId, 
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'TAX_COMPLIANCE',
        dateRange
      );

      // Get cached or execute compliance analysis
      const complianceData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TAX_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Calculate compliance score
          return this.calculateTaxComplianceScore(financialData);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        complianceData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'TAX_COMPLIANCE', organizationId);
    }
  }

  /**
   * Get tax calendar and deadlines
   */
  @Get('calendar')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Get tax calendar and upcoming deadlines',
    description: 'Provides tax calendar with ZRA deadlines and filing requirements'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax calendar generated successfully',
    type: AnalyticsResponseDto
  })
  async getTaxCalendar(
    @Query() query: TaxAnalyticsQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentOrganization('id') organizationId: string
  ): Promise<AnalyticsResponseDto<any>> {
    try {
      // Log analytics request
      this.logAnalyticsRequest('TAX_CALENDAR', organizationId, userId, 
        this.validateDateRange(query.dateRange));

      // Validate organization access
      await this.validateOrganizationAccess(userId, organizationId);

      // Validate date range
      const dateRange = this.validateDateRange(query.dateRange);

      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(
        organizationId,
        'TAX_CALENDAR',
        dateRange
      );

      // Get cached or execute calendar generation
      const calendarData = await this.getCachedOrExecute(
        organizationId,
        cacheKey,
        'TAX_ANALYTICS',
        async () => {
          // Get aggregated financial data
          const financialData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            dateRange
          );

          // Generate tax calendar
          return this.generateTaxCalendar(financialData);
        }
      );

      // Create response
      return this.createAnalyticsResponse(
        calendarData,
        organizationId,
        dateRange,
        cacheKey
      );

    } catch (error) {
      this.handleAnalyticsError(error, 'TAX_CALENDAR', organizationId);
    }
  }

  /**
   * Analyze tax liability with breakdown by type
   */
  private async analyzeTaxLiability(financialData: any, query: TaxAnalyticsQueryDto): Promise<any> {
    const invoices = financialData.invoices;
    const payments = financialData.payments;
    const taxData = financialData.taxes;

    // Calculate VAT liability
    const vatLiability = invoices.reduce((sum: number, invoice: any) => 
      sum + invoice.vatAmount, 0
    );

    // Calculate withholding tax
    const withholdingTax = payments.reduce((sum: number, payment: any) => 
      sum + payment.withholdingTaxAmount, 0
    );

    // Calculate total tax obligations
    const totalObligations = taxData.obligations.reduce((sum: number, obligation: any) => 
      sum + obligation.amount, 0
    );

    // Calculate penalties
    const totalPenalties = taxData.obligations.reduce((sum: number, obligation: any) => 
      sum + obligation.penaltyAmount, 0
    );

    // Tax breakdown by type
    const taxBreakdown = {
      VAT: {
        liability: vatLiability,
        percentage: totalObligations > 0 ? (vatLiability / totalObligations) * 100 : 0,
        status: 'CURRENT' // Would be calculated based on payment status
      },
      WITHHOLDING_TAX: {
        liability: withholdingTax,
        percentage: totalObligations > 0 ? (withholdingTax / totalObligations) * 100 : 0,
        status: 'CURRENT'
      }
    };

    return {
      summary: {
        totalLiability: totalObligations,
        vatLiability,
        withholdingTax,
        totalPenalties,
        netLiability: totalObligations + totalPenalties
      },
      breakdown: taxBreakdown,
      obligations: taxData.obligations.map((obligation: any) => ({
        ...obligation,
        daysUntilDue: Math.ceil((obligation.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        isOverdue: obligation.dueDate < new Date()
      })),
      insights: this.generateTaxLiabilityInsights(vatLiability, withholdingTax, totalPenalties)
    };
  }

  /**
   * Generate tax optimization recommendations
   */
  private async generateTaxOptimizationRecommendations(financialData: any): Promise<TaxOptimizationDto> {
    const liabilityAnalysis = await this.analyzeTaxLiability(financialData, {});
    const currentLiability = liabilityAnalysis.summary.totalLiability;
    
    // Generate optimization strategies
    const strategies = [];

    // Strategy 1: VAT optimization
    if (liabilityAnalysis.summary.vatLiability > 0) {
      strategies.push({
        strategy: 'VAT Input Credit Optimization',
        description: 'Ensure all eligible VAT input credits are claimed',
        potentialSaving: liabilityAnalysis.summary.vatLiability * 0.05, // 5% potential saving
        implementationComplexity: 'LOW' as const,
        riskLevel: 'LOW' as const,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });
    }

    // Strategy 2: Timing optimization
    strategies.push({
      strategy: 'Payment Timing Optimization',
      description: 'Optimize payment timing to manage cash flow while avoiding penalties',
      potentialSaving: currentLiability * 0.02, // 2% potential saving
      implementationComplexity: 'MEDIUM' as const,
      riskLevel: 'LOW' as const
    });

    // Strategy 3: Expense deduction optimization
    strategies.push({
      strategy: 'Expense Deduction Maximization',
      description: 'Review and maximize allowable business expense deductions',
      potentialSaving: currentLiability * 0.1, // 10% potential saving
      implementationComplexity: 'MEDIUM' as const,
      riskLevel: 'LOW' as const
    });

    const totalPotentialSaving = strategies.reduce((sum, strategy) => sum + strategy.potentialSaving, 0);
    const optimizedLiability = currentLiability - totalPotentialSaving;

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(financialData);

    return {
      currentLiability,
      optimizedLiability,
      potentialSavings: totalPotentialSaving,
      strategies,
      riskLevel: complianceScore > 80 ? 'LOW' : complianceScore > 60 ? 'MEDIUM' : 'HIGH',
      complianceScore
    };
  }

  /**
   * Calculate tax compliance score
   */
  private async calculateTaxComplianceScore(financialData: any): Promise<any> {
    const taxData = financialData.taxes;
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for overdue obligations
    const overdueObligations = taxData.obligations.filter((obligation: any) => 
      obligation.dueDate < new Date() && obligation.status !== 'PAID'
    );

    if (overdueObligations.length > 0) {
      score -= overdueObligations.length * 10;
      issues.push(`${overdueObligations.length} overdue tax obligations`);
      recommendations.push('Pay overdue tax obligations immediately to avoid penalties');
    }

    // Check for penalties
    const totalPenalties = taxData.obligations.reduce((sum: number, obligation: any) => 
      sum + obligation.penaltyAmount, 0
    );

    if (totalPenalties > 0) {
      score -= 15;
      issues.push('Tax penalties incurred');
      recommendations.push('Review tax payment processes to avoid future penalties');
    }

    // Check filing status
    const pendingFilings = taxData.periods.filter((period: any) => 
      period.status === 'PENDING' && period.filingDeadline < new Date()
    );

    if (pendingFilings.length > 0) {
      score -= pendingFilings.length * 5;
      issues.push(`${pendingFilings.length} overdue tax filings`);
      recommendations.push('Complete overdue tax filings');
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      score,
      rating: score >= 90 ? 'EXCELLENT' : score >= 80 ? 'GOOD' : score >= 70 ? 'FAIR' : 'POOR',
      issues,
      recommendations,
      breakdown: {
        filingCompliance: pendingFilings.length === 0 ? 100 : Math.max(0, 100 - pendingFilings.length * 20),
        paymentCompliance: overdueObligations.length === 0 ? 100 : Math.max(0, 100 - overdueObligations.length * 25),
        penaltyAvoidance: totalPenalties === 0 ? 100 : 75
      }
    };
  }

  /**
   * Generate tax calendar with ZRA deadlines
   */
  private async generateTaxCalendar(financialData: any): Promise<any> {
    const taxData = financialData.taxes;
    const now = new Date();
    const nextThreeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Get upcoming deadlines
    const upcomingDeadlines = taxData.obligations
      .filter((obligation: any) => 
        obligation.dueDate >= now && obligation.dueDate <= nextThreeMonths
      )
      .map((obligation: any) => ({
        ...obligation,
        daysUntilDue: Math.ceil((obligation.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        urgency: obligation.dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'HIGH' : 
                obligation.dueDate.getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000 ? 'MEDIUM' : 'LOW'
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Generate standard ZRA calendar events
    const standardDeadlines = this.generateStandardZRADeadlines();

    return {
      upcomingDeadlines,
      standardDeadlines,
      summary: {
        totalUpcoming: upcomingDeadlines.length,
        highUrgency: upcomingDeadlines.filter(d => d.urgency === 'HIGH').length,
        mediumUrgency: upcomingDeadlines.filter(d => d.urgency === 'MEDIUM').length,
        totalAmount: upcomingDeadlines.reduce((sum, deadline) => sum + deadline.amount, 0)
      }
    };
  }

  /**
   * Generate standard ZRA deadlines
   */
  private generateStandardZRADeadlines(): any[] {
    const currentYear = new Date().getFullYear();
    
    return [
      {
        type: 'VAT_RETURN',
        description: 'Monthly VAT Return',
        frequency: 'MONTHLY',
        deadline: '18th of following month',
        nextDue: new Date(currentYear, new Date().getMonth() + 1, 18)
      },
      {
        type: 'PAYE_RETURN',
        description: 'PAYE Monthly Return',
        frequency: 'MONTHLY',
        deadline: '10th of following month',
        nextDue: new Date(currentYear, new Date().getMonth() + 1, 10)
      },
      {
        type: 'ANNUAL_RETURN',
        description: 'Annual Income Tax Return',
        frequency: 'ANNUALLY',
        deadline: 'June 30th',
        nextDue: new Date(currentYear + 1, 5, 30)
      }
    ];
  }

  /**
   * Calculate simple compliance score
   */
  private calculateComplianceScore(financialData: any): number {
    // Simplified compliance score calculation
    const taxData = financialData.taxes;
    const overdueCount = taxData.obligations.filter((o: any) => 
      o.dueDate < new Date() && o.status !== 'PAID'
    ).length;
    
    return Math.max(0, 100 - (overdueCount * 15));
  }

  /**
   * Generate tax liability insights
   */
  private generateTaxLiabilityInsights(vatLiability: number, withholdingTax: number, penalties: number): any[] {
    const insights: any[] = [];

    if (penalties > 0) {
      insights.push({
        type: 'WARNING',
        title: 'Tax penalties incurred',
        description: `${this.formatZMW(penalties)} in tax penalties`,
        recommendation: 'Review payment processes to avoid future penalties'
      });
    }

    if (vatLiability > withholdingTax * 2) {
      insights.push({
        type: 'INFO',
        title: 'VAT represents majority of tax liability',
        description: 'VAT is the largest component of tax obligations',
        recommendation: 'Ensure VAT input credits are properly claimed'
      });
    }

    return insights;
  }
}
