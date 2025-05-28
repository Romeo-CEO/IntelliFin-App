import { Injectable, Logger } from '@nestjs/common';
import { StockAlert, StockAlertType, StockAlertLevel, Prisma } from '@prisma/client';
import { TenantDatabaseProvider } from '../../modules/tenants/providers/tenant-database.provider';

export interface CreateStockAlertData {
  organizationId: string;
  productId: string;
  alertType: StockAlertType;
  alertLevel: StockAlertLevel;
  currentStock: number;
  thresholdValue: number;
  message: string;
}

export interface UpdateStockAlertData {
  alertLevel?: StockAlertLevel;
  currentStock?: number;
  thresholdValue?: number;
  message?: string;
  isActive?: boolean;
  isAcknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface StockAlertFilters {
  organizationId: string;
  productId?: string;
  alertType?: StockAlertType;
  alertLevel?: StockAlertLevel;
  isActive?: boolean;
  isAcknowledged?: boolean;
}

@Injectable()
export class StockAlertRepository {
  private readonly logger = new Logger(StockAlertRepository.name);

  constructor(
    private readonly tenantDb: TenantDatabaseProvider,
  ) {}

  /**
   * Create a new stock alert
   */
  async create(data: CreateStockAlertData): Promise<StockAlert> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.create({
          data: {
            organizationId: data.organizationId,
            productId: data.productId,
            alertType: data.alertType,
            alertLevel: data.alertLevel,
            currentStock: data.currentStock,
            thresholdValue: data.thresholdValue,
            message: data.message,
            isActive: true,
            isAcknowledged: false,
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to create stock alert: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find stock alert by ID
   */
  async findById(id: string, organizationId: string): Promise<StockAlert | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.findFirst({
          where: {
            id,
            organizationId,
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to find stock alert by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find active alert for product and type
   */
  async findActiveAlert(
    organizationId: string,
    productId: string,
    alertType: StockAlertType,
  ): Promise<StockAlert | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.findFirst({
          where: {
            organizationId,
            productId,
            alertType,
            isActive: true,
            isAcknowledged: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to find active alert: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find multiple stock alerts with filters
   */
  async findMany(
    filters: StockAlertFilters,
    orderBy?: Prisma.StockAlertOrderByWithRelationInput,
    skip?: number,
    take?: number,
  ): Promise<StockAlert[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const where = this.buildWhereClause(filters);

        return await prisma.stockAlert.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                currentStock: true,
                minimumStock: true,
                unit: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to find stock alerts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Count stock alerts with filters
   */
  async count(filters: StockAlertFilters): Promise<number> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const where = this.buildWhereClause(filters);
        return await prisma.stockAlert.count({ where });
      });
    } catch (error) {
      this.logger.error(`Failed to count stock alerts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update stock alert
   */
  async update(id: string, organizationId: string, data: UpdateStockAlertData): Promise<StockAlert> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.update({
          where: {
            id,
            organizationId,
          },
          data,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to update stock alert: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Acknowledge stock alert
   */
  async acknowledge(id: string, organizationId: string, acknowledgedBy: string): Promise<StockAlert> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.update({
          where: {
            id,
            organizationId,
          },
          data: {
            isAcknowledged: true,
            acknowledgedBy,
            acknowledgedAt: new Date(),
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to acknowledge stock alert: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Deactivate stock alert
   */
  async deactivate(id: string, organizationId: string): Promise<StockAlert> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        return await prisma.stockAlert.update({
          where: {
            id,
            organizationId,
          },
          data: {
            isActive: false,
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to deactivate stock alert: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete old acknowledged alerts
   */
  async deleteOldAcknowledgedAlerts(organizationId: string, daysOld = 30): Promise<number> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await prisma.stockAlert.deleteMany({
          where: {
            organizationId,
            isAcknowledged: true,
            acknowledgedAt: {
              lt: cutoffDate,
            },
          },
        });

        return result.count;
      });
    } catch (error) {
      this.logger.error(`Failed to delete old acknowledged alerts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(organizationId: string) {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const [
          totalAlerts,
          activeAlerts,
          acknowledgedAlerts,
          criticalAlerts,
          urgentAlerts,
          warningAlerts,
          infoAlerts,
          outOfStockAlerts,
          lowStockAlerts,
        ] = await Promise.all([
          // Total alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
            },
          }),
          // Active alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
            },
          }),
          // Acknowledged alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isAcknowledged: true,
            },
          }),
          // Critical alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertLevel: 'CRITICAL',
            },
          }),
          // Urgent alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertLevel: 'URGENT',
            },
          }),
          // Warning alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertLevel: 'WARNING',
            },
          }),
          // Info alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertLevel: 'INFO',
            },
          }),
          // Out of stock alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertType: 'OUT_OF_STOCK',
            },
          }),
          // Low stock alerts
          prisma.stockAlert.count({
            where: {
              organizationId,
              isActive: true,
              isAcknowledged: false,
              alertType: 'LOW_STOCK',
            },
          }),
        ]);

        return {
          totalAlerts,
          activeAlerts,
          acknowledgedAlerts,
          alertsByLevel: {
            critical: criticalAlerts,
            urgent: urgentAlerts,
            warning: warningAlerts,
            info: infoAlerts,
          },
          alertsByType: {
            outOfStock: outOfStockAlerts,
            lowStock: lowStockAlerts,
          },
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get alert stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: StockAlertFilters): Prisma.StockAlertWhereInput {
    const where: Prisma.StockAlertWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.alertType) {
      where.alertType = filters.alertType;
    }

    if (filters.alertLevel) {
      where.alertLevel = filters.alertLevel;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isAcknowledged !== undefined) {
      where.isAcknowledged = filters.isAcknowledged;
    }

    return where;
  }
}
