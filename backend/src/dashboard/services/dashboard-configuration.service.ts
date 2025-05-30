import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Dashboard, DashboardPermissionType } from '@prisma/client';
import { DashboardConfigurationRepository } from '../repositories/dashboard-configuration.repository';

/**
 * Service for dashboard configuration management
 * Handles business logic for dashboard operations with proper validation
 */
@Injectable()
export class DashboardConfigurationService {
  private readonly logger = new Logger(DashboardConfigurationService.name);

  constructor(
    private readonly dashboardRepository: DashboardConfigurationRepository
  ) {}

  /**
   * Create a new dashboard
   */
  async createDashboard(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      isDefault?: boolean;
      isPublic?: boolean;
      layout?: any;
      settings?: any;
    }
  ): Promise<Dashboard> {
    try {
      // Validate dashboard name
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestException('Dashboard name is required');
      }

      // If setting as default, ensure only one default exists
      if (data.isDefault) {
        const existingDefault =
          await this.dashboardRepository.findDefault(organizationId);
        if (existingDefault) {
          throw new BadRequestException('A default dashboard already exists');
        }
      }

      // Set default layout if not provided
      const defaultLayout = {
        gridColumns: 12,
        gridRows: 'auto',
        breakpoints: {
          mobile: 600,
          tablet: 1024,
          desktop: 1440,
        },
        spacing: 16,
        autoResize: true,
      };

      const dashboard = await this.dashboardRepository.create({
        name: data.name.trim(),
        description: data.description?.trim(),
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
        layout: data.layout || defaultLayout,
        settings: data.settings || {},
        organization: {
          connect: { id: organizationId },
        },
        creator: {
          connect: { id: userId },
        },
      });

      this.logger.log(
        `Created dashboard: ${dashboard.id} for organization: ${organizationId}`
      );
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID with permission check
   */
  async getDashboard(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<Dashboard> {
    try {
      const dashboard = await this.dashboardRepository.findById(
        id,
        organizationId,
        userId
      );

      if (!dashboard) {
        throw new NotFoundException('Dashboard not found or access denied');
      }

      this.logger.log(
        `Retrieved dashboard: ${dashboard.id} for user: ${userId}`
      );
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all dashboards for organization
   */
  async getDashboards(
    organizationId: string,
    userId: string,
    includePrivate = false
  ): Promise<Dashboard[]> {
    try {
      const dashboards = await this.dashboardRepository.findByOrganization(
        organizationId,
        userId,
        includePrivate
      );

      this.logger.log(
        `Retrieved ${dashboards.length} dashboards for organization: ${organizationId}`
      );
      return dashboards;
    } catch (error) {
      this.logger.error(`Failed to get dashboards: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get default dashboard for organization
   */
  async getDefaultDashboard(organizationId: string): Promise<Dashboard | null> {
    try {
      const dashboard =
        await this.dashboardRepository.findDefault(organizationId);

      if (dashboard) {
        this.logger.log(
          `Retrieved default dashboard: ${dashboard.id} for organization: ${organizationId}`
        );
      }

      return dashboard;
    } catch (error) {
      this.logger.error(
        `Failed to get default dashboard: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    organizationId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      layout?: any;
      settings?: any;
    }
  ): Promise<Dashboard> {
    try {
      // Check if user has edit permission
      const hasPermission = await this.dashboardRepository.hasPermission(
        id,
        userId,
        DashboardPermissionType.EDIT
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to edit dashboard'
        );
      }

      // Validate name if provided
      if (
        data.name !== undefined &&
        (!data.name || data.name.trim().length === 0)
      ) {
        throw new BadRequestException('Dashboard name cannot be empty');
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined)
        updateData.description = data.description?.trim();
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.layout !== undefined) updateData.layout = data.layout;
      if (data.settings !== undefined) updateData.settings = data.settings;

      const dashboard = await this.dashboardRepository.update(
        id,
        organizationId,
        updateData
      );

      this.logger.log(`Updated dashboard: ${dashboard.id}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to update dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user has admin permission
      const hasPermission = await this.dashboardRepository.hasPermission(
        id,
        userId,
        DashboardPermissionType.ADMIN
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to delete dashboard'
        );
      }

      // Check if it's the default dashboard
      const dashboard = await this.dashboardRepository.findById(
        id,
        organizationId,
        userId
      );
      if (dashboard?.isDefault) {
        throw new BadRequestException('Cannot delete the default dashboard');
      }

      await this.dashboardRepository.delete(id, organizationId);

      this.logger.log(`Deleted dashboard: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Set dashboard as default
   */
  async setAsDefault(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<Dashboard> {
    try {
      // Check if user has admin permission
      const hasPermission = await this.dashboardRepository.hasPermission(
        id,
        userId,
        DashboardPermissionType.ADMIN
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Insufficient permissions to set default dashboard'
        );
      }

      const dashboard = await this.dashboardRepository.setAsDefault(
        id,
        organizationId
      );

      this.logger.log(
        `Set dashboard as default: ${dashboard.id} for organization: ${organizationId}`
      );
      return dashboard;
    } catch (error) {
      this.logger.error(
        `Failed to set dashboard as default: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(
    id: string,
    organizationId: string,
    userId: string,
    newName?: string
  ): Promise<Dashboard> {
    try {
      // Get original dashboard
      const originalDashboard = await this.getDashboard(
        id,
        organizationId,
        userId
      );

      // Create new dashboard with copied data
      const duplicatedDashboard = await this.createDashboard(
        organizationId,
        userId,
        {
          name: newName || `${originalDashboard.name} (Copy)`,
          description: originalDashboard.description,
          isDefault: false, // Never duplicate as default
          isPublic: false, // Start as private
          layout: originalDashboard.layout,
          settings: originalDashboard.settings,
        }
      );

      this.logger.log(
        `Duplicated dashboard: ${originalDashboard.id} to ${duplicatedDashboard.id}`
      );
      return duplicatedDashboard;
    } catch (error) {
      this.logger.error(
        `Failed to duplicate dashboard: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create default dashboard for new organization
   */
  async createDefaultDashboard(
    organizationId: string,
    userId: string
  ): Promise<Dashboard> {
    try {
      const defaultLayout = {
        gridColumns: 12,
        gridRows: 'auto',
        breakpoints: {
          mobile: 600,
          tablet: 1024,
          desktop: 1440,
        },
        spacing: 16,
        autoResize: true,
      };

      const dashboard = await this.createDashboard(organizationId, userId, {
        name: 'Financial Overview',
        description:
          'Default dashboard with key financial metrics and insights',
        isDefault: true,
        isPublic: true,
        layout: defaultLayout,
        settings: {
          theme: 'light',
          refreshInterval: 300, // 5 minutes
          autoRefresh: true,
        },
      });

      this.logger.log(
        `Created default dashboard for organization: ${organizationId}`
      );
      return dashboard;
    } catch (error) {
      this.logger.error(
        `Failed to create default dashboard: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if user has permission to access dashboard
   */
  async checkPermission(
    dashboardId: string,
    userId: string,
    permission: DashboardPermissionType
  ): Promise<boolean> {
    try {
      return await this.dashboardRepository.hasPermission(
        dashboardId,
        userId,
        permission
      );
    } catch (error) {
      this.logger.error(
        `Failed to check dashboard permission: ${error.message}`,
        error
      );
      return false;
    }
  }

  /**
   * Update dashboard layout
   */
  async updateLayout(
    id: string,
    organizationId: string,
    userId: string,
    layout: any
  ): Promise<Dashboard> {
    try {
      return await this.updateDashboard(id, organizationId, userId, { layout });
    } catch (error) {
      this.logger.error(
        `Failed to update dashboard layout: ${error.message}`,
        error
      );
      throw error;
    }
  }
}
