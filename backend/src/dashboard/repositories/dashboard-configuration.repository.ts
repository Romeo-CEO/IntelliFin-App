import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Dashboard, DashboardPermissionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository for dashboard configuration operations
 * Handles CRUD operations for dashboards with multi-tenant isolation
 */
@Injectable()
export class DashboardConfigurationRepository {
  private readonly logger = new Logger(DashboardConfigurationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new dashboard
   */
  async create(data: Prisma.DashboardCreateInput): Promise<Dashboard> {
    try {
      const dashboard = await this.prisma.dashboard.create({
        data,
        include: {
          widgets: true,
          permissions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Created dashboard: ${dashboard.id} for organization: ${dashboard.organizationId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find dashboard by ID with permission check
   */
  async findById(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Dashboard | null> {
    try {
      const dashboard = await this.prisma.dashboard.findFirst({
        where: {
          id,
          organizationId,
          OR: [
            { isPublic: true },
            { createdBy: userId },
            {
              permissions: {
                some: {
                  userId,
                  permission: {
                    in: [
                      DashboardPermissionType.VIEW,
                      DashboardPermissionType.EDIT,
                      DashboardPermissionType.ADMIN,
                    ],
                  },
                },
              },
            },
          ],
        },
        include: {
          widgets: {
            where: { isVisible: true },
            orderBy: [
              { position: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          permissions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (dashboard) {
        this.logger.log(`Retrieved dashboard: ${dashboard.id}`);
      }

      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to find dashboard by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find all dashboards for an organization with user permissions
   */
  async findByOrganization(
    organizationId: string,
    userId?: string,
    includePrivate = false,
  ): Promise<Dashboard[]> {
    try {
      const whereCondition: Prisma.DashboardWhereInput = {
        organizationId,
      };

      if (!includePrivate && userId) {
        whereCondition.OR = [
          { isPublic: true },
          { createdBy: userId },
          {
            permissions: {
              some: {
                userId,
                permission: {
                  in: [
                    DashboardPermissionType.VIEW,
                    DashboardPermissionType.EDIT,
                    DashboardPermissionType.ADMIN,
                  ],
                },
              },
            },
          },
        ];
      }

      const dashboards = await this.prisma.dashboard.findMany({
        where: whereCondition,
        include: {
          widgets: {
            where: { isVisible: true },
            select: {
              id: true,
              widgetType: true,
              title: true,
              position: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              widgets: true,
              permissions: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      this.logger.log(`Retrieved ${dashboards.length} dashboards for organization: ${organizationId}`);
      return dashboards;
    } catch (error) {
      this.logger.error(`Failed to find dashboards by organization: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find default dashboard for organization
   */
  async findDefault(organizationId: string): Promise<Dashboard | null> {
    try {
      const dashboard = await this.prisma.dashboard.findFirst({
        where: {
          organizationId,
          isDefault: true,
        },
        include: {
          widgets: {
            where: { isVisible: true },
            orderBy: [
              { position: 'asc' },
              { createdAt: 'asc' },
            ],
          },
        },
      });

      if (dashboard) {
        this.logger.log(`Retrieved default dashboard: ${dashboard.id} for organization: ${organizationId}`);
      }

      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to find default dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update dashboard
   */
  async update(
    id: string,
    organizationId: string,
    data: Prisma.DashboardUpdateInput,
  ): Promise<Dashboard> {
    try {
      const dashboard = await this.prisma.dashboard.update({
        where: {
          id,
          organizationId,
        },
        data,
        include: {
          widgets: true,
          permissions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

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
  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.dashboard.delete({
        where: {
          id,
          organizationId,
        },
      });

      this.logger.log(`Deleted dashboard: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete dashboard: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Set dashboard as default (unsets other defaults)
   */
  async setAsDefault(id: string, organizationId: string): Promise<Dashboard> {
    try {
      // Use transaction to ensure atomicity
      const dashboard = await this.prisma.$transaction(async (tx) => {
        // Unset all other default dashboards
        await tx.dashboard.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });

        // Set this dashboard as default
        return await tx.dashboard.update({
          where: { id, organizationId },
          data: { isDefault: true },
          include: {
            widgets: true,
          },
        });
      });

      this.logger.log(`Set dashboard as default: ${id} for organization: ${organizationId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to set dashboard as default: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Check if user has permission to access dashboard
   */
  async hasPermission(
    dashboardId: string,
    userId: string,
    permission: DashboardPermissionType,
  ): Promise<boolean> {
    try {
      const dashboard = await this.prisma.dashboard.findFirst({
        where: {
          id: dashboardId,
          OR: [
            { createdBy: userId },
            { isPublic: true },
            {
              permissions: {
                some: {
                  userId,
                  permission: {
                    in: permission === DashboardPermissionType.ADMIN
                      ? [DashboardPermissionType.ADMIN]
                      : permission === DashboardPermissionType.EDIT
                      ? [DashboardPermissionType.EDIT, DashboardPermissionType.ADMIN]
                      : [DashboardPermissionType.VIEW, DashboardPermissionType.EDIT, DashboardPermissionType.ADMIN],
                  },
                },
              },
            },
          ],
        },
      });

      return !!dashboard;
    } catch (error) {
      this.logger.error(`Failed to check dashboard permission: ${error.message}`, error);
      return false;
    }
  }
}
