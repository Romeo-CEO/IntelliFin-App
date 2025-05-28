import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { DashboardDataService } from '../services/dashboard-data.service';
import { WidgetDataService } from '../services/widget-data.service';

/**
 * Dashboard Data Controller
 * Provides aggregated data endpoints for dashboard widgets
 * Optimized for Zambian SME requirements with low-bandwidth considerations
 */
@ApiTags('Dashboard Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard-data')
export class DashboardDataController {
  private readonly logger = new Logger(DashboardDataController.name);

  constructor(
    private readonly dashboardDataService: DashboardDataService,
    private readonly widgetDataService: WidgetDataService,
  ) {}

  @Get('overview')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get dashboard overview data',
    description: 'Get aggregated financial overview data for dashboard display',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'quarter', 'year'],
    description: 'Time period for data aggregation',
  })
  @ApiQuery({
    name: 'includeComparison',
    required: false,
    type: Boolean,
    description: 'Include period-over-period comparison',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard overview data retrieved successfully',
  })
  async getDashboardOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: string = 'month',
    @Query('includeComparison') includeComparison: boolean = true,
  ) {
    try {
      const data = await this.dashboardDataService.getDashboardOverview(
        user.organizationId,
        period,
        includeComparison,
      );

      this.logger.log(`Dashboard overview data retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get dashboard overview: ${error.message}`, error);
      throw error;
    }
  }

  @Get('kpis')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get KPI metrics',
    description: 'Get key performance indicators for dashboard widgets',
  })
  @ApiQuery({
    name: 'metrics',
    required: false,
    type: String,
    description: 'Comma-separated list of specific metrics to retrieve',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KPI metrics retrieved successfully',
  })
  async getKpiMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('metrics') metrics?: string,
  ) {
    try {
      const requestedMetrics = metrics ? metrics.split(',') : undefined;
      const data = await this.dashboardDataService.getKpiMetrics(
        user.organizationId,
        requestedMetrics,
      );

      this.logger.log(`KPI metrics retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get KPI metrics: ${error.message}`, error);
      throw error;
    }
  }

  @Get('financial-summary')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get financial summary',
    description: 'Get comprehensive financial summary for dashboard display',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['month', 'quarter', 'year'],
    description: 'Time period for financial summary',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial summary retrieved successfully',
  })
  async getFinancialSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: string = 'month',
  ) {
    try {
      const data = await this.dashboardDataService.getFinancialSummary(
        user.organizationId,
        period,
      );

      this.logger.log(`Financial summary retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get financial summary: ${error.message}`, error);
      throw error;
    }
  }

  @Get('widget/:widgetId/data')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get widget data',
    description: 'Get specific data for a dashboard widget',
  })
  @ApiParam({
    name: 'widgetId',
    description: 'Widget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force refresh widget data (bypass cache)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Widget data retrieved successfully',
  })
  async getWidgetData(
    @CurrentUser() user: AuthenticatedUser,
    @Param('widgetId') widgetId: string,
    @Query('refresh') refresh: boolean = false,
  ) {
    try {
      const data = await this.widgetDataService.getWidgetData(
        widgetId,
        user.organizationId,
        refresh,
      );

      this.logger.log(`Widget data retrieved for widget: ${widgetId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get widget data: ${error.message}`, error);
      throw error;
    }
  }

  @Get('analytics-summary')
  @Throttle({ default: { limit: 15, ttl: 60000 } }) // 15 requests per minute
  @ApiOperation({
    summary: 'Get analytics summary',
    description: 'Get enhanced analytics summary from Step 19 analytics engines',
  })
  @ApiQuery({
    name: 'includeForecasts',
    required: false,
    type: Boolean,
    description: 'Include revenue and expense forecasts',
  })
  @ApiQuery({
    name: 'includeAnomalies',
    required: false,
    type: Boolean,
    description: 'Include anomaly detection results',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics summary retrieved successfully',
  })
  async getAnalyticsSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeForecasts') includeForecasts: boolean = true,
    @Query('includeAnomalies') includeAnomalies: boolean = true,
  ) {
    try {
      const data = await this.dashboardDataService.getAnalyticsSummary(
        user.organizationId,
        includeForecasts,
        includeAnomalies,
      );

      this.logger.log(`Analytics summary retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get analytics summary: ${error.message}`, error);
      throw error;
    }
  }

  @Get('zambian-compliance')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get Zambian compliance summary',
    description: 'Get ZRA compliance status and tax-related metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zambian compliance summary retrieved successfully',
  })
  async getZambianComplianceSummary(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      const data = await this.dashboardDataService.getZambianComplianceSummary(
        user.organizationId,
      );

      this.logger.log(`Zambian compliance summary retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get Zambian compliance summary: ${error.message}`, error);
      throw error;
    }
  }

  @Get('mobile-money-summary')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get mobile money summary',
    description: 'Get mobile money transaction summary and metrics',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['airtel', 'mtn', 'zamtel', 'all'],
    description: 'Mobile money provider filter',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mobile money summary retrieved successfully',
  })
  async getMobileMoneySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('provider') provider: string = 'all',
  ) {
    try {
      const data = await this.dashboardDataService.getMobileMoneySummary(
        user.organizationId,
        provider,
      );

      this.logger.log(`Mobile money summary retrieved for organization: ${user.organizationId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get mobile money summary: ${error.message}`, error);
      throw error;
    }
  }
}
