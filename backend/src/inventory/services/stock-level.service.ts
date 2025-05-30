import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ProductRepository } from '../products/product.repository';
import { StockAlertRepository } from '../alerts/stock-alert.repository';
import { InventoryCacheService } from './inventory-cache.service';
import { StockAlertLevel, StockAlertType } from '@prisma/client';

export interface StockLevelCheck {
  productId: string;
  organizationId: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint: number;
}

export interface StockAlert {
  productId: string;
  organizationId: string;
  alertType: StockAlertType;
  alertLevel: StockAlertLevel;
  currentStock: number;
  thresholdValue: number;
  message: string;
}

/**
 * Stock Level Service
 * Manages stock level monitoring, alerts, and automated reorder suggestions
 * Optimized for Zambian SME inventory management needs
 */
@Injectable()
export class StockLevelService {
  private readonly logger = new Logger(StockLevelService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly stockAlertRepository: StockAlertRepository,
    private readonly cacheService: InventoryCacheService,
    @InjectQueue('stock-alerts') private readonly stockAlertQueue: Queue
  ) {}

  /**
   * Check stock levels for a specific product
   */
  async checkStockLevels(
    organizationId: string,
    productId: string
  ): Promise<void> {
    try {
      const product = await this.productRepository.findById(
        productId,
        organizationId
      );

      if (!product || !product.trackStock) {
        return;
      }

      const stockCheck: StockLevelCheck = {
        productId: product.id,
        organizationId: product.organizationId,
        currentStock: Number(product.currentStock),
        minimumStock: Number(product.minimumStock),
        maximumStock: product.maximumStock
          ? Number(product.maximumStock)
          : undefined,
        reorderPoint: Number(product.reorderPoint),
      };

      const alerts = await this.generateStockAlerts(stockCheck, product);

      // Process alerts
      for (const alert of alerts) {
        await this.processStockAlert(alert);
      }

      this.logger.debug(`Checked stock levels for product ${productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to check stock levels for product ${productId}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Check stock levels for all products in an organization
   */
  async checkAllStockLevels(organizationId: string): Promise<void> {
    try {
      const products = await this.productRepository.findMany(
        {
          organizationId,
          isActive: true,
          trackStock: true,
        },
        { name: 'asc' }
      );

      this.logger.log(
        `Checking stock levels for ${products.length} products in organization ${organizationId}`
      );

      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        await Promise.all(
          batch.map(product =>
            this.checkStockLevels(organizationId, product.id)
          )
        );

        // Small delay between batches for low-bandwidth environments
        if (i + batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.log(
        `Completed stock level check for organization ${organizationId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to check all stock levels: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate stock alerts based on current stock levels
   */
  private async generateStockAlerts(
    stockCheck: StockLevelCheck,
    product: any
  ): Promise<StockAlert[]> {
    const alerts: StockAlert[] = [];
    const { currentStock, minimumStock, maximumStock, reorderPoint } =
      stockCheck;

    // Out of stock alert
    if (currentStock === 0) {
      alerts.push({
        productId: stockCheck.productId,
        organizationId: stockCheck.organizationId,
        alertType: StockAlertType.OUT_OF_STOCK,
        alertLevel: StockAlertLevel.CRITICAL,
        currentStock,
        thresholdValue: 0,
        message: `Product "${product.name}" (${product.sku}) is out of stock`,
      });
    }
    // Low stock alert
    else if (currentStock <= minimumStock && currentStock > 0) {
      alerts.push({
        productId: stockCheck.productId,
        organizationId: stockCheck.organizationId,
        alertType: StockAlertType.LOW_STOCK,
        alertLevel: this.getAlertLevel(currentStock, minimumStock),
        currentStock,
        thresholdValue: minimumStock,
        message: `Product "${product.name}" (${product.sku}) is below minimum stock level (${currentStock}/${minimumStock})`,
      });
    }
    // Reorder point alert
    else if (
      reorderPoint > 0 &&
      currentStock <= reorderPoint &&
      currentStock > minimumStock
    ) {
      alerts.push({
        productId: stockCheck.productId,
        organizationId: stockCheck.organizationId,
        alertType: StockAlertType.REORDER_POINT,
        alertLevel: StockAlertLevel.WARNING,
        currentStock,
        thresholdValue: reorderPoint,
        message: `Product "${product.name}" (${product.sku}) has reached reorder point (${currentStock}/${reorderPoint})`,
      });
    }

    // Overstock alert (if maximum stock is defined)
    if (maximumStock && currentStock > maximumStock) {
      alerts.push({
        productId: stockCheck.productId,
        organizationId: stockCheck.organizationId,
        alertType: StockAlertType.OVERSTOCK,
        alertLevel: StockAlertLevel.INFO,
        currentStock,
        thresholdValue: maximumStock,
        message: `Product "${product.name}" (${product.sku}) is overstocked (${currentStock}/${maximumStock})`,
      });
    }

    return alerts;
  }

  /**
   * Process a stock alert
   */
  private async processStockAlert(alert: StockAlert): Promise<void> {
    try {
      // Check if similar alert already exists and is active
      const existingAlert = await this.stockAlertRepository.findActiveAlert(
        alert.organizationId,
        alert.productId,
        alert.alertType
      );

      if (existingAlert) {
        // Update existing alert
        await this.stockAlertRepository.update(
          existingAlert.id,
          alert.organizationId,
          {
            currentStock: alert.currentStock,
            thresholdValue: alert.thresholdValue,
            message: alert.message,
            alertLevel: alert.alertLevel,
          }
        );
      } else {
        // Create new alert
        await this.stockAlertRepository.create({
          organizationId: alert.organizationId,
          productId: alert.productId,
          alertType: alert.alertType,
          alertLevel: alert.alertLevel,
          currentStock: alert.currentStock,
          thresholdValue: alert.thresholdValue,
          message: alert.message,
        });
      }

      // Queue notification job
      await this.stockAlertQueue.add(
        'send-stock-alert-notification',
        {
          alert,
        },
        {
          delay: 1000, // 1 second delay to batch similar alerts
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      // Invalidate cache
      await this.cacheService.invalidateStockAlertCache(alert.organizationId);

      this.logger.debug(
        `Processed stock alert for product ${alert.productId}: ${alert.alertType}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process stock alert: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get alert level based on stock ratio
   */
  private getAlertLevel(
    currentStock: number,
    minimumStock: number
  ): StockAlertLevel {
    const ratio = currentStock / minimumStock;

    if (ratio <= 0.25) {
      return StockAlertLevel.CRITICAL;
    } else if (ratio <= 0.5) {
      return StockAlertLevel.URGENT;
    } else if (ratio <= 0.75) {
      return StockAlertLevel.WARNING;
    } else {
      return StockAlertLevel.INFO;
    }
  }

  /**
   * Get reorder suggestions for an organization
   */
  async getReorderSuggestions(organizationId: string): Promise<any[]> {
    try {
      const cacheKey = this.cacheService.getCacheKey(
        'reorder_suggestions',
        organizationId
      );

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const products = await this.productRepository.findMany(
            {
              organizationId,
              isActive: true,
              trackStock: true,
              lowStock: true,
            },
            { currentStock: 'asc' }
          );

          return products
            .filter(product => Number(product.reorderQuantity) > 0)
            .map(product => ({
              productId: product.id,
              sku: product.sku,
              name: product.name,
              currentStock: Number(product.currentStock),
              minimumStock: Number(product.minimumStock),
              reorderPoint: Number(product.reorderPoint),
              reorderQuantity: Number(product.reorderQuantity),
              suggestedQuantity: this.calculateSuggestedQuantity(product),
              estimatedCost:
                Number(product.costPrice) *
                this.calculateSuggestedQuantity(product),
              priority: this.calculateReorderPriority(product),
            }))
            .sort((a, b) => b.priority - a.priority);
        },
        'LOW_STOCK'
      );
    } catch (error) {
      this.logger.error(
        `Failed to get reorder suggestions: ${error.message}`,
        error
      );
      return [];
    }
  }

  /**
   * Calculate suggested reorder quantity
   */
  private calculateSuggestedQuantity(product: any): number {
    const currentStock = Number(product.currentStock);
    const minimumStock = Number(product.minimumStock);
    const reorderQuantity = Number(product.reorderQuantity);
    const maximumStock = product.maximumStock
      ? Number(product.maximumStock)
      : null;

    // If reorder quantity is specified, use it
    if (reorderQuantity > 0) {
      return reorderQuantity;
    }

    // Calculate based on minimum stock and current deficit
    const deficit = Math.max(0, minimumStock - currentStock);
    const bufferQuantity = Math.ceil(minimumStock * 0.5); // 50% buffer

    let suggestedQuantity = deficit + bufferQuantity;

    // Don't exceed maximum stock if specified
    if (maximumStock && currentStock + suggestedQuantity > maximumStock) {
      suggestedQuantity = Math.max(0, maximumStock - currentStock);
    }

    return Math.max(1, suggestedQuantity);
  }

  /**
   * Calculate reorder priority (0-100)
   */
  private calculateReorderPriority(product: any): number {
    const currentStock = Number(product.currentStock);
    const minimumStock = Number(product.minimumStock);

    if (currentStock === 0) {
      return 100; // Highest priority for out of stock
    }

    if (minimumStock === 0) {
      return 0; // No priority if no minimum stock set
    }

    const stockRatio = currentStock / minimumStock;

    // Higher priority for lower stock ratios
    if (stockRatio <= 0.25) {
      return 90;
    } else if (stockRatio <= 0.5) {
      return 70;
    } else if (stockRatio <= 0.75) {
      return 50;
    } else if (stockRatio <= 1.0) {
      return 30;
    } else {
      return 10;
    }
  }

  /**
   * Get stock level summary for dashboard
   */
  async getStockLevelSummary(organizationId: string): Promise<any> {
    try {
      const cacheKey = this.cacheService.getCacheKey(
        'stock_summary',
        organizationId
      );

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const [
            totalProducts,
            lowStockCount,
            outOfStockCount,
            overstockCount,
            activeAlerts,
          ] = await Promise.all([
            this.productRepository.count({
              organizationId,
              isActive: true,
              trackStock: true,
            }),
            this.productRepository.count({
              organizationId,
              isActive: true,
              lowStock: true,
            }),
            this.productRepository.count({
              organizationId,
              isActive: true,
              outOfStock: true,
            }),
            // TODO: Implement overstock count
            0,
            this.stockAlertRepository.count({
              organizationId,
              isActive: true,
              isAcknowledged: false,
            }),
          ]);

          const healthyStockCount =
            totalProducts - lowStockCount - outOfStockCount - overstockCount;

          return {
            totalProducts,
            healthyStockCount,
            lowStockCount,
            outOfStockCount,
            overstockCount,
            activeAlerts,
            healthPercentage:
              totalProducts > 0
                ? Math.round((healthyStockCount / totalProducts) * 100)
                : 100,
          };
        },
        'STOCK_ALERTS'
      );
    } catch (error) {
      this.logger.error(
        `Failed to get stock level summary: ${error.message}`,
        error
      );
      return {
        totalProducts: 0,
        healthyStockCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        overstockCount: 0,
        activeAlerts: 0,
        healthPercentage: 100,
      };
    }
  }

  /**
   * Schedule stock level checks
   */
  async scheduleStockLevelCheck(
    organizationId: string,
    delayMinutes = 0
  ): Promise<void> {
    try {
      await this.stockAlertQueue.add(
        'check-all-stock-levels',
        {
          organizationId,
        },
        {
          delay: delayMinutes * 60 * 1000, // Convert minutes to milliseconds
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      this.logger.log(
        `Scheduled stock level check for organization ${organizationId} in ${delayMinutes} minutes`
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule stock level check: ${error.message}`,
        error
      );
    }
  }
}
