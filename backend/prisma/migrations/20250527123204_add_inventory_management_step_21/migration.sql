-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PurchaseOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderItemStatus" AS ENUM ('PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'BACKORDERED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockMovementSourceType" AS ENUM ('PURCHASE_ORDER', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'THEFT', 'EXPIRY', 'MANUAL');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('INCREASE', 'DECREASE', 'RECOUNT');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentReason" AS ENUM ('PHYSICAL_COUNT', 'DAMAGE', 'THEFT', 'EXPIRY', 'RETURN', 'SUPPLIER_CREDIT', 'WRITE_OFF', 'FOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'REORDER_POINT', 'EXPIRY_WARNING');

-- CreateEnum
CREATE TYPE "StockAlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');

-- CreateEnum
CREATE TYPE "InventoryReportType" AS ENUM ('STOCK_LEVELS', 'STOCK_MOVEMENTS', 'LOW_STOCK', 'VALUATION', 'ABC_ANALYSIS', 'AGING', 'TURNOVER', 'PURCHASE_ORDERS', 'SUPPLIER_PERFORMANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InventoryReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "brand" VARCHAR(100),
    "barcode" VARCHAR(100),
    "qr_code" VARCHAR(255),
    "zra_item_code" VARCHAR(50),
    "cost_price" DECIMAL(15,2) NOT NULL,
    "selling_price" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 16,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "current_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "maximum_stock" DECIMAL(10,3),
    "reorder_point" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "reorder_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_service" BOOLEAN NOT NULL DEFAULT false,
    "track_stock" BOOLEAN NOT NULL DEFAULT true,
    "images" VARCHAR(255)[],
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Zambia',
    "zra_tin" VARCHAR(20),
    "vat_number" VARCHAR(20),
    "business_type" VARCHAR(50),
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "credit_limit" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "rating" DECIMAL(3,2),
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "received_date" DATE,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "PurchaseOrderPriority" NOT NULL DEFAULT 'NORMAL',
    "delivery_address" TEXT,
    "delivery_instructions" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "description" VARCHAR(255),
    "quantity_ordered" DECIMAL(10,3) NOT NULL,
    "quantity_received" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 16,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "status" "PurchaseOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "movement_date" DATE NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "stock_before" DECIMAL(10,3) NOT NULL,
    "stock_after" DECIMAL(10,3) NOT NULL,
    "unit_cost" DECIMAL(15,2),
    "total_cost" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "source_type" "StockMovementSourceType",
    "source_id" UUID,
    "reference" VARCHAR(100),
    "reason" TEXT,
    "notes" TEXT,
    "location_from" VARCHAR(100),
    "location_to" VARCHAR(100),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "adjustment_number" VARCHAR(50) NOT NULL,
    "adjustment_date" DATE NOT NULL,
    "adjustment_type" "InventoryAdjustmentType" NOT NULL,
    "reason" "InventoryAdjustmentReason" NOT NULL,
    "quantity_before" DECIMAL(10,3) NOT NULL,
    "quantity_after" DECIMAL(10,3) NOT NULL,
    "adjustment_quantity" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "unit_cost" DECIMAL(15,2),
    "total_cost_impact" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "description" TEXT,
    "notes" TEXT,
    "reference" VARCHAR(100),
    "status" "InventoryAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "alert_type" "StockAlertType" NOT NULL,
    "alert_level" "StockAlertLevel" NOT NULL,
    "current_stock" DECIMAL(10,3) NOT NULL,
    "threshold_value" DECIMAL(10,3) NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(3),
    "notifications_sent" INTEGER NOT NULL DEFAULT 0,
    "last_notification_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "report_type" "InventoryReportType" NOT NULL,
    "report_name" VARCHAR(255) NOT NULL,
    "parameters" JSONB NOT NULL,
    "schedule" JSONB,
    "report_data" JSONB,
    "file_path" VARCHAR(255),
    "status" "InventoryReportStatus" NOT NULL DEFAULT 'PENDING',
    "generated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_zra_item_code_idx" ON "products"("zra_item_code");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_track_stock_idx" ON "products"("track_stock");

-- CreateIndex
CREATE INDEX "products_current_stock_idx" ON "products"("current_stock");

-- CreateIndex
CREATE INDEX "products_minimum_stock_idx" ON "products"("minimum_stock");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_sku_key" ON "products"("organization_id", "sku");

-- CreateIndex
CREATE INDEX "suppliers_organization_id_idx" ON "suppliers"("organization_id");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_zra_tin_idx" ON "suppliers"("zra_tin");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE INDEX "suppliers_is_preferred_idx" ON "suppliers"("is_preferred");

-- CreateIndex
CREATE INDEX "purchase_orders_organization_id_idx" ON "purchase_orders"("organization_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_order_date_idx" ON "purchase_orders"("order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_expected_date_idx" ON "purchase_orders"("expected_date");

-- CreateIndex
CREATE INDEX "purchase_orders_priority_idx" ON "purchase_orders"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_organization_id_order_number_key" ON "purchase_orders"("organization_id", "order_number");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_status_idx" ON "purchase_order_items"("status");

-- CreateIndex
CREATE INDEX "stock_movements_organization_id_idx" ON "stock_movements"("organization_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_source_type_idx" ON "stock_movements"("source_type");

-- CreateIndex
CREATE INDEX "stock_movements_source_id_idx" ON "stock_movements"("source_id");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- CreateIndex
CREATE INDEX "inventory_adjustments_organization_id_idx" ON "inventory_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_product_id_idx" ON "inventory_adjustments"("product_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_adjustment_type_idx" ON "inventory_adjustments"("adjustment_type");

-- CreateIndex
CREATE INDEX "inventory_adjustments_reason_idx" ON "inventory_adjustments"("reason");

-- CreateIndex
CREATE INDEX "inventory_adjustments_status_idx" ON "inventory_adjustments"("status");

-- CreateIndex
CREATE INDEX "inventory_adjustments_adjustment_date_idx" ON "inventory_adjustments"("adjustment_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustments_organization_id_adjustment_number_key" ON "inventory_adjustments"("organization_id", "adjustment_number");

-- CreateIndex
CREATE INDEX "stock_alerts_organization_id_idx" ON "stock_alerts"("organization_id");

-- CreateIndex
CREATE INDEX "stock_alerts_product_id_idx" ON "stock_alerts"("product_id");

-- CreateIndex
CREATE INDEX "stock_alerts_alert_type_idx" ON "stock_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "stock_alerts_alert_level_idx" ON "stock_alerts"("alert_level");

-- CreateIndex
CREATE INDEX "stock_alerts_is_active_idx" ON "stock_alerts"("is_active");

-- CreateIndex
CREATE INDEX "stock_alerts_is_acknowledged_idx" ON "stock_alerts"("is_acknowledged");

-- CreateIndex
CREATE INDEX "stock_alerts_created_at_idx" ON "stock_alerts"("created_at");

-- CreateIndex
CREATE INDEX "inventory_reports_organization_id_idx" ON "inventory_reports"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_reports_report_type_idx" ON "inventory_reports"("report_type");

-- CreateIndex
CREATE INDEX "inventory_reports_status_idx" ON "inventory_reports"("status");

-- CreateIndex
CREATE INDEX "inventory_reports_generated_at_idx" ON "inventory_reports"("generated_at");

-- CreateIndex
CREATE INDEX "inventory_reports_created_by_idx" ON "inventory_reports"("created_by");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reports" ADD CONSTRAINT "inventory_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
