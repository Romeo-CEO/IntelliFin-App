import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { StockLevelService } from '../services/stock-level.service';
import { InventoryCacheService } from '../services/inventory-cache.service';
import { ProductRepository } from '../products/product.repository';
import { StockMovementRepository } from '../stock-movements/stock-movement.repository';
import { SourceType } from '../stock-movements/source-type.enum';

export interface StockMovementJobData {
  organizationId: string;
  productId: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  sourceId?: string;
  sourceType?: string;
  userId: string;
}

export interface BulkStockUpdateJobData {
  organizationId: string;
  updates: Array<{
    productId: string;
    newStock: number;
    reason?: string;
  }>;
  userId: string;
}

export interface StockReconciliationJobData {
  organizationId: string;
  productIds?: string[];
  userId: string;
}

/**
 * Stock Movement Processor
 * Handles background processing of stock movements and related operations
 * Optimized for Zambian SME environments with reliable processing
 */
@Processor('stock-movements')
@Injectable()
export class StockMovementProcessor {
  private readonly logger = new Logger(StockMovementProcessor.name);

  constructor(
    private readonly stockLevelService: StockLevelService,
    private readonly cacheService: InventoryCacheService,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository
  ) {}

  /**
   * Process individual stock movement
   */
  @Process('process-stock-movement')
  async processStockMovement(job: Job<StockMovementJobData>) {
    const { data } = job;

    try {
      this.logger.log(
        `Processing stock movement for product ${data.productId}: ${data.movementType} ${data.quantity}`
      );

      // Get current product
      const product = await this.productRepository.findById(
        data.productId,
        data.organizationId
      );
      if (!product) {
        throw new Error(`Product not found: ${data.productId}`);
      }

      if (!product.trackStock) {
        this.logger.warn(
          `Stock tracking disabled for product ${data.productId} - skipping movement`
        );
        return;
      }

      // Calculate new stock level
      const currentStock = Number(product.currentStock);
      let newStock: number;

      switch (data.movementType) {
        case 'IN':
          newStock = currentStock + data.quantity;
          break;
        case 'OUT':
          newStock = Math.max(0, currentStock - data.quantity);
          break;
        case 'ADJUSTMENT':
          newStock = data.quantity; // Direct adjustment to specific level
          break;
        case 'TRANSFER':
          // For transfers, this would be more complex in a multi-location system
          newStock = currentStock;
          break;
        default:
          throw new Error(`Unknown movement type: ${data.movementType}`);
      }

      // Create stock movement record
      await this.stockMovementRepository.create({
        organizationId: data.organizationId,
        productId: data.productId,
        movementType: data.movementType,
        movementDate: new Date(),
        quantity: data.quantity,
        stockBefore: currentStock,
        stockAfter: newStock,
        sourceType: data.sourceType as SourceType,
        sourceId: data.sourceId,
        reason: data.reason,
        createdBy: data.userId,
      });

      // Update product stock level
      await this.productRepository.updateStock(
        data.productId,
        data.organizationId,
        newStock
      );

      // Check stock levels and create alerts if necessary
      await this.stockLevelService.checkStockLevels(
        data.organizationId,
        data.productId
      );

      // Invalidate relevant caches
      await this.cacheService.invalidateProductCache(data.organizationId);
      await this.cacheService.invalidateStockMovementCache(data.organizationId);

      this.logger.log(
        `Stock movement processed successfully for product ${data.productId}: ${currentStock} -> ${newStock}`
      );

      // Update job progress
      await job.progress(100);
    } catch (error) {
      this.logger.error(
        `Failed to process stock movement: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process bulk stock updates
   */
  @Process('bulk-stock-update')
  async processBulkStockUpdate(job: Job<BulkStockUpdateJobData>) {
    const { data } = job;

    try {
      this.logger.log(
        `Processing bulk stock update for ${data.updates.length} products in organization ${data.organizationId}`
      );

      const totalUpdates = data.updates.length;
      let processedCount = 0;

      for (const update of data.updates) {
        try {
          // Get current product
          const product = await this.productRepository.findById(
            update.productId,
            data.organizationId
          );
          if (!product || !product.trackStock) {
            this.logger.warn(
              `Skipping stock update for product ${update.productId} - not found or tracking disabled`
            );
            continue;
          }

          const currentStock = Number(product.currentStock);
          const newStock = update.newStock;

          // Create stock movement record
          await this.stockMovementRepository.create({
            organizationId: data.organizationId,
            productId: update.productId,
            movementType: 'ADJUSTMENT',
            movementDate: new Date(),
            quantity: Math.abs(newStock - currentStock),
            stockBefore: currentStock,
            stockAfter: newStock,
            sourceType: 'MANUAL' as SourceType,
            reason: update.reason || 'Bulk stock update',
            createdBy: data.userId,
          });

          // Update product stock level
          await this.productRepository.updateStock(
            update.productId,
            data.organizationId,
            newStock
          );

          // Check stock levels
          await this.stockLevelService.checkStockLevels(
            data.organizationId,
            update.productId
          );

          processedCount++;

          // Update job progress
          const progress = Math.round((processedCount / totalUpdates) * 100);
          await job.progress(progress);

          // Small delay to prevent overwhelming the database
          if (processedCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          this.logger.error(
            `Failed to update stock for product ${update.productId}: ${error.message}`,
            error
          );
          // Continue with other updates
        }
      }

      // Invalidate caches
      await this.cacheService.invalidateProductCache(data.organizationId);
      await this.cacheService.invalidateStockMovementCache(data.organizationId);

      this.logger.log(
        `Bulk stock update completed: ${processedCount}/${totalUpdates} products updated`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process bulk stock update: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process stock reconciliation
   */
  @Process('stock-reconciliation')
  async processStockReconciliation(job: Job<StockReconciliationJobData>) {
    const { data } = job;

    try {
      this.logger.log(
        `Processing stock reconciliation for organization ${data.organizationId}`
      );

      // Get products to reconcile
      const filters = {
        organizationId: data.organizationId,
        isActive: true,
        trackStock: true,
      };

      const products = await this.productRepository.findMany(filters);
      const totalProducts = products.length;
      let processedCount = 0;
      let reconciliationIssues = 0;

      for (const product of products) {
        try {
          // If specific product IDs provided, filter
          if (data.productIds && !data.productIds.includes(product.id)) {
            continue;
          }

          // Check for stock level issues
          const currentStock = Number(product.currentStock);
          const maximumStock = product.maximumStock
            ? Number(product.maximumStock)
            : null;

          let hasIssues = false;

          // Check for negative stock
          if (currentStock < 0) {
            this.logger.warn(
              `Negative stock detected for product ${product.id}: ${currentStock}`
            );

            // Correct negative stock to zero
            await this.productRepository.updateStock(
              product.id,
              data.organizationId,
              0
            );

            // Create adjustment record
            await this.stockMovementRepository.create({
              organizationId: data.organizationId,
              productId: product.id,
              movementType: 'ADJUSTMENT',
              movementDate: new Date(),
              quantity: Math.abs(currentStock),
              stockBefore: currentStock,
              stockAfter: 0,
              sourceType: 'MANUAL' as SourceType,
              reason: 'Stock reconciliation - negative stock correction',
              createdBy: data.userId,
            });

            hasIssues = true;
          }

          // Check for unrealistic stock levels
          if (maximumStock && currentStock > maximumStock * 2) {
            this.logger.warn(
              `Unusually high stock detected for product ${product.id}: ${currentStock} (max: ${maximumStock})`
            );
            hasIssues = true;
          }

          // Check stock levels and create alerts
          await this.stockLevelService.checkStockLevels(
            data.organizationId,
            product.id
          );

          if (hasIssues) {
            reconciliationIssues++;
          }

          processedCount++;

          // Update job progress
          const progress = Math.round((processedCount / totalProducts) * 100);
          await job.progress(progress);

          // Small delay for low-bandwidth environments
          if (processedCount % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          this.logger.error(
            `Failed to reconcile stock for product ${product.id}: ${error.message}`,
            error
          );
          reconciliationIssues++;
        }
      }

      // Invalidate caches
      await this.cacheService.invalidateProductCache(data.organizationId);
      await this.cacheService.invalidateStockMovementCache(data.organizationId);
      await this.cacheService.invalidateStockAlertCache(data.organizationId);

      this.logger.log(
        `Stock reconciliation completed: ${processedCount} products processed, ${reconciliationIssues} issues found`
      );

      // Return summary
      return {
        totalProducts: processedCount,
        issuesFound: reconciliationIssues,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to process stock reconciliation: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process stock level checks for all products
   */
  @Process('check-all-stock-levels')
  async processStockLevelChecks(job: Job<{ organizationId: string }>) {
    const { organizationId } = job.data;

    try {
      this.logger.log(
        `Processing stock level checks for organization ${organizationId}`
      );

      await this.stockLevelService.checkAllStockLevels(organizationId);

      this.logger.log(
        `Stock level checks completed for organization ${organizationId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process stock level checks: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Clean up old stock movements
   */
  @Process('cleanup-old-movements')
  async cleanupOldMovements(
    job: Job<{ organizationId: string; daysOld: number }>
  ) {
    const { organizationId, daysOld } = job.data;

    try {
      this.logger.log(
        `Cleaning up stock movements older than ${daysOld} days for organization ${organizationId}`
      );

      const deletedCount =
        await this.stockMovementRepository.deleteOldMovements(
          organizationId,
          daysOld
        );

      this.logger.log(
        `Cleanup completed: ${deletedCount} old stock movements deleted`
      );

      return { deletedCount };
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old movements: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle job completion
   */
  @Process('*')
  async handleJobCompletion(job: Job) {
    this.logger.debug(`Job ${job.name} completed with ID ${job.id}`);
  }

  /**
   * Handle job failure
   */
  async handleJobFailure(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.name} failed with ID ${job.id}: ${error.message}`,
      error
    );

    // Could implement retry logic or notification here
    // For now, just log the failure
  }
}
