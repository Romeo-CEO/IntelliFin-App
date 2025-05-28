import { Injectable, Logger } from '@nestjs/common';

export interface ZambianAccountCode {
  code: string;
  name: string;
  description: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subcategory: string;
  isTaxDeductible?: boolean;
  vatApplicable?: boolean;
  parentCode?: string;
}

@Injectable()
export class ChartOfAccountsService {
  private readonly logger = new Logger(ChartOfAccountsService.name);

  /**
   * Get Zambian Chart of Accounts for SMEs
   * Based on Zambian accounting standards and ZRA requirements
   */
  getZambianChartOfAccounts(): ZambianAccountCode[] {
    return [
      // ASSETS
      {
        code: '1000',
        name: 'Current Assets',
        description: 'Assets that can be converted to cash within one year',
        category: 'ASSET',
        subcategory: 'Current Assets',
      },
      {
        code: '1100',
        name: 'Cash and Cash Equivalents',
        description: 'Cash on hand and in banks',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1000',
      },
      {
        code: '1110',
        name: 'Cash on Hand',
        description: 'Physical cash in the business',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1100',
      },
      {
        code: '1120',
        name: 'Bank Accounts',
        description: 'Money in bank accounts',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1100',
      },
      {
        code: '1130',
        name: 'Mobile Money Accounts',
        description: 'Airtel Money, MTN Mobile Money, Zamtel Kwacha',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1100',
      },
      {
        code: '1200',
        name: 'Accounts Receivable',
        description: 'Money owed by customers',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1000',
      },
      {
        code: '1300',
        name: 'Inventory',
        description: 'Goods held for sale',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1000',
      },
      {
        code: '1400',
        name: 'Prepaid Expenses',
        description: 'Expenses paid in advance',
        category: 'ASSET',
        subcategory: 'Current Assets',
        parentCode: '1000',
      },
      {
        code: '1500',
        name: 'Fixed Assets',
        description: 'Long-term assets',
        category: 'ASSET',
        subcategory: 'Fixed Assets',
      },
      {
        code: '1510',
        name: 'Equipment',
        description: 'Business equipment and machinery',
        category: 'ASSET',
        subcategory: 'Fixed Assets',
        parentCode: '1500',
      },
      {
        code: '1520',
        name: 'Vehicles',
        description: 'Business vehicles',
        category: 'ASSET',
        subcategory: 'Fixed Assets',
        parentCode: '1500',
      },
      {
        code: '1530',
        name: 'Buildings',
        description: 'Business buildings and property',
        category: 'ASSET',
        subcategory: 'Fixed Assets',
        parentCode: '1500',
      },

      // LIABILITIES
      {
        code: '2000',
        name: 'Current Liabilities',
        description: 'Debts due within one year',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
      },
      {
        code: '2100',
        name: 'Accounts Payable',
        description: 'Money owed to suppliers',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2000',
      },
      {
        code: '2200',
        name: 'VAT Payable',
        description: 'VAT owed to ZRA',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2000',
      },
      {
        code: '2210',
        name: 'Input VAT',
        description: 'VAT paid on purchases',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2200',
      },
      {
        code: '2220',
        name: 'Output VAT',
        description: 'VAT collected on sales',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2200',
      },
      {
        code: '2300',
        name: 'PAYE Payable',
        description: 'Pay As You Earn tax owed to ZRA',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2000',
      },
      {
        code: '2400',
        name: 'Withholding Tax Payable',
        description: 'Withholding tax owed to ZRA',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2000',
      },
      {
        code: '2500',
        name: 'Short-term Loans',
        description: 'Loans due within one year',
        category: 'LIABILITY',
        subcategory: 'Current Liabilities',
        parentCode: '2000',
      },

      // EQUITY
      {
        code: '3000',
        name: 'Owner\'s Equity',
        description: 'Owner\'s investment in the business',
        category: 'EQUITY',
        subcategory: 'Equity',
      },
      {
        code: '3100',
        name: 'Capital',
        description: 'Initial and additional capital invested',
        category: 'EQUITY',
        subcategory: 'Equity',
        parentCode: '3000',
      },
      {
        code: '3200',
        name: 'Retained Earnings',
        description: 'Accumulated profits retained in business',
        category: 'EQUITY',
        subcategory: 'Equity',
        parentCode: '3000',
      },

      // REVENUE
      {
        code: '4000',
        name: 'Revenue',
        description: 'Income from business operations',
        category: 'REVENUE',
        subcategory: 'Operating Revenue',
      },
      {
        code: '4100',
        name: 'Sales Revenue',
        description: 'Revenue from sale of goods',
        category: 'REVENUE',
        subcategory: 'Operating Revenue',
        parentCode: '4000',
        vatApplicable: true,
      },
      {
        code: '4200',
        name: 'Service Revenue',
        description: 'Revenue from services provided',
        category: 'REVENUE',
        subcategory: 'Operating Revenue',
        parentCode: '4000',
        vatApplicable: true,
      },
      {
        code: '4300',
        name: 'Other Income',
        description: 'Non-operating income',
        category: 'REVENUE',
        subcategory: 'Other Revenue',
        parentCode: '4000',
      },

      // EXPENSES
      {
        code: '5000',
        name: 'Cost of Goods Sold',
        description: 'Direct costs of producing goods sold',
        category: 'EXPENSE',
        subcategory: 'Cost of Sales',
        isTaxDeductible: true,
      },
      {
        code: '5100',
        name: 'Purchases',
        description: 'Cost of goods purchased for resale',
        category: 'EXPENSE',
        subcategory: 'Cost of Sales',
        parentCode: '5000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6000',
        name: 'Operating Expenses',
        description: 'Expenses for running the business',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        isTaxDeductible: true,
      },
      {
        code: '6100',
        name: 'Salaries and Wages',
        description: 'Employee compensation',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
      },
      {
        code: '6200',
        name: 'Rent Expense',
        description: 'Office and business premises rent',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6300',
        name: 'Utilities',
        description: 'Electricity, water, internet, phone',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6400',
        name: 'Office Supplies',
        description: 'Stationery, printing, office materials',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6500',
        name: 'Marketing and Advertising',
        description: 'Promotional and marketing expenses',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6600',
        name: 'Professional Services',
        description: 'Legal, accounting, consulting fees',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6700',
        name: 'Transportation',
        description: 'Vehicle expenses, fuel, maintenance',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
        vatApplicable: true,
      },
      {
        code: '6800',
        name: 'Insurance',
        description: 'Business insurance premiums',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
      },
      {
        code: '6900',
        name: 'Bank Charges',
        description: 'Banking fees and charges',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
      },
      {
        code: '6950',
        name: 'Mobile Money Charges',
        description: 'Mobile money transaction fees',
        category: 'EXPENSE',
        subcategory: 'Operating Expenses',
        parentCode: '6000',
        isTaxDeductible: true,
      },
      {
        code: '7000',
        name: 'Depreciation',
        description: 'Depreciation of fixed assets',
        category: 'EXPENSE',
        subcategory: 'Non-Cash Expenses',
        isTaxDeductible: true,
      },
      {
        code: '8000',
        name: 'Interest Expense',
        description: 'Interest on loans and borrowings',
        category: 'EXPENSE',
        subcategory: 'Financial Expenses',
        isTaxDeductible: true,
      },
      {
        code: '9000',
        name: 'Tax Expenses',
        description: 'Corporate income tax and other taxes',
        category: 'EXPENSE',
        subcategory: 'Tax Expenses',
        isTaxDeductible: false,
      },
    ];
  }

  /**
   * Get expense categories suitable for Zambian SMEs
   */
  getExpenseCategories(): ZambianAccountCode[] {
    return this.getZambianChartOfAccounts().filter(
      account => account.category === 'EXPENSE'
    );
  }

  /**
   * Get account by code
   */
  getAccountByCode(code: string): ZambianAccountCode | undefined {
    return this.getZambianChartOfAccounts().find(account => account.code === code);
  }

  /**
   * Check if an expense category is tax deductible
   */
  isTaxDeductible(accountCode: string): boolean {
    const account = this.getAccountByCode(accountCode);
    return account?.isTaxDeductible ?? false;
  }

  /**
   * Check if VAT is applicable for an account
   */
  isVatApplicable(accountCode: string): boolean {
    const account = this.getAccountByCode(accountCode);
    return account?.vatApplicable ?? false;
  }

  /**
   * Get accounts by category
   */
  getAccountsByCategory(category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'): ZambianAccountCode[] {
    return this.getZambianChartOfAccounts().filter(account => account.category === category);
  }

  /**
   * Get child accounts for a parent account
   */
  getChildAccounts(parentCode: string): ZambianAccountCode[] {
    return this.getZambianChartOfAccounts().filter(account => account.parentCode === parentCode);
  }
}
