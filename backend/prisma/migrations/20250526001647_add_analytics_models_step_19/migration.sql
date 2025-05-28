-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubType" AS ENUM ('CURRENT_ASSET', 'NON_CURRENT_ASSET', 'FIXED_ASSET', 'INTANGIBLE_ASSET', 'CASH_AND_EQUIVALENTS', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'PREPAID_EXPENSES', 'INVESTMENTS', 'PROPERTY_PLANT_EQUIPMENT', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'ACCOUNTS_PAYABLE', 'ACCRUED_EXPENSES', 'SHORT_TERM_DEBT', 'LONG_TERM_DEBT', 'TAX_LIABILITY', 'OWNER_EQUITY', 'RETAINED_EARNINGS', 'CAPITAL_STOCK', 'ADDITIONAL_PAID_IN_CAPITAL', 'TREASURY_STOCK', 'OPERATING_REVENUE', 'NON_OPERATING_REVENUE', 'SALES_REVENUE', 'SERVICE_REVENUE', 'INTEREST_INCOME', 'OTHER_INCOME', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE', 'COST_OF_GOODS_SOLD', 'ADMINISTRATIVE_EXPENSE', 'SELLING_EXPENSE', 'INTEREST_EXPENSE', 'TAX_EXPENSE', 'DEPRECIATION_EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING', 'OPENING', 'CORRECTION');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('INVOICE', 'PAYMENT', 'EXPENSE', 'TRANSACTION', 'MANUAL', 'ADJUSTMENT', 'DEPRECIATION', 'ACCRUAL', 'BANK_RECONCILIATION');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'INCOME_TAX', 'PAYE', 'WITHHOLDING_TAX', 'ADVANCE_TAX', 'TURNOVER_TAX', 'PROPERTY_TAX', 'EXCISE_TAX');

-- CreateEnum
CREATE TYPE "TaxPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'FILED', 'PAID', 'OVERDUE', 'AMENDED');

-- CreateEnum
CREATE TYPE "TaxObligationType" AS ENUM ('FILING', 'PAYMENT', 'WITHHOLDING', 'ADVANCE_PAYMENT', 'PENALTY', 'INTEREST');

-- CreateEnum
CREATE TYPE "TaxObligationStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'PARTIALLY_PAID', 'WAIVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "WithholdingCertificateStatus" AS ENUM ('ISSUED', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxAdjustmentType" AS ENUM ('CORRECTION', 'AMENDMENT', 'REFUND_CLAIM', 'PENALTY_WAIVER', 'INTEREST_WAIVER', 'OVERPAYMENT', 'UNDERPAYMENT');

-- CreateEnum
CREATE TYPE "TaxAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxFilingType" AS ENUM ('VAT_RETURN', 'INCOME_TAX', 'PAYE_RETURN', 'WHT_RETURN', 'ADVANCE_TAX', 'TURNOVER_TAX', 'AMENDED_RETURN');

-- CreateEnum
CREATE TYPE "TaxFilingStatus" AS ENUM ('DRAFT', 'PREPARED', 'SUBMITTED', 'ACKNOWLEDGED', 'PROCESSED', 'REJECTED', 'AMENDED');

