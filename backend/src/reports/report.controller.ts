import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { ReportService } from './report.service';
import {
  AccountsReceivableAgingDto,
  CashFlowDataDto,
  DashboardMetricsDto,
  DashboardQueryDto,
  ExpenseBreakdownDto,
  ExportFormat,
  FinancialMetricsDto,
  PeriodComparisonDto,
  ReportPeriod,
  ReportQueryDto,
  ReportType,
  RevenueBreakdownDto,
  VatReportDto,
} from './dto/report.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description: 'Get key financial metrics and analytics for the dashboard',
  })
  @ApiQuery({ type: DashboardQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard metrics retrieved successfully',
    type: DashboardMetricsDto,
  })
  async getDashboardMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    return await this.reportService.getDashboardMetrics(
      user.organizationId,
      query
    );
  }

  @Get('generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Generate a financial report',
    description:
      'Generate a specific type of financial report with optional export',
  })
  @ApiQuery({ type: ReportQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.values(ReportType) },
        period: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        generatedAt: { type: 'string', format: 'date-time' },
        data: {
          type: 'object',
          description: 'Report data varies by report type',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid report parameters',
  })
  async generateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: ReportQueryDto
  ) {
    return await this.reportService.generateReport(user.organizationId, query);
  }

  @Get('types')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get available report types',
    description: 'Get a list of all available report types with descriptions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report types retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: Object.values(ReportType) },
          name: { type: 'string', example: 'Financial Overview' },
          description: {
            type: 'string',
            example: 'Comprehensive overview of financial performance',
          },
        },
      },
    },
  })
  getAvailableReportTypes() {
    return this.reportService.getAvailableReportTypes();
  }

  @Get('financial-metrics')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get financial metrics',
    description: 'Get key financial metrics for a specific period',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for metrics',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'includeComparison',
    type: Boolean,
    required: false,
    description: 'Include comparison with previous period',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial metrics retrieved successfully',
    type: FinancialMetricsDto,
  })
  async getFinancialMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const dashboard = await this.reportService.getDashboardMetrics(
      user.organizationId,
      query
    );
    return dashboard.financialMetrics;
  }

  @Get('revenue-breakdown')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get revenue breakdown',
    description:
      'Get detailed revenue analysis by customer, time, and payment method',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue breakdown retrieved successfully',
    type: RevenueBreakdownDto,
  })
  async getRevenueBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const dashboard = await this.reportService.getDashboardMetrics(
      user.organizationId,
      query
    );
    return dashboard.revenueBreakdown;
  }

  @Get('expense-breakdown')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get expense breakdown',
    description:
      'Get detailed expense analysis by category, time, and payment method',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense breakdown retrieved successfully',
    type: ExpenseBreakdownDto,
  })
  async getExpenseBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type: string = ReportType.EXPENSE_BREAKDOWN,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const reportQuery: ReportQueryDto = {
      type: ReportType.EXPENSE_BREAKDOWN,
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
      includeComparison: query.includeComparison,
    };
    const report = await this.reportService.generateReport(
      user.organizationId,
      reportQuery
    );
    return report.data;
  }

  @Get('cash-flow')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get cash flow data',
    description:
      'Get cash flow analysis including historical and projected data',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for analysis',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cash flow data retrieved successfully',
    type: CashFlowDataDto,
  })
  async getCashFlowData(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const dashboard = await this.reportService.getDashboardMetrics(
      user.organizationId,
      query
    );
    return dashboard.cashFlow;
  }

  @Get('accounts-receivable')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get accounts receivable aging',
    description:
      'Get accounts receivable aging report showing overdue invoices',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Accounts receivable aging retrieved successfully',
    type: AccountsReceivableAgingDto,
  })
  async getAccountsReceivableAging(@CurrentUser() user: AuthenticatedUser) {
    const query: DashboardQueryDto = { period: ReportPeriod.THIS_MONTH };
    const dashboard = await this.reportService.getDashboardMetrics(
      user.organizationId,
      query
    );
    return dashboard.accountsReceivable;
  }

  @Get('vat-report')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get VAT report',
    description: 'Get VAT report for ZRA compliance and tax submission',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for VAT report',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'VAT report retrieved successfully',
    type: VatReportDto,
  })
  async getVatReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const reportQuery: ReportQueryDto = {
      type: ReportType.VAT_REPORT,
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    const report = await this.reportService.generateReport(
      user.organizationId,
      reportQuery
    );
    return report.data;
  }

  @Get('period-comparison')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get period comparison',
    description:
      'Get financial metrics comparison between current and previous period',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Predefined period for comparison',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Custom start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Custom end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Period comparison retrieved successfully',
    type: PeriodComparisonDto,
  })
  async getPeriodComparison(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: DashboardQueryDto
  ) {
    const queryWithComparison = { ...query, includeComparison: true };
    const dashboard = await this.reportService.getDashboardMetrics(
      user.organizationId,
      queryWithComparison
    );
    return dashboard.periodComparison;
  }
}
