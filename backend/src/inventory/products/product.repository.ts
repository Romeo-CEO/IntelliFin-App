import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { TenantDatabaseProvider } from '../../modules/tenants/providers/tenant-database.provider';

export interface CreateProductData {
  organizationId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  qrCode?: string;
  zraItemCode?: string;
  costPrice: number;
  sellingPrice: number;
  currency?: string;
  vatRate?: number;
  isTaxable?: boolean;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unit?: string;
  weight?: number;
  dimensions?: any;
  isActive?: boolean;
  isService?: boolean;
  trackStock?: boolean;
  images?: string[];
}

export interface UpdateProductData {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  qrCode?: string;
  zraItemCode?: string;
  costPrice?: number;
  sellingPrice?: number;
  currency?: string;
  vatRate?: number;
  isTaxable?: boolean;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unit?: string;
  weight?: number;
  dimensions?: any;
  isActive?: boolean;
  isService?: boolean;
  trackStock?: boolean;
  images?: string[];
}

export interface ProductFilters {
  organizationId: string;
  search?: string;
  category?: string;
  brand?: string;
  isActive?: boolean;
  isService?: boolean;
  trackStock?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
  minCostPrice?: number;
  maxCostPrice?: number;
}

@Injectable()
export class ProductRepository {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private readonly tenantDb: TenantDatabaseProvider) {}

  /**
   * Create a new product
   */
  async create(data: CreateProductData): Promise<Product> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.create({
          data: {
            organizationId: data.organizationId,
            sku: data.sku,
            name: data.name,
            description: data.description,
            category: data.category,
            brand: data.brand,
            barcode: data.barcode,
            qrCode: data.qrCode,
            zraItemCode: data.zraItemCode,
            costPrice: data.costPrice,
            sellingPrice: data.sellingPrice,
            currency: data.currency || 'ZMW',
            vatRate: data.vatRate || 16,
            isTaxable: data.isTaxable ?? true,
            minimumStock: data.minimumStock || 0,
            maximumStock: data.maximumStock,
            reorderPoint: data.reorderPoint || 0,
            reorderQuantity: data.reorderQuantity || 0,
            unit: data.unit || 'pcs',
            weight: data.weight,
            dimensions: data.dimensions,
            isActive: data.isActive ?? true,
            isService: data.isService ?? false,
            trackStock: data.trackStock ?? true,
            images: data.images || [],
          },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  async findById(id: string, organizationId: string): Promise<Product | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to find product by ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find product by SKU
   */
  async findBySku(
    sku: string,
    organizationId: string
  ): Promise<Product | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.findFirst({
          where: {
            sku,
            organizationId,
            deletedAt: null,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to find product by SKU: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find product by barcode
   */
  async findByBarcode(
    barcode: string,
    organizationId: string
  ): Promise<Product | null> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.findFirst({
          where: {
            barcode,
            organizationId,
            deletedAt: null,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to find product by barcode: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find multiple products with filters
   */
  async findMany(
    filters: ProductFilters,
    orderBy?: Prisma.ProductOrderByWithRelationInput,
    skip?: number,
    take?: number
  ): Promise<Product[]> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where = this.buildWhereClause(filters);

        return await prisma.product.findMany({
          where,
          orderBy,
          skip,
          take,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to find products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Count products with filters
   */
  async count(filters: ProductFilters): Promise<number> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const where = this.buildWhereClause(filters);
        return await prisma.product.count({ where });
      });
    } catch (error) {
      this.logger.error(`Failed to count products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(
    id: string,
    organizationId: string,
    data: UpdateProductData
  ): Promise<Product> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.update({
          where: {
            id,
            organizationId,
          },
          data,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update stock level
   */
  async updateStock(
    id: string,
    organizationId: string,
    newStock: number
  ): Promise<Product> {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        return await prisma.product.update({
          where: {
            id,
            organizationId,
          },
          data: {
            currentStock: newStock,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to update product stock: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string, organizationId: string): Promise<void> {
    try {
      await this.tenantDb.executeInTenantContext(async prisma => {
        await prisma.product.update({
          where: {
            id,
            organizationId,
          },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to soft delete product: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(organizationId: string) {
    try {
      return await this.tenantDb.executeInTenantContext(async prisma => {
        const [
          totalProducts,
          activeProducts,
          lowStockProducts,
          outOfStockProducts,
          inventoryValue,
          categories,
        ] = await Promise.all([
          // Total products
          prisma.product.count({
            where: {
              organizationId,
              deletedAt: null,
            },
          }),
          // Active products
          prisma.product.count({
            where: {
              organizationId,
              isActive: true,
              deletedAt: null,
            },
          }),
          // Low stock products
          prisma.product.count({
            where: {
              organizationId,
              isActive: true,
              trackStock: true,
              deletedAt: null,
              AND: [
                {
                  currentStock: {
                    lte: prisma.product.fields.minimumStock,
                  },
                },
                {
                  currentStock: {
                    gt: 0,
                  },
                },
              ],
            },
          }),
          // Out of stock products
          prisma.product.count({
            where: {
              organizationId,
              isActive: true,
              trackStock: true,
              currentStock: 0,
              deletedAt: null,
            },
          }),
          // Total inventory value
          prisma.product.aggregate({
            where: {
              organizationId,
              isActive: true,
              deletedAt: null,
            },
            _sum: {
              costPrice: true,
            },
          }),
          // Unique categories
          prisma.product.findMany({
            where: {
              organizationId,
              deletedAt: null,
              category: {
                not: null,
              },
            },
            select: {
              category: true,
            },
            distinct: ['category'],
          }),
        ]);

        return {
          totalProducts,
          activeProducts,
          lowStockProducts,
          outOfStockProducts,
          totalInventoryValue: inventoryValue._sum.costPrice || 0,
          totalCategories: categories.length,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get product stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: ProductFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isService !== undefined) {
      where.isService = filters.isService;
    }

    if (filters.trackStock !== undefined) {
      where.trackStock = filters.trackStock;
    }

    if (filters.lowStock) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          trackStock: true,
          currentStock: {
            lte: { field: 'minimumStock' } as any,
          },
        },
        {
          currentStock: {
            gt: 0,
          },
        },
      ];
    }

    if (filters.outOfStock) {
      where.currentStock = 0;
      where.trackStock = true;
    }

    if (filters.minCostPrice !== undefined) {
      where.costPrice = {
        ...where.costPrice,
        gte: filters.minCostPrice,
      };
    }

    if (filters.maxCostPrice !== undefined) {
      where.costPrice = {
        ...where.costPrice,
        lte: filters.maxCostPrice,
      };
    }

    return where;
  }
}