-- CreateEnum
CREATE TYPE "TaxResidencyStatus" AS ENUM ('RESIDENT', 'NON_RESIDENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WidgetType" ADD VALUE 'CASH_FLOW';
ALTER TYPE "WidgetType" ADD VALUE 'REVENUE_EXPENSES';
ALTER TYPE "WidgetType" ADD VALUE 'KPI_SUMMARY';
ALTER TYPE "WidgetType" ADD VALUE 'RECEIVABLES_AGING';
ALTER TYPE "WidgetType" ADD VALUE 'REVENUE_FORECAST';
ALTER TYPE "WidgetType" ADD VALUE 'EXPENSE_TRENDS';
ALTER TYPE "WidgetType" ADD VALUE 'PROFITABILITY_ANALYSIS';
ALTER TYPE "WidgetType" ADD VALUE 'TAX_ANALYTICS';
ALTER TYPE "WidgetType" ADD VALUE 'FINANCIAL_HEALTH';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gross_amount" DECIMAL(15,2),
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "withholding_certificate_id" UUID,
ADD COLUMN     "withholding_tax_amount" DECIMAL(15,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "customer_tax_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tin_number" VARCHAR(20),
    "tin_validated" BOOLEAN NOT NULL DEFAULT false,
    "tin_validated_at" TIMESTAMP(3),
    "vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "vat_number" VARCHAR(20),
    "withholding_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "exemption_reason" TEXT,
    "exemption_valid_until" DATE,
    "tax_residency" "TaxResidencyStatus" NOT NULL DEFAULT 'RESIDENT',
    "preferred_tax_treatment" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_code" VARCHAR(20) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "account_sub_type" "AccountSubType",
    "parent_account_id" UUID,
    "normal_balance" "NormalBalance" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_bank_account" BOOLEAN NOT NULL DEFAULT false,
    "is_tax_account" BOOLEAN NOT NULL DEFAULT false,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "description" TEXT,
    "account_number" VARCHAR(50),
    "bank_name" VARCHAR(100),
    "tax_code" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entry_number" VARCHAR(50) NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "reference" VARCHAR(100),
    "entry_type" "JournalEntryType" NOT NULL,
    "is_reversing" BOOLEAN NOT NULL DEFAULT false,
    "reversed_entry_id" UUID,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "source_type" "SourceType",
    "source_id" UUID,
    "total_debit" DECIMAL(15,2) NOT NULL,
    "total_credit" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "debit_account_id" UUID,
    "credit_account_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "reference" VARCHAR(100),
    "line_number" INTEGER NOT NULL,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_ledger_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "debit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "running_balance" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" VARCHAR(100),
    "source_type" "SourceType",
    "source_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "effective_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "filing_deadline" DATE NOT NULL,
    "payment_deadline" DATE NOT NULL,
    "status" "TaxPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "month" INTEGER,
    "filed_at" TIMESTAMP(3),
    "filed_by" UUID,
    "filing_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_obligations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tax_period_id" UUID NOT NULL,
    "obligation_type" "TaxObligationType" NOT NULL,
    "amount_due" DECIMAL(15,2) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "due_date" DATE NOT NULL,
    "status" "TaxObligationStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(100),
    "penalty_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "interest_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withholding_tax_certificates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID,
    "tax_period_id" UUID NOT NULL,
    "certificate_number" VARCHAR(50) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "supplier_tin" VARCHAR(20),
    "service_type" VARCHAR(100) NOT NULL,
    "service_description" TEXT,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "tax_withheld" DECIMAL(15,2) NOT NULL,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "withholding_rate" DECIMAL(5,4) NOT NULL,
    "issue_date" DATE NOT NULL,
    "payment_date" DATE NOT NULL,
    "status" "WithholdingCertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "submitted_to_zra" BOOLEAN NOT NULL DEFAULT false,
    "zra_submission_date" TIMESTAMP(3),
    "zra_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "withholding_tax_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_adjustments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tax_period_id" UUID NOT NULL,
    "adjustment_type" "TaxAdjustmentType" NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "adjusted_amount" DECIMAL(15,2) NOT NULL,
    "adjustment_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "supporting_docs" JSONB,
    "status" "TaxAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "submitted_to_zra" BOOLEAN NOT NULL DEFAULT false,
    "zra_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_filings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tax_period_id" UUID NOT NULL,
    "filing_type" "TaxFilingType" NOT NULL,
    "filing_data" JSONB NOT NULL,
    "calculated_tax" DECIMAL(15,2) NOT NULL,
    "tax_due" DECIMAL(15,2) NOT NULL,
    "tax_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "TaxFilingStatus" NOT NULL DEFAULT 'DRAFT',
    "prepared_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "zra_reference" VARCHAR(100),
    "zra_status" VARCHAR(50),
    "zra_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "prepared_by" UUID,
    "submitted_by" UUID,

    CONSTRAINT "tax_filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_configurations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "analytics_type" VARCHAR(50) NOT NULL,
    "configuration" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cache" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cache_key" VARCHAR(255) NOT NULL,
    "cache_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecasting_models" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "model_type" VARCHAR(50) NOT NULL,
    "model_parameters" JSONB NOT NULL,
    "accuracy_metrics" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_trained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecasting_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_insights" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "insight_type" VARCHAR(50) NOT NULL,
    "insight_data" JSONB NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_ratios_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "ratios_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ratios_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_tax_profiles_customer_id_key" ON "customer_tax_profiles"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tax_profiles_organization_id_idx" ON "customer_tax_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "customer_tax_profiles_tin_number_idx" ON "customer_tax_profiles"("tin_number");

-- CreateIndex
CREATE INDEX "customer_tax_profiles_vat_number_idx" ON "customer_tax_profiles"("vat_number");

-- CreateIndex
CREATE INDEX "customer_tax_profiles_withholding_tax_exempt_idx" ON "customer_tax_profiles"("withholding_tax_exempt");

-- CreateIndex
CREATE INDEX "accounts_organization_id_idx" ON "accounts"("organization_id");

-- CreateIndex
CREATE INDEX "accounts_account_type_idx" ON "accounts"("account_type");

-- CreateIndex
CREATE INDEX "accounts_account_sub_type_idx" ON "accounts"("account_sub_type");

-- CreateIndex
CREATE INDEX "accounts_parent_account_id_idx" ON "accounts"("parent_account_id");

-- CreateIndex
CREATE INDEX "accounts_is_active_idx" ON "accounts"("is_active");

-- CreateIndex
CREATE INDEX "accounts_is_system_idx" ON "accounts"("is_system");

-- CreateIndex
CREATE INDEX "accounts_is_bank_account_idx" ON "accounts"("is_bank_account");

-- CreateIndex
CREATE INDEX "accounts_account_code_idx" ON "accounts"("account_code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_organization_id_account_code_key" ON "accounts"("organization_id", "account_code");

-- CreateIndex
CREATE INDEX "journal_entries_organization_id_idx" ON "journal_entries"("organization_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_entry_type_idx" ON "journal_entries"("entry_type");

-- CreateIndex
CREATE INDEX "journal_entries_is_posted_idx" ON "journal_entries"("is_posted");

-- CreateIndex
CREATE INDEX "journal_entries_source_type_source_id_idx" ON "journal_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "journal_entries_created_by_idx" ON "journal_entries"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_organization_id_entry_number_key" ON "journal_entries"("organization_id", "entry_number");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journal_entry_id_idx" ON "journal_entry_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_debit_account_id_idx" ON "journal_entry_lines"("debit_account_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_credit_account_id_idx" ON "journal_entry_lines"("credit_account_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_line_number_idx" ON "journal_entry_lines"("line_number");

-- CreateIndex
CREATE INDEX "general_ledger_entries_organization_id_idx" ON "general_ledger_entries"("organization_id");

-- CreateIndex
CREATE INDEX "general_ledger_entries_account_id_idx" ON "general_ledger_entries"("account_id");

-- CreateIndex
CREATE INDEX "general_ledger_entries_journal_entry_id_idx" ON "general_ledger_entries"("journal_entry_id");

-- CreateIndex
CREATE INDEX "general_ledger_entries_entry_date_idx" ON "general_ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "general_ledger_entries_source_type_source_id_idx" ON "general_ledger_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "tax_rates_organization_id_idx" ON "tax_rates"("organization_id");

-- CreateIndex
CREATE INDEX "tax_rates_tax_type_idx" ON "tax_rates"("tax_type");

-- CreateIndex
CREATE INDEX "tax_rates_effective_date_idx" ON "tax_rates"("effective_date");

-- CreateIndex
CREATE INDEX "tax_rates_is_active_idx" ON "tax_rates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_organization_id_tax_type_effective_date_key" ON "tax_rates"("organization_id", "tax_type", "effective_date");

-- CreateIndex
CREATE INDEX "tax_periods_organization_id_idx" ON "tax_periods"("organization_id");

-- CreateIndex
CREATE INDEX "tax_periods_tax_type_idx" ON "tax_periods"("tax_type");

-- CreateIndex
CREATE INDEX "tax_periods_status_idx" ON "tax_periods"("status");

-- CreateIndex
CREATE INDEX "tax_periods_filing_deadline_idx" ON "tax_periods"("filing_deadline");

-- CreateIndex
CREATE INDEX "tax_periods_payment_deadline_idx" ON "tax_periods"("payment_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_organization_id_tax_type_period_start_period_en_key" ON "tax_periods"("organization_id", "tax_type", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "tax_obligations_organization_id_idx" ON "tax_obligations"("organization_id");

-- CreateIndex
CREATE INDEX "tax_obligations_tax_period_id_idx" ON "tax_obligations"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_obligations_obligation_type_idx" ON "tax_obligations"("obligation_type");

-- CreateIndex
CREATE INDEX "tax_obligations_status_idx" ON "tax_obligations"("status");

-- CreateIndex
CREATE INDEX "tax_obligations_due_date_idx" ON "tax_obligations"("due_date");

-- CreateIndex
CREATE INDEX "withholding_tax_certificates_organization_id_idx" ON "withholding_tax_certificates"("organization_id");

-- CreateIndex
CREATE INDEX "withholding_tax_certificates_tax_period_id_idx" ON "withholding_tax_certificates"("tax_period_id");

-- CreateIndex
CREATE INDEX "withholding_tax_certificates_supplier_tin_idx" ON "withholding_tax_certificates"("supplier_tin");

-- CreateIndex
CREATE INDEX "withholding_tax_certificates_issue_date_idx" ON "withholding_tax_certificates"("issue_date");

-- CreateIndex
CREATE INDEX "withholding_tax_certificates_status_idx" ON "withholding_tax_certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "withholding_tax_certificates_organization_id_certificate_nu_key" ON "withholding_tax_certificates"("organization_id", "certificate_number");

-- CreateIndex
CREATE INDEX "tax_adjustments_organization_id_idx" ON "tax_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "tax_adjustments_tax_period_id_idx" ON "tax_adjustments"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_adjustments_adjustment_type_idx" ON "tax_adjustments"("adjustment_type");

-- CreateIndex
CREATE INDEX "tax_adjustments_status_idx" ON "tax_adjustments"("status");

-- CreateIndex
CREATE INDEX "tax_adjustments_requested_at_idx" ON "tax_adjustments"("requested_at");

-- CreateIndex
CREATE INDEX "tax_filings_organization_id_idx" ON "tax_filings"("organization_id");

-- CreateIndex
CREATE INDEX "tax_filings_tax_period_id_idx" ON "tax_filings"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_filings_filing_type_idx" ON "tax_filings"("filing_type");

-- CreateIndex
CREATE INDEX "tax_filings_status_idx" ON "tax_filings"("status");

-- CreateIndex
CREATE INDEX "tax_filings_submitted_at_idx" ON "tax_filings"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_filings_organization_id_tax_period_id_filing_type_key" ON "tax_filings"("organization_id", "tax_period_id", "filing_type");

-- CreateIndex
CREATE INDEX "analytics_configurations_organization_id_idx" ON "analytics_configurations"("organization_id");

-- CreateIndex
CREATE INDEX "analytics_configurations_analytics_type_idx" ON "analytics_configurations"("analytics_type");

-- CreateIndex
CREATE INDEX "analytics_configurations_is_active_idx" ON "analytics_configurations"("is_active");

-- CreateIndex
CREATE INDEX "analytics_cache_organization_id_idx" ON "analytics_cache"("organization_id");

-- CreateIndex
CREATE INDEX "analytics_cache_expires_at_idx" ON "analytics_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cache_organization_id_cache_key_key" ON "analytics_cache"("organization_id", "cache_key");

-- CreateIndex
CREATE INDEX "forecasting_models_organization_id_idx" ON "forecasting_models"("organization_id");

-- CreateIndex
CREATE INDEX "forecasting_models_model_type_idx" ON "forecasting_models"("model_type");

-- CreateIndex
CREATE INDEX "forecasting_models_is_active_idx" ON "forecasting_models"("is_active");

-- CreateIndex
CREATE INDEX "forecasting_models_last_trained_at_idx" ON "forecasting_models"("last_trained_at");

-- CreateIndex
CREATE INDEX "analytics_insights_organization_id_idx" ON "analytics_insights"("organization_id");

-- CreateIndex
CREATE INDEX "analytics_insights_insight_type_idx" ON "analytics_insights"("insight_type");

-- CreateIndex
CREATE INDEX "analytics_insights_priority_idx" ON "analytics_insights"("priority");

-- CreateIndex
CREATE INDEX "analytics_insights_is_read_idx" ON "analytics_insights"("is_read");

-- CreateIndex
CREATE INDEX "analytics_insights_created_at_idx" ON "analytics_insights"("created_at");

-- CreateIndex
CREATE INDEX "financial_ratios_history_organization_id_idx" ON "financial_ratios_history"("organization_id");

-- CreateIndex
CREATE INDEX "financial_ratios_history_period_start_idx" ON "financial_ratios_history"("period_start");

-- CreateIndex
CREATE INDEX "financial_ratios_history_period_end_idx" ON "financial_ratios_history"("period_end");

-- CreateIndex
CREATE UNIQUE INDEX "financial_ratios_history_organization_id_period_start_perio_key" ON "financial_ratios_history"("organization_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "payments_withholding_certificate_id_idx" ON "payments"("withholding_certificate_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "customer_tax_profiles" ADD CONSTRAINT "customer_tax_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tax_profiles" ADD CONSTRAINT "customer_tax_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_withholding_certificate_id_fkey" FOREIGN KEY ("withholding_certificate_id") REFERENCES "withholding_tax_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_entry_id_fkey" FOREIGN KEY ("reversed_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger_entries" ADD CONSTRAINT "general_ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger_entries" ADD CONSTRAINT "general_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger_entries" ADD CONSTRAINT "general_ledger_entries_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withholding_tax_certificates" ADD CONSTRAINT "withholding_tax_certificates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withholding_tax_certificates" ADD CONSTRAINT "withholding_tax_certificates_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_adjustments" ADD CONSTRAINT "tax_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_adjustments" ADD CONSTRAINT "tax_adjustments_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_configurations" ADD CONSTRAINT "analytics_configurations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_cache" ADD CONSTRAINT "analytics_cache_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasting_models" ADD CONSTRAINT "forecasting_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_insights" ADD CONSTRAINT "analytics_insights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ratios_history" ADD CONSTRAINT "financial_ratios_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
