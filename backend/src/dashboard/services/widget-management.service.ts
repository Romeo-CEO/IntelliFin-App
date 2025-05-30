import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DashboardPermissionType,
  DashboardWidget,
  WidgetType,
} from '@prisma/client';
import { DashboardWidgetRepository } from '../repositories/dashboard-widget.repository';
import { DashboardConfigurationRepository } from '../repositories/dashboard-configuration.repository';

/**
 * Service for widget management operations
 * Handles business logic for widget CRUD operations with validation
 */
@Injectable()
export class WidgetManagementService {
  private readonly logger = new Logger(WidgetManagementService.name);

  constructor(
    private readonly widgetRepository: DashboardWidgetRepository,
    private readonly dashboardRepository: DashboardConfigurationRepository
  ) {}

  /**
   * Create a new widget
   */
  async createWidget(
    dashboardId: string,
    userId: string,
    data: {
      widgetType: WidgetType;
      title: string;
      description?: string;
      position: any;
      configuration?: any;
      dataSource?: any;
      refreshInterval?: number;
    }
  ): Promise<DashboardWidget> {
    try {
      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to add widgets to this dashboard'
        );
      }

      // Validate widget data
      if (!data.title || data.title.trim().length === 0) {
        throw new BadRequestException('Widget title is required');
      }

      if (!data.position) {
        throw new BadRequestException('Widget position is required');
      }

      // Set default configuration based on widget type
      const defaultConfiguration = this.getDefaultConfiguration(
        data.widgetType
      );

      const widget = await this.widgetRepository.create({
        widgetType: data.widgetType,
        title: data.title.trim(),
        description: data.description?.trim(),
        position: data.position,
        configuration: { ...defaultConfiguration, ...data.configuration },
        dataSource: data.dataSource,
        refreshInterval: data.refreshInterval,
        dashboard: {
          connect: { id: dashboardId },
        },
      });

