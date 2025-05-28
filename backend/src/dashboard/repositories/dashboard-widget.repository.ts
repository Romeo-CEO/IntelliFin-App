import { Injectable, Logger } from '@nestjs/common';
import { Prisma, DashboardWidget, WidgetType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository for dashboard widget operations
 * Handles CRUD operations for widgets with dashboard association
 */
@Injectable()
export class DashboardWidgetRepository {
  private readonly logger = new Logger(DashboardWidgetRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new widget
   */
  async create(data: Prisma.DashboardWidgetCreateInput): Promise<DashboardWidget> {
    try {
      const widget = await this.prisma.dashboardWidget.create({
        data,
        include: {
          dashboard: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
        },
      });

      this.logger.log(`Created widget: ${widget.id} for dashboard: ${widget.dashboardId}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to create widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find widget by ID
   */
  async findById(id: string): Promise<DashboardWidget | null> {
    try {
      const widget = await this.prisma.dashboardWidget.findUnique({
        where: { id },
        include: {
          dashboard: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
        },
      });

      if (widget) {
        this.logger.log(`Retrieved widget: ${widget.id}`);
      }

      return widget;
    } catch (error) {
      this.logger.error(`Failed to find widget by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find all widgets for a dashboard
   */
  async findByDashboard(
    dashboardId: string,
    includeHidden = false,
  ): Promise<DashboardWidget[]> {
    try {
      const whereCondition: Prisma.DashboardWidgetWhereInput = {
        dashboardId,
      };

      if (!includeHidden) {
        whereCondition.isVisible = true;
      }

      const widgets = await this.prisma.dashboardWidget.findMany({
        where: whereCondition,
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      this.logger.log(`Retrieved ${widgets.length} widgets for dashboard: ${dashboardId}`);
      return widgets;
    } catch (error) {
      this.logger.error(`Failed to find widgets by dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find widgets by type
   */
  async findByType(
    dashboardId: string,
    widgetType: WidgetType,
  ): Promise<DashboardWidget[]> {
    try {
      const widgets = await this.prisma.dashboardWidget.findMany({
        where: {
          dashboardId,
          widgetType,
          isVisible: true,
        },
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      this.logger.log(`Retrieved ${widgets.length} ${widgetType} widgets for dashboard: ${dashboardId}`);
      return widgets;
    } catch (error) {
      this.logger.error(`Failed to find widgets by type: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget
   */
  async update(
    id: string,
    data: Prisma.DashboardWidgetUpdateInput,
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.prisma.dashboardWidget.update({
        where: { id },
        data,
        include: {
          dashboard: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
        },
      });

      this.logger.log(`Updated widget: ${widget.id}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to update widget: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget position
   */
  async updatePosition(
    id: string,
    position: Prisma.JsonValue,
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.prisma.dashboardWidget.update({
        where: { id },
        data: { position },
      });

      this.logger.log(`Updated widget position: ${widget.id}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to update widget position: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget configuration
   */
  async updateConfiguration(
    id: string,
    configuration: Prisma.JsonValue,
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.prisma.dashboardWidget.update({
        where: { id },
        data: { configuration },
      });

      this.logger.log(`Updated widget configuration: ${widget.id}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to update widget configuration: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update widget data source
   */
  async updateDataSource(
    id: string,
    dataSource: Prisma.JsonValue,
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.prisma.dashboardWidget.update({
        where: { id },
        data: { dataSource },
      });

      this.logger.log(`Updated widget data source: ${widget.id}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to update widget data source: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Toggle widget visibility
   */
  async toggleVisibility(id: string): Promise<DashboardWidget> {
    try {
      const currentWidget = await this.prisma.dashboardWidget.findUnique({
        where: { id },
        select: { isVisible: true },
      });

      if (!currentWidget) {
        throw new Error('Widget not found');
      }

      const widget = await this.prisma.dashboardWidget.update({
        where: { id },
        data: { isVisible: !currentWidget.isVisible },
      });

      this.logger.log(`Toggled widget visibility: ${widget.id} to ${widget.isVisible}`);
      return widget;
    } catch (error) {
      this.logger.error(`Failed to toggle widget visibility: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete widget
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.dashboardWidget.delete({
        where: { id },
      });

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
    updates: Array<{ id: string; position: Prisma.JsonValue }>,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        updates.map(({ id, position }) =>
          this.prisma.dashboardWidget.update({
            where: { id },
            data: { position },
          }),
        ),
      );

      this.logger.log(`Bulk updated positions for ${updates.length} widgets`);
    } catch (error) {
      this.logger.error(`Failed to bulk update widget positions: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get widget statistics for dashboard
   */
  async getStatistics(dashboardId: string): Promise<{
    total: number;
    visible: number;
    hidden: number;
    byType: Record<string, number>;
  }> {
    try {
      const [total, visible, byType] = await Promise.all([
        this.prisma.dashboardWidget.count({
          where: { dashboardId },
        }),
        this.prisma.dashboardWidget.count({
          where: { dashboardId, isVisible: true },
        }),
        this.prisma.dashboardWidget.groupBy({
          by: ['widgetType'],
          where: { dashboardId },
          _count: { widgetType: true },
        }),
      ]);

      const typeStats = byType.reduce((acc, item) => {
        acc[item.widgetType] = item._count.widgetType;
        return acc;
      }, {} as Record<string, number>);

      const statistics = {
        total,
        visible,
        hidden: total - visible,
        byType: typeStats,
      };

      this.logger.log(`Retrieved widget statistics for dashboard: ${dashboardId}`);
      return statistics;
    } catch (error) {
      this.logger.error(`Failed to get widget statistics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find widgets that need data refresh
   */
  async findWidgetsForRefresh(): Promise<DashboardWidget[]> {
    try {
      const widgets = await this.prisma.dashboardWidget.findMany({
        where: {
          isVisible: true,
          refreshInterval: { not: null },
          updatedAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
        include: {
          dashboard: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      });

      this.logger.log(`Found ${widgets.length} widgets that need refresh`);
      return widgets;
    } catch (error) {
      this.logger.error(`Failed to find widgets for refresh: ${error.message}`, error);
      throw error;
    }
  }
}
