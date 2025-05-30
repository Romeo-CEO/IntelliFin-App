import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  StockMovement,
  StockMovementSourceType,
  StockMovementType,
} from '@prisma/client';
import { TenantDatabaseProvider } from '../../modules/tenants/providers/tenant-database.provider';

export interface CreateStockMovementData {
  organizationId: string;
  productId: string;
  movementType: StockMovementType;
  movementDate: Date;
  quantity: number;
  unit?: string;
  stockBefore: number;
  stockAfter: number;
  unitCost?: number;
  totalCost?: number;
  currency?: string;
  sourceType?: StockMovementSourceType;
  sourceId?: string;
  reference?: string;
  reason?: string;
  notes?: string;
  locationFrom?: string;
  locationTo?: string;
  createdBy: string;
}

export interface StockMovementFilters {
  organizationId: string;
  productId?: string;
  movementType?: StockMovementType;
  sourceType?: StockMovementSourceType;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string;
}

@Injectable()
export class StockMovementRepository {
  private readonly logger = new Logger(StockMovementRepository.name);

  constructor(private readonly tenantDb: TenantDatabaseProvider) {}

  /**
   * Create a new stock movement
   */
  async create(data: CreateStockMovementData): Promise<StockMovement> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.stockMovement.create({
          data: {
            organizationId: data.organizationId,
            productId: data.productId,
            movementType: data.movementType,
            movementDate: data.movementDate,
            quantity: data.quantity,
            unit: data.unit || 'pcs',
            stockBefore: data.stockBefore,
            stockAfter: data.stockAfter,
            unitCost: data.unitCost,
            totalCost: data.totalCost,
            currency: data.currency || 'ZMW',
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            reference: data.reference,
            reason: data.reason,
            notes: data.notes,
            locationFrom: data.locationFrom,
            locationTo: data.locationTo,
            createdBy: data.createdBy,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to create stock movement: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find stock movement by ID
   */
  async findById(
    id: string,
    organizationId: string
  ): Promise<StockMovement | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.stockMovement.findFirst({
          where: {
            id,
            organizationId,
          },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to find stock movement by ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find multiple stock movements with filters
   */
  async findMany(
    filters: StockMovementFilters,
    orderBy?: Prisma.StockMovementOrderByWithRelationInput,
    skip?: number,
    take?: number
  ): Promise<StockMovement[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where = this.buildWhereClause(filters);

        return await prisma.stockMovement.findMany({
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
                unit: true,
                currentStock: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to find stock movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Count stock movements with filters
   */
  async count(filters: StockMovementFilters): Promise<number> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where = this.buildWhereClause(filters);
        return await prisma.stockMovement.count({ where });
      });
    } catch (error) {
      this.logger.error(
        `Failed to count stock movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get stock movements for a product within date range
   */
  async getProductMovements(
    productId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ): Promise<StockMovement[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where: Prisma.StockMovementWhereInput = {
          organizationId,
          productId,
        };

        if (startDate || endDate) {
          where.movementDate = {};
          if (startDate) where.movementDate.gte = startDate;
          if (endDate) where.movementDate.lte = endDate;
        }

        return await prisma.stockMovement.findMany({
          where,
          orderBy: { movementDate: 'desc' },
          take: limit,
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to get product movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get stock movement summary for organization
   */
  async getMovementSummary(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where: Prisma.StockMovementWhereInput = {
          organizationId,
        };

        if (startDate || endDate) {
          where.movementDate = {};
          if (startDate) where.movementDate.gte = startDate;
          if (endDate) where.movementDate.lte = endDate;
        }

        const [
          totalMovements,
          inMovements,
          outMovements,
          adjustments,
          transfers,
          totalValue,
        ] = await Promise.all([
          // Total movements
          prisma.stockMovement.count({ where }),

          // IN movements
          prisma.stockMovement.count({
            where: { ...where, movementType: 'IN' },
          }),

          // OUT movements
          prisma.stockMovement.count({
            where: { ...where, movementType: 'OUT' },
          }),

          // Adjustments
          prisma.stockMovement.count({
            where: { ...where, movementType: 'ADJUSTMENT' },
          }),

          // Transfers
          prisma.stockMovement.count({
            where: { ...where, movementType: 'TRANSFER' },
          }),

          // Total value
          prisma.stockMovement.aggregate({
            where: {
              ...where,
              totalCost: { not: null },
            },
            _sum: { totalCost: true },
          }),
        ]);

        return {
          totalMovements,
          movementsByType: {
            in: inMovements,
            out: outMovements,
            adjustment: adjustments,
            transfer: transfers,
          },
          totalValue: totalValue._sum.totalCost || 0,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get movement summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get recent stock movements
   */
  async getRecentMovements(
    organizationId: string,
    limit = 20
  ): Promise<StockMovement[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.stockMovement.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to get recent movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get stock movements by source
   */
  async getMovementsBySource(
    organizationId: string,
    sourceType: StockMovementSourceType,
    sourceId: string
  ): Promise<StockMovement[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.stockMovement.findMany({
          where: {
            organizationId,
            sourceType,
            sourceId,
          },
          orderBy: { movementDate: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to get movements by source: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete old stock movements
   */
  async deleteOldMovements(
    organizationId: string,
    daysOld = 365
  ): Promise<number> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await prisma.stockMovement.deleteMany({
          where: {
            organizationId,
            createdAt: {
              lt: cutoffDate,
            },
          },
        });

        return result.count;
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete old movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get stock movement statistics
   */
  async getMovementStats(organizationId: string, days = 30): Promise<any> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const movements = await prisma.stockMovement.findMany({
          where: {
            organizationId,
            movementDate: {
              gte: startDate,
            },
          },
          select: {
            movementType: true,
            quantity: true,
            totalCost: true,
            movementDate: true,
          },
        });

        // Group by movement type
        const stats = movements.reduce(
          (acc, movement) => {
            const type = movement.movementType;
            if (!acc[type]) {
              acc[type] = {
                count: 0,
                totalQuantity: 0,
                totalValue: 0,
              };
            }

            acc[type].count++;
            acc[type].totalQuantity += Number(movement.quantity);
            acc[type].totalValue += Number(movement.totalCost || 0);

            return acc;
          },
          {} as Record<string, any>
        );

        return {
          period: `${days} days`,
          totalMovements: movements.length,
          movementsByType: stats,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get movement stats: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(
    filters: StockMovementFilters
  ): Prisma.StockMovementWhereInput {
    const where: Prisma.StockMovementWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }

    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }

    if (filters.startDate || filters.endDate) {
      where.movementDate = {};
      if (filters.startDate) where.movementDate.gte = filters.startDate;
      if (filters.endDate) where.movementDate.lte = filters.endDate;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return where;
  }
}