      this.logger.log(
        `Created widget: ${widget.id} for dashboard: ${dashboardId}`
      );
      return widget;
    } catch (error) {
      this.logger.error(`Failed to create widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get widget by ID with permission check
   */
  async getWidget(id: string, userId: string): Promise<DashboardWidget> {
    try {
      const widget = await this.widgetRepository.findById(id);

      if (!widget) {
        throw new NotFoundException('Widget not found');
      }

      // Check if user has view permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        widget.dashboardId,
        userId,
        DashboardPermissionType.VIEW
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to view this widget'
        );
      }

      this.logger.log(`Retrieved widget: ${widget.id} for user: ${userId}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to get widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all widgets for a dashboard
   */
  async getWidgets(
    dashboardId: string,
    userId: string,
    includeHidden = false
  ): Promise<DashboardWidget[]> {
    try {
      // Check if user has view permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        dashboardId,
        userId,
        DashboardPermissionType.VIEW
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to view widgets on this dashboard'
        );
      }

      const widgets = await this.widgetRepository.findByDashboard(
        dashboardId,
        includeHidden
      );

      this.logger.log(
        `Retrieved ${widgets.length} widgets for dashboard: ${dashboardId}`
      );
      return widgets;
    } catch (error) {
      this.logger.error(`Failed to get widgets: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget
   */
  async updateWidget(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      configuration?: any;
      dataSource?: any;
      refreshInterval?: number;
    }
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.widgetRepository.findById(id);

      if (!widget) {
        throw new NotFoundException('Widget not found');
      }

      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        widget.dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to edit this widget'
        );
      }

      // Validate title if provided
      if (
        data.title !== undefined &&
        (!data.title || data.title.trim().length === 0)
      ) {
        throw new BadRequestException('Widget title cannot be empty');
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.description !== undefined)
        updateData.description = data.description?.trim();
      if (data.configuration !== undefined)
        updateData.configuration = data.configuration;
      if (data.dataSource !== undefined)
        updateData.dataSource = data.dataSource;
      if (data.refreshInterval !== undefined)
        updateData.refreshInterval = data.refreshInterval;

      const updatedWidget = await this.widgetRepository.update(id, updateData);

      this.logger.log(`Updated widget: ${updatedWidget.id}`);
      return updatedWidget;
    } catch (error) {
      this.logger.error(`Failed to update widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget position
   */
  async updateWidgetPosition(
    id: string,
    userId: string,
    position: any
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.widgetRepository.findById(id);

      if (!widget) {
        throw new NotFoundException('Widget not found');
      }

      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        widget.dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to move this widget'
        );
      }

      const updatedWidget = await this.widgetRepository.updatePosition(
        id,
        position
      );

      this.logger.log(`Updated widget position: ${updatedWidget.id}`);
      return updatedWidget;
    } catch (error) {
      this.logger.error(
        `Failed to update widget position: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Toggle widget visibility
   */
  async toggleWidgetVisibility(
    id: string,
    userId: string
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.widgetRepository.findById(id);

      if (!widget) {
        throw new NotFoundException('Widget not found');
      }

      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        widget.dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to modify this widget'
        );
      }

      const updatedWidget = await this.widgetRepository.toggleVisibility(id);

      this.logger.log(
        `Toggled widget visibility: ${updatedWidget.id} to ${updatedWidget.isVisible}`
      );
      return updatedWidget;
    } catch (error) {
      this.logger.error(
        `Failed to toggle widget visibility: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: string, userId: string): Promise<void> {
    try {
      const widget = await this.widgetRepository.findById(id);

      if (!widget) {
        throw new NotFoundException('Widget not found');
      }

      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        widget.dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to delete this widget'
        );
      }

      await this.widgetRepository.delete(id);

      this.logger.log(`Deleted widget: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Bulk update widget positions
   */
  async bulkUpdatePositions(
    dashboardId: string,
    userId: string,
    updates: Array<{ id: string; position: any }>
  ): Promise<void> {
    try {
      // Check if user has edit permission on dashboard
      const hasPermission = await this.dashboardRepository.hasPermission(
        dashboardId,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to modify widgets on this dashboard'
        );
      }

      await this.widgetRepository.bulkUpdatePositions(updates);

      this.logger.log(
        `Bulk updated positions for ${updates.length} widgets on dashboard: ${dashboardId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to bulk update widget positions: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get default configuration for widget type
   * Enhanced with Step 19 analytics integration and Zambian market features
   */
  private getDefaultConfiguration(widgetType: WidgetType): any {
    const defaultConfigurations = {
      [WidgetType.METRIC_CARD]: {
        showTrend: true,
        showComparison: true,
        format: 'currency',
        precision: 2,
        currency: 'ZMW',
        showForecast: false,
        mobileOptimized: true,
      },
      [WidgetType.CHART_LINE]: {
        showLegend: true,
        showGrid: true,
        showTooltip: true,
        animation: true,
        responsive: true,
        showForecast: false,
        forecastPeriods: 3,
        lowBandwidthMode: true,
      },
      [WidgetType.CHART_BAR]: {
        showLegend: true,
        showGrid: true,
        showTooltip: true,
        orientation: 'vertical',
        responsive: true,
        showComparison: true,
        mobileOptimized: true,
      },
      [WidgetType.CHART_PIE]: {
        showLegend: true,
        showLabels: true,
        showTooltip: true,
        donut: false,
        responsive: true,
        showPercentages: true,
        mobileOptimized: true,
      },
      [WidgetType.TABLE]: {
        showHeader: true,
        showPagination: true,
        pageSize: 10,
        sortable: true,
        showActions: true,
        mobileOptimized: true,
        exportEnabled: true,
      },
      [WidgetType.LIST]: {
        showIcons: true,
        maxItems: 5,
        showMore: true,
        priorityFilter: 'all',
        autoRefresh: true,
        mobileOptimized: true,
      },
      // Step 18: Enhanced Executive Dashboard Widget Configurations
      [WidgetType.CASH_FLOW]: {
        period: 'last_30_days',
        groupBy: 'day',
        showSummary: true,
        showTrend: true,
        showProjection: true,
        includeCategories: true,
        currency: 'ZMW',
        mobileOptimized: true,
        lowBandwidthMode: true,
      },
      [WidgetType.REVENUE_EXPENSES]: {
        period: 'last_6_months',
        groupBy: 'month',
        viewMode: 'comparison',
        showProfitMargin: true,
        chartType: 'bar',
        showComparison: true,
        currency: 'ZMW',
        includeForecasts: true,
        mobileOptimized: true,
      },
      [WidgetType.KPI_SUMMARY]: {
        period: 'month',
        showTrends: true,
        layout: 'grid',
        metricsCount: 8,
        metrics: ['revenue', 'expenses', 'profit', 'customers'],
        showComparison: true,
        currency: 'ZMW',
        mobileOptimized: true,
        zambianMetrics: true,
      },
      [WidgetType.RECEIVABLES_AGING]: {
        showChart: true,
        showDetails: true,
        showRecommendations: true,
        riskThreshold: 'medium',
        agingPeriods: [30, 60, 90],
        showRiskAnalysis: true,
        includeProjections: true,
        currency: 'ZMW',
        mobileOptimized: true,
      },
      // Step 19: New Analytics-Enhanced Widget Types
      [WidgetType.EXPENSE_TRENDS]: {
        period: 'last_12_months',
        groupBy: 'month',
        showCategories: true,
        showAnomalies: true,
        includeForecasts: true,
        currency: 'ZMW',
        anomalySensitivity: 'MEDIUM',
        mobileOptimized: true,
      },
      [WidgetType.PROFITABILITY]: {
        analysisType: 'overall',
        period: 'last_6_months',
        showMargins: true,
        includeBreakdown: true,
        showTrends: true,
        currency: 'ZMW',
        includeForecasts: true,
        mobileOptimized: true,
      },
      [WidgetType.TAX_COMPLIANCE]: {
        showZraStatus: true,
        includeVatSummary: true,
        showUpcomingDeadlines: true,
        complianceScore: true,
        period: 'current_quarter',
        zambianCompliance: true,
        mobileOptimized: true,
      },
      [WidgetType.MOBILE_MONEY]: {
        providers: ['airtel', 'mtn', 'zamtel'],
        period: 'last_30_days',
        showBreakdown: true,
        includeTransactionCount: true,
        currency: 'ZMW',
        showTrends: true,
        mobileOptimized: true,
      },
    };

    // Add common Zambian market defaults
    const commonDefaults = {
      currency: 'ZMW',
      mobileOptimized: true,
      lowBandwidthMode: true,
      zambianLocalization: true,
      autoRefresh: true,
      refreshInterval: 300, // 5 minutes
    };

    const config = defaultConfigurations[widgetType] || {};
    return { ...commonDefaults, ...config };
  }
}
