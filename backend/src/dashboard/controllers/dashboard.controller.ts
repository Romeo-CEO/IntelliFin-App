import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { DashboardConfigurationService } from '../services/dashboard-configuration.service';
import { WidgetManagementService } from '../services/widget-management.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UpdateWidgetPositionDto,
  BulkUpdatePositionsDto,
  DashboardResponseDto,
  WidgetResponseDto,
} from '../dto/dashboard.dto';

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboards')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardConfigurationService,
    private readonly widgetService: WidgetManagementService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Create dashboard',
    description: 'Create a new dashboard with customizable layout and settings',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dashboard created successfully',
    type: DashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid dashboard data provided',
  })
  async createDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createDashboardDto: CreateDashboardDto,
  ) {
    return await this.dashboardService.createDashboard(
      user.organizationId,
      user.id,
      createDashboardDto,
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get dashboards',
    description: 'Get all dashboards accessible to the current user',
  })
  @ApiQuery({
    name: 'includePrivate',
    required: false,
    type: Boolean,
    description: 'Include private dashboards (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboards retrieved successfully',
    type: [DashboardResponseDto],
  })
  async getDashboards(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includePrivate') includePrivate?: boolean,
  ) {
    return await this.dashboardService.getDashboards(
      user.organizationId,
      user.id,
      includePrivate,
    );
  }

  @Get('default')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get default dashboard',
    description: 'Get the default dashboard for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default dashboard retrieved successfully',
    type: DashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No default dashboard found',
  })
  async getDefaultDashboard(@CurrentUser() user: AuthenticatedUser) {
    return await this.dashboardService.getDefaultDashboard(user.organizationId);
  }

  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get dashboard by ID',
    description: 'Get a specific dashboard with all its widgets',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard retrieved successfully',
    type: DashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dashboard not found or access denied',
  })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.dashboardService.getDashboard(id, user.organizationId, user.id);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update dashboard',
    description: 'Update dashboard configuration and settings',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard updated successfully',
    type: DashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dashboard not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to edit dashboard',
  })
  async updateDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(ValidationPipe) updateDashboardDto: UpdateDashboardDto,
  ) {
    return await this.dashboardService.updateDashboard(
      id,
      user.organizationId,
      user.id,
      updateDashboardDto,
    );
  }

  @Put(':id/layout')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Update dashboard layout',
    description: 'Update the grid layout configuration of a dashboard',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard layout updated successfully',
    type: DashboardResponseDto,
  })
  async updateDashboardLayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() layout: any,
  ) {
    return await this.dashboardService.updateLayout(
      id,
      user.organizationId,
      user.id,
      layout,
    );
  }

  @Put(':id/default')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Set as default dashboard',
    description: 'Set this dashboard as the default for the organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard set as default successfully',
    type: DashboardResponseDto,
  })
  async setAsDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.dashboardService.setAsDefault(id, user.organizationId, user.id);
  }

  @Post(':id/duplicate')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({
    summary: 'Duplicate dashboard',
    description: 'Create a copy of an existing dashboard',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID to duplicate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dashboard duplicated successfully',
    type: DashboardResponseDto,
  })
  async duplicateDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name?: string },
  ) {
    return await this.dashboardService.duplicateDashboard(
      id,
      user.organizationId,
      user.id,
      body.name,
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete dashboard',
    description: 'Delete a dashboard and all its widgets',
  })
  @ApiParam({
    name: 'id',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dashboard deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dashboard not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to delete dashboard',
  })
  async deleteDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.dashboardService.deleteDashboard(id, user.organizationId, user.id);
  }

  // Widget endpoints
  @Post(':dashboardId/widgets')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create widget',
    description: 'Add a new widget to a dashboard',
  })
  @ApiParam({
    name: 'dashboardId',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Widget created successfully',
    type: WidgetResponseDto,
  })
  async createWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Body(ValidationPipe) createWidgetDto: CreateWidgetDto,
  ) {
    return await this.widgetService.createWidget(dashboardId, user.id, createWidgetDto);
  }

  @Get(':dashboardId/widgets')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get dashboard widgets',
    description: 'Get all widgets for a specific dashboard',
  })
  @ApiParam({
    name: 'dashboardId',
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'includeHidden',
    required: false,
    type: Boolean,
    description: 'Include hidden widgets',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Widgets retrieved successfully',
    type: [WidgetResponseDto],
  })
  async getWidgets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Query('includeHidden') includeHidden?: boolean,
  ) {
    return await this.widgetService.getWidgets(dashboardId, user.id, includeHidden);
  }
}
