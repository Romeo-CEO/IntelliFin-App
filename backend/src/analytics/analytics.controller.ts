import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { AnalyticsQuery, AnalyticsService } from './analytics.service';

type RevenueForecastQuery = AnalyticsQuery & {
  periods?: number;
  confidence?: number;
  method?: 'linear' | 'exponential' | 'seasonal';
};

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('cash-flow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cash flow analytics',
    description:
      'Retrieve cash flow data with inflow, outflow, and net flow analysis for the organization',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Default period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group data by time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Cash flow analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              inflow: { type: 'number' },
              outflow: { type: 'number' },
              netFlow: { type: 'number' },
              cumulativeBalance: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalInflow: { type: 'number' },
            totalOutflow: { type: 'number' },
            netCashFlow: { type: 'number' },
            currentBalance: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCashFlowAnalytics(
    @GetUser() user: User,
    @Query() query: AnalyticsQuery
  ) {
    try {
      this.logger.log(
        `Getting cash flow analytics for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.getCashFlowAnalytics(
        user.tenantId,
        query
      );

      this.logger.log(
        `Cash flow analytics retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get cash flow analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('revenue-expenses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get revenue vs expenses analytics',
    description:
      'Retrieve revenue and expenses comparison data with profit analysis',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Default period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group data by time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue vs expenses analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              revenue: { type: 'number' },
              expenses: { type: 'number' },
              profit: { type: 'number' },
              profitMargin: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number' },
            totalExpenses: { type: 'number' },
            totalProfit: { type: 'number' },
            averageProfitMargin: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getRevenueExpensesAnalytics(
    @GetUser() user: User,
    @Query() query: AnalyticsQuery
  ) {
    try {
      this.logger.log(
        `Getting revenue vs expenses analytics for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.getRevenueExpensesAnalytics(
        user.tenantId,
        query
      );

      this.logger.log(
        `Revenue vs expenses analytics retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get revenue vs expenses analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('kpi-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get KPI summary metrics',
    description:
      'Retrieve comprehensive key performance indicators with trend analysis',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Default period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'KPI summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRevenue: { type: 'number' },
        totalExpenses: { type: 'number' },
        netProfit: { type: 'number' },
        profitMargin: { type: 'number' },
        cashBalance: { type: 'number' },
        accountsReceivable: { type: 'number' },
        averageInvoiceValue: { type: 'number' },
        paymentCycleTime: { type: 'number' },
        customerCount: { type: 'number' },
        invoiceCount: { type: 'number' },
        revenueTrend: { type: 'number' },
        expensesTrend: { type: 'number' },
        profitTrend: { type: 'number' },
        receivablesTrend: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getKpiSummary(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(`Getting KPI summary for organization: ${user.tenantId}`);

      const result = await this.analyticsService.getKpiSummary(
        user.tenantId,
        query
      );

      this.logger.log(
        `KPI summary retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get KPI summary: ${error.message}`, error);
      throw error;
    }
  }

  @Get('receivables-aging')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get accounts receivable aging analysis',
    description:
      'Retrieve accounts receivable aging data with risk analysis and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Receivables aging analysis retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        aging: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            thirtyDays: { type: 'number' },
            sixtyDays: { type: 'number' },
            ninetyDays: { type: 'number' },
            overNinety: { type: 'number' },
            total: { type: 'number' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  customerId: { type: 'string' },
                  customerName: { type: 'string' },
                  invoiceId: { type: 'string' },
                  invoiceNumber: { type: 'string' },
                  amount: { type: 'number' },
                  daysOverdue: { type: 'number' },
                  category: { type: 'string' },
                },
              },
            },
          },
        },
        insights: {
          type: 'object',
          properties: {
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            overduePercentage: { type: 'number' },
            averageDaysOverdue: { type: 'number' },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getReceivablesAging(@GetUser() user: User) {
    try {
      this.logger.log(
        `Getting receivables aging for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.getReceivablesAging(
        user.tenantId
      );

      this.logger.log(
        `Receivables aging retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get receivables aging: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // Step 19: Advanced Analytics Endpoints

  @Get('revenue-forecast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate revenue forecast',
    description:
      'Generate revenue forecast using time series analysis and machine learning algorithms',
  })
  @ApiQuery({
    name: 'periods',
    required: false,
    type: Number,
    description: 'Number of periods to forecast (default: 6)',
  })
  @ApiQuery({
    name: 'confidence',
    required: false,
    type: Number,
    description: 'Confidence level (0.8, 0.9, 0.95)',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['linear', 'exponential', 'seasonal'],
    description: 'Forecasting method',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue forecast generated successfully',
  })
  async getRevenueForecast(@GetUser() user: User, @Query() query: RevenueForecastQuery) {
    try {
      this.logger.log(
        `Getting revenue forecast for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.generateRevenueForecast(
        user.tenantId,
        query
      );

      this.logger.log(
        `Revenue forecast retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get revenue forecast: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('expense-trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze expense trends',
    description:
      'Analyze expense trends with anomaly detection and category-wise analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense trends analysis retrieved successfully',
  })
  async getExpenseTrends(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting expense trends for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.analyzeExpenseTrends(
        user.tenantId,
        query
      );

      this.logger.log(
        `Expense trends retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get expense trends: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('expense-anomalies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detect expense anomalies',
    description:
      'Detect unusual expense patterns and anomalies with alerts and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense anomalies detected successfully',
  })
  async getExpenseAnomalies(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Detecting expense anomalies for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.detectExpenseAnomalies(
        user.tenantId,
        query
      );

      this.logger.log(
        `Expense anomalies detected successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to detect expense anomalies: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('profitability-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze profitability',
    description:
      'Comprehensive profitability analysis for customers and products with insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Profitability analysis retrieved successfully',
  })
  async getProfitabilityAnalysis(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting profitability analysis for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.analyzeProfitability(
        user.tenantId,
        query
      );

      this.logger.log(
        `Profitability analysis retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get profitability analysis: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('profitability-trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze profitability trends',
    description:
      'Analyze profitability trends over time for customers and products',
  })
  @ApiResponse({
    status: 200,
    description: 'Profitability trends retrieved successfully',
  })
  async getProfitabilityTrends(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting profitability trends for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.analyzeProfitabilityTrends(
        user.tenantId,
        query
      );

      this.logger.log(
        `Profitability trends retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get profitability trends: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('tax-analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate tax analytics',
    description:
      'Generate comprehensive tax analytics with VAT and income tax calculations for Zambian compliance',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax analytics generated successfully',
  })
  async getTaxAnalytics(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting tax analytics for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.generateTaxAnalytics(
        user.tenantId,
        query
      );

      this.logger.log(
        `Tax analytics retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get tax analytics: ${error.message}`, error);
      throw error;
    }
  }

  @Get('tax-optimization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate tax optimization insights',
    description:
      'Generate tax optimization insights and recommendations for ZRA compliance',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax optimization insights generated successfully',
  })
  async getTaxOptimization(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting tax optimization insights for organization: ${user.tenantId}`
      );

      const result =
        await this.analyticsService.generateTaxOptimizationInsights(
          user.tenantId,
          query
        );

      this.logger.log(
        `Tax optimization insights retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get tax optimization insights: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('zra-compliance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze ZRA compliance',
    description:
      'Analyze ZRA compliance status with risk assessment and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'ZRA compliance analysis retrieved successfully',
  })
  async getZraCompliance(@GetUser() user: User) {
    try {
      this.logger.log(
        `Getting ZRA compliance analysis for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.analyzeZraCompliance(
        user.tenantId
      );

      this.logger.log(
        `ZRA compliance analysis retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get ZRA compliance analysis: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('business-health-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate business health score',
    description:
      'Calculate comprehensive business health score with component analysis and benchmarks',
  })
  @ApiResponse({
    status: 200,
    description: 'Business health score calculated successfully',
  })
  async getBusinessHealthScore(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting business health score for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.calculateBusinessHealthScore(
        user.tenantId,
        query
      );

      this.logger.log(
        `Business health score retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get business health score: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('financial-ratios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate financial ratios',
    description:
      'Calculate comprehensive financial ratios including liquidity, profitability, efficiency, and leverage ratios',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial ratios calculated successfully',
  })
  async getFinancialRatios(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting financial ratios for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.calculateFinancialRatios(
        user.tenantId,
        query
      );

      this.logger.log(
        `Financial ratios retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get financial ratios: ${error.message}`,
        error
      );
      throw error;
    }
  }

  @Get('health-score-components')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get health score components',
    description:
      'Get detailed health score components with metrics and insights for each category',
  })
  @ApiResponse({
    status: 200,
    description: 'Health score components retrieved successfully',
  })
  async getHealthScoreComponents(@GetUser() user: User, @Query() query: AnalyticsQuery) {
    try {
      this.logger.log(
        `Getting health score components for organization: ${user.tenantId}`
      );

      const result = await this.analyticsService.getHealthScoreComponents(
        user.tenantId,
        query
      );

      this.logger.log(
        `Health score components retrieved successfully for organization: ${user.tenantId}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get health score components: ${error.message}`,
        error
      );
      throw error;
    }
  }
}
