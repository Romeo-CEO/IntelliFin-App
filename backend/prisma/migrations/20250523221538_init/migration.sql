-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'BAD_DEBT');

-- CreateEnum
CREATE TYPE "ZraSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MobileMoneyProvider" AS ENUM ('AIRTEL_MONEY', 'MTN_MONEY', 'ZAMTEL_KWACHA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'TRANSFER', 'FEE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY');

-- CreateEnum
CREATE TYPE "SyncFrequency" AS ENUM ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "schema_name" VARCHAR(50) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "business_type" VARCHAR(50),
    "zra_tin" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Zambia',
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "industry" VARCHAR(100),
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscription_start_date" TIMESTAMP(3),
    "subscription_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "avatar" VARCHAR(255),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires" TIMESTAMP(3),
    "reset_password_token" VARCHAR(255),
    "reset_password_expires" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "settings" JSONB,
    "timezone" VARCHAR(50) DEFAULT 'Africa/Lusaka',
    "language" VARCHAR(5) DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "refresh_token" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "device_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "features" JSONB,
    "limits" JSONB,
    "billing_cycle" VARCHAR(20),
    "amount" DECIMAL(10,2),
    "currency" VARCHAR(3) DEFAULT 'ZMW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "tenant_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "resource_id" VARCHAR(255),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "zra_tin" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Zambia',
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "industry" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "bank_account_number" VARCHAR(50),
    "bank_branch" VARCHAR(100),
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 1,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Lusaka',
    "date_format" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    "logo" VARCHAR(255),
    "primary_color" VARCHAR(7),
    "secondary_color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
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
    "payment_terms" INTEGER NOT NULL DEFAULT 14,
    "credit_limit" DECIMAL(15,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "terms" TEXT,
    "payment_instructions" TEXT,
    "zra_submission_status" "ZraSubmissionStatus",
    "zra_submission_id" VARCHAR(100),
    "zra_submission_date" TIMESTAMP(3),
    "zra_receipt_number" VARCHAR(100),
    "zra_qr_code" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 16,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "discount_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID,
    "customer_id" UUID NOT NULL,
    "transaction_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "transaction_id" UUID,
    "vendor" VARCHAR(255),
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "description" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_pattern" "RecurrencePattern",
    "recurrence_end_date" DATE,
    "parent_expense_id" UUID,
    "is_tax_deductible" BOOLEAN NOT NULL DEFAULT true,
    "vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withholding_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_path" VARCHAR(255) NOT NULL,
    "thumbnail_path" VARCHAR(255),
    "ocr_text" TEXT,
    "ocr_data" JSONB,
    "ocr_status" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "ocr_processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "amount_limit" DECIMAL(15,2),
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "requires_receipt" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_tags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_tag_links" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "expense_tag_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_money_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider" "MobileMoneyProvider" NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_linked" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMP(3),
    "sync_frequency" "SyncFrequency" NOT NULL DEFAULT 'HOURLY',
    "current_balance" DECIMAL(15,2),
    "available_balance" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "balance_updated_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mobile_money_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "external_id" VARCHAR(100) NOT NULL,
    "reference" VARCHAR(100),
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "type" "TransactionType" NOT NULL,
    "counterparty_name" VARCHAR(255),
    "counterparty_number" VARCHAR(50),
    "description" TEXT,
    "balance_after" DECIMAL(15,2),
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "category_id" UUID,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "invoice_id" UUID,
    "expense_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "parent_id" UUID,
    "chart_of_accounts_code" VARCHAR(20),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(7),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "transactions_count" INTEGER NOT NULL DEFAULT 0,
    "new_transactions" INTEGER NOT NULL DEFAULT 0,
    "updated_transactions" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_schema_name_key" ON "tenants"("schema_name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_zra_tin_key" ON "tenants"("zra_tin");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_zra_tin_idx" ON "tenants"("zra_tin");

-- CreateIndex
CREATE INDEX "tenants_schema_name_idx" ON "tenants"("schema_name");

-- CreateIndex
CREATE INDEX "tenants_subscription_status_idx" ON "tenants"("subscription_status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_email_verified_idx" ON "users"("email_verified");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_is_active_idx" ON "user_sessions"("is_active");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenant_id_idx" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_end_date_idx" ON "tenant_subscriptions"("end_date");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_zra_tin_key" ON "organizations"("zra_tin");

-- CreateIndex
CREATE INDEX "organizations_zra_tin_idx" ON "organizations"("zra_tin");

-- CreateIndex
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");

-- CreateIndex
CREATE INDEX "customers_zra_tin_idx" ON "customers"("zra_tin");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_zra_submission_status_idx" ON "invoices"("zra_submission_status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_invoice_number_key" ON "invoices"("organization_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_idx" ON "payments"("organization_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_transaction_id_key" ON "expenses"("transaction_id");

-- CreateIndex
CREATE INDEX "expenses_organization_id_idx" ON "expenses"("organization_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_transaction_id_idx" ON "expenses"("transaction_id");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_created_by_idx" ON "expenses"("created_by");

-- CreateIndex
CREATE INDEX "expenses_is_recurring_idx" ON "expenses"("is_recurring");

-- CreateIndex
CREATE INDEX "receipts_expense_id_idx" ON "receipts"("expense_id");

-- CreateIndex
CREATE INDEX "receipts_ocr_status_idx" ON "receipts"("ocr_status");

-- CreateIndex
CREATE INDEX "expense_policies_organization_id_idx" ON "expense_policies"("organization_id");

-- CreateIndex
CREATE INDEX "expense_policies_category_id_idx" ON "expense_policies"("category_id");

-- CreateIndex
CREATE INDEX "expense_policies_active_idx" ON "expense_policies"("active");

-- CreateIndex
CREATE INDEX "expense_tags_organization_id_idx" ON "expense_tags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_tags_organization_id_name_key" ON "expense_tags"("organization_id", "name");

-- CreateIndex
CREATE INDEX "expense_tag_links_expense_id_idx" ON "expense_tag_links"("expense_id");

-- CreateIndex
CREATE INDEX "expense_tag_links_tag_id_idx" ON "expense_tag_links"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_tag_links_expense_id_tag_id_key" ON "expense_tag_links"("expense_id", "tag_id");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_organization_id_idx" ON "mobile_money_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_provider_idx" ON "mobile_money_accounts"("provider");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_is_active_idx" ON "mobile_money_accounts"("is_active");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_is_linked_idx" ON "mobile_money_accounts"("is_linked");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_money_accounts_organization_id_provider_account_numb_key" ON "mobile_money_accounts"("organization_id", "provider", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_expense_id_key" ON "transactions"("expense_id");

-- CreateIndex
CREATE INDEX "transactions_organization_id_idx" ON "transactions"("organization_id");

-- CreateIndex
CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");

-- CreateIndex
CREATE INDEX "transactions_external_id_idx" ON "transactions"("external_id");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_category_id_idx" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "transactions_invoice_id_idx" ON "transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "transactions_expense_id_idx" ON "transactions"("expense_id");

-- CreateIndex
CREATE INDEX "transactions_is_reconciled_idx" ON "transactions"("is_reconciled");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_organization_id_external_id_key" ON "transactions"("organization_id", "external_id");

-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE INDEX "categories_type_idx" ON "categories"("type");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_system_idx" ON "categories"("is_system");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_name_parent_id_key" ON "categories"("organization_id", "name", "parent_id");

-- CreateIndex
CREATE INDEX "sync_jobs_organization_id_idx" ON "sync_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "sync_jobs_account_id_idx" ON "sync_jobs"("account_id");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_parent_expense_id_fkey" FOREIGN KEY ("parent_expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_tags" ADD CONSTRAINT "expense_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_tag_links" ADD CONSTRAINT "expense_tag_links_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_tag_links" ADD CONSTRAINT "expense_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "expense_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_money_accounts" ADD CONSTRAINT "mobile_money_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mobile_money_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mobile_money_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
