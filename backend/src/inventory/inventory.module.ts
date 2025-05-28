import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';

import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { TenantModule } from '../modules/tenants/tenant.module';

// Product Management
import { ProductController } from './products/product.controller';
import { ProductService } from './products/product.service';
import { ProductRepository } from './products/product.repository';

// Supplier Management
import { SupplierController } from './suppliers/supplier.controller';
import { SupplierService } from './suppliers/supplier.service';
import { SupplierRepository } from './suppliers/supplier.repository';

// Purchase Order Management
import { PurchaseOrderController } from './purchase-orders/purchase-order.controller';
import { PurchaseOrderService } from './purchase-orders/purchase-order.service';
import { PurchaseOrderRepository } from './purchase-orders/purchase-order.repository';

// Stock Movement Management
import { StockMovementController } from './stock-movements/stock-movement.controller';
import { StockMovementService } from './stock-movements/stock-movement.service';
import { StockMovementRepository } from './stock-movements/stock-movement.repository';

// Inventory Adjustment Management
import { InventoryAdjustmentController } from './adjustments/inventory-adjustment.controller';
import { InventoryAdjustmentService } from './adjustments/inventory-adjustment.service';
import { InventoryAdjustmentRepository } from './adjustments/inventory-adjustment.repository';

// Stock Alert Management
import { StockAlertController } from './alerts/stock-alert.controller';
import { StockAlertService } from './alerts/stock-alert.service';
import { StockAlertRepository } from './alerts/stock-alert.repository';

// Inventory Reporting
import { InventoryReportController } from './reports/inventory-report.controller';
import { InventoryReportService } from './reports/inventory-report.service';
import { InventoryReportRepository } from './reports/inventory-report.repository';

// Services
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryValidationService } from './services/inventory-validation.service';
import { InventoryNotificationService } from './services/inventory-notification.service';
import { BarcodeService } from './services/barcode.service';
import { StockLevelService } from './services/stock-level.service';
import { InventoryAnalyticsService } from './services/inventory-analytics.service';
import { ZraIntegrationService } from './services/zra-integration.service';
import { OrganizationResolverService } from './services/organization-resolver.service';

// Processors
import { StockAlertProcessor } from './processors/stock-alert.processor';
import { InventoryReportProcessor } from './processors/inventory-report.processor';
import { StockMovementProcessor } from './processors/stock-movement.processor';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    TenantModule,

    // Cache configuration for inventory data
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL for inventory data
      max: 1000, // Maximum number of items in cache
    }),

    // Queue configuration for background processing
    BullModule.registerQueue(
      {
        name: 'stock-alerts',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'inventory-reports',
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 5,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'stock-movements',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
    ),
  ],
  controllers: [
    ProductController,
    SupplierController,
    PurchaseOrderController,
    StockMovementController,
    InventoryAdjustmentController,
    StockAlertController,
    InventoryReportController,
  ],
  providers: [
    // Repositories
    ProductRepository,
    SupplierRepository,
    PurchaseOrderRepository,
    StockMovementRepository,
    InventoryAdjustmentRepository,
    StockAlertRepository,
    InventoryReportRepository,

    // Services
    ProductService,
    SupplierService,
    PurchaseOrderService,
    StockMovementService,
    InventoryAdjustmentService,
    StockAlertService,
    InventoryReportService,

    // Utility Services
    InventoryCacheService,
    InventoryValidationService,
    InventoryNotificationService,
    BarcodeService,
    StockLevelService,
    InventoryAnalyticsService,
    ZraIntegrationService,
    OrganizationResolverService,

    // Processors
    StockAlertProcessor,
    InventoryReportProcessor,
    StockMovementProcessor,
  ],
  exports: [
    // Export services for use in other modules
    ProductService,
    SupplierService,
    PurchaseOrderService,
    StockMovementService,
    InventoryAdjustmentService,
    StockAlertService,
    InventoryReportService,
    InventoryCacheService,
    InventoryValidationService,
    BarcodeService,
    StockLevelService,
    InventoryAnalyticsService,
    ZraIntegrationService,
  ],
})
export class InventoryModule {
  constructor() {
    console.log('🏭 Inventory Management Module initialized');
  }
}
