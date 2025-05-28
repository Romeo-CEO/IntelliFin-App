-- Tenant Schema Template for IntelliFin
-- This template is used to create the initial schema structure for new tenants
-- It includes all tenant-specific tables with proper indexes and constraints

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table (one per tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    zra_tin VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Zambia',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    industry VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(100),
    default_currency VARCHAR(3) DEFAULT 'ZMW',
    fiscal_year_start INTEGER DEFAULT 1,
    timezone VARCHAR(50) DEFAULT 'Africa/Lusaka',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    logo VARCHAR(255),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Zambia',
    zra_tin VARCHAR(20),
    payment_terms INTEGER DEFAULT 14,
    credit_limit DECIMAL(15,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY')),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    chart_of_accounts_code VARCHAR(20),
    is_system BOOLEAN DEFAULT false,
    color VARCHAR(7),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mobile Money Accounts table
CREATE TABLE mobile_money_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('AIRTEL_MONEY', 'MTN_MONEY', 'ZAMTEL_KWACHA')),
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_linked BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(20) DEFAULT 'HOURLY' CHECK (sync_frequency IN ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY')),
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZMW',
    balance_updated_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    reference VARCHAR(100),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZMW',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'BAD_DEBT')),
    notes TEXT,
    terms TEXT,
    payment_instructions TEXT,
    zra_submission_status VARCHAR(20) CHECK (zra_submission_status IN ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR')),
    zra_submission_id VARCHAR(100),
    zra_submission_date TIMESTAMP WITH TIME ZONE,
    zra_receipt_number VARCHAR(100),
    zra_qr_code TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Invoice Items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 16,
    vat_amount DECIMAL(15,2) NOT NULL,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    transaction_id UUID,
    vendor VARCHAR(255),
    date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZMW',
    description TEXT NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'OTHER')),
    reference VARCHAR(100),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY')),
    recurrence_end_date DATE,
    parent_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    is_tax_deductible BOOLEAN DEFAULT true,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    withholding_tax DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID')),
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES mobile_money_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(100) NOT NULL,
    reference VARCHAR(100),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZMW',
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'TRANSFER', 'FEE', 'REFUND', 'ADJUSTMENT')),
    counterparty_name VARCHAR(255),
    counterparty_number VARCHAR(50),
    description TEXT,
    balance_after DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED')),
    fees DECIMAL(15,2) DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_reconciled BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZMW',
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'OTHER')),
    reference VARCHAR(100),
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_customers_zra_tin ON customers(zra_tin);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_is_active ON customers(is_active);

CREATE INDEX idx_categories_organization_id ON categories(organization_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_system ON categories(is_system);
CREATE INDEX idx_categories_is_active ON categories(is_active);

CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_zra_submission_status ON invoices(zra_submission_status);

CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

CREATE INDEX idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_external_id ON transactions(external_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_is_reconciled ON transactions(is_reconciled);

CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Create unique constraints
CREATE UNIQUE INDEX idx_invoices_organization_invoice_number ON invoices(organization_id, invoice_number);
CREATE UNIQUE INDEX idx_transactions_organization_external_id ON transactions(organization_id, external_id);
CREATE UNIQUE INDEX idx_categories_organization_name_parent ON categories(organization_id, name, parent_id);
CREATE UNIQUE INDEX idx_mobile_money_accounts_org_provider_number ON mobile_money_accounts(organization_id, provider, account_number);

-- Add audit trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mobile_money_accounts_updated_at BEFORE UPDATE ON mobile_money_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
