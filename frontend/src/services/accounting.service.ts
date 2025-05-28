import { apiClient } from '../lib/api-client';

// Types for Chart of Accounts
export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType?: string;
  parentAccountId?: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  isActive: boolean;
  isSystem: boolean;
  isBankAccount: boolean;
  isTaxAccount: boolean;
  currentBalance: number;
  currency: string;
  description?: string;
  accountNumber?: string;
  bankName?: string;
  taxCode?: string;
  createdAt: string;
  updatedAt: string;
  parentAccount?: {
    id: string;
    accountCode: string;
    accountName: string;
  };
  childAccounts?: Account[];
  _count?: {
    generalLedgerEntries: number;
    debitEntries: number;
    creditEntries: number;
  };
}

export interface CreateAccountData {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType?: string;
  parentAccountId?: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  isActive?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  currentBalance?: number;
  currency?: string;
  description?: string;
  accountNumber?: string;
  bankName?: string;
  taxCode?: string;
}

export interface UpdateAccountData {
  accountName?: string;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType?: string;
  parentAccountId?: string;
  normalBalance?: 'DEBIT' | 'CREDIT';
  isActive?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  currentBalance?: number;
  description?: string;
  accountNumber?: string;
  bankName?: string;
  taxCode?: string;
}

export interface AccountQuery {
  page?: number;
  limit?: number;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType?: string;
  parentAccountId?: string;
  isActive?: boolean;
  isSystem?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Types for Journal Entries
export interface JournalEntryLine {
  id?: string;
  accountCode?: string;
  accountId?: string;
  debitAmount?: number;
  creditAmount?: number;
  description?: string;
  reference?: string;
  lineNumber?: number;
  debitAccount?: {
    accountCode: string;
    accountName: string;
  };
  creditAccount?: {
    accountCode: string;
    accountName: string;
  };
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  entryType: 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING' | 'OPENING' | 'CORRECTION';
  isReversing: boolean;
  reversedEntryId?: string;
  isPosted: boolean;
  postedAt?: string;
  postedBy?: string;
  sourceType?: 'INVOICE' | 'PAYMENT' | 'EXPENSE' | 'TRANSACTION' | 'MANUAL';
  sourceId?: string;
  totalDebit: number;
  totalCredit: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: JournalEntryLine[];
}

export interface CreateJournalEntryData {
  entryDate: string;
  description: string;
  reference?: string;
  entryType: 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING' | 'OPENING' | 'CORRECTION';
  sourceType?: 'INVOICE' | 'PAYMENT' | 'EXPENSE' | 'TRANSACTION' | 'MANUAL';
  sourceId?: string;
  lines: {
    accountCode?: string;
    accountId?: string;
    debitAmount?: number;
    creditAmount?: number;
    description?: string;
    reference?: string;
  }[];
}

// Types for General Ledger
export interface GeneralLedgerEntry {
  id: string;
  accountId: string;
  journalEntryId: string;
  entryDate: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  createdAt: string;
  account: {
    accountCode: string;
    accountName: string;
    accountType: string;
    normalBalance: string;
  };
  journalEntry: {
    entryNumber: string;
    entryType: string;
    isPosted: boolean;
  };
}

export interface TrialBalance {
  accounts: {
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    normalBalance: string;
    debitTotal: number;
    creditTotal: number;
    balance: number;
    runningBalance: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface BalanceSheet {
  assets: {
    currentAssets: any[];
    nonCurrentAssets: any[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: any[];
    nonCurrentLiabilities: any[];
    totalLiabilities: number;
  };
  equity: {
    equityAccounts: any[];
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface IncomeStatement {
  revenue: {
    operatingRevenue: any[];
    nonOperatingRevenue: any[];
    totalRevenue: number;
  };
  expenses: {
    costOfGoodsSold: any[];
    operatingExpenses: any[];
    nonOperatingExpenses: any[];
    totalExpenses: number;
  };
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  periodFrom: string;
  periodTo: string;
}

class AccountingService {
  private baseUrl = '/accounting';

  // Chart of Accounts methods
  async initializeChartOfAccounts(includeDefaultAccounts: boolean = true): Promise<{ accountsCreated: number; accounts: Account[] }> {
    const response = await apiClient.post(`${this.baseUrl}/accounts/initialize`, {
      includeDefaultAccounts,
    });
    return response.data;
  }

  async getAccounts(query?: AccountQuery): Promise<{
    accounts: Account[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`${this.baseUrl}/accounts?${params.toString()}`);
    return response.data;
  }

  async getAccountById(id: string): Promise<Account> {
    const response = await apiClient.get(`${this.baseUrl}/accounts/${id}`);
    return response.data;
  }

  async createAccount(data: CreateAccountData): Promise<Account> {
    const response = await apiClient.post(`${this.baseUrl}/accounts`, data);
    return response.data;
  }

  async updateAccount(id: string, data: UpdateAccountData): Promise<Account> {
    const response = await apiClient.put(`${this.baseUrl}/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string): Promise<Account> {
    const response = await apiClient.delete(`${this.baseUrl}/accounts/${id}`);
    return response.data;
  }

  async getAccountHierarchy(accountType?: string): Promise<Account[]> {
    const params = accountType ? `?accountType=${accountType}` : '';
    const response = await apiClient.get(`${this.baseUrl}/accounts/hierarchy${params}`);
    return response.data;
  }

  async getAccountsByType(accountType: string): Promise<Account[]> {
    const response = await apiClient.get(`${this.baseUrl}/accounts/by-type/${accountType}`);
    return response.data;
  }

  async getBankAccounts(): Promise<Account[]> {
    const response = await apiClient.get(`${this.baseUrl}/accounts/bank-accounts`);
    return response.data;
  }

  async getTaxAccounts(): Promise<Account[]> {
    const response = await apiClient.get(`${this.baseUrl}/accounts/tax-accounts`);
    return response.data;
  }

  async getAccountSummary(): Promise<{
    totalAccounts: number;
    accountsByType: Record<string, number>;
    bankAccounts: number;
    taxAccounts: number;
    systemAccounts: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/accounts/summary`);
    return response.data;
  }

  // Journal Entry methods
  async getJournalEntries(query?: any): Promise<{
    entries: JournalEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`${this.baseUrl}/journal-entries?${params.toString()}`);
    return response.data;
  }

  async getJournalEntryById(id: string): Promise<JournalEntry> {
    const response = await apiClient.get(`${this.baseUrl}/journal-entries/${id}`);
    return response.data;
  }

  async createJournalEntry(data: CreateJournalEntryData): Promise<JournalEntry> {
    const response = await apiClient.post(`${this.baseUrl}/journal-entries`, data);
    return response.data;
  }

  async updateJournalEntry(id: string, data: any): Promise<JournalEntry> {
    const response = await apiClient.put(`${this.baseUrl}/journal-entries/${id}`, data);
    return response.data;
  }

  async postJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiClient.post(`${this.baseUrl}/journal-entries/${id}/post`);
    return response.data;
  }

  async reverseJournalEntry(id: string, data: { reversalDate: string; reversalReason: string }): Promise<JournalEntry> {
    const response = await apiClient.post(`${this.baseUrl}/journal-entries/${id}/reverse`, data);
    return response.data;
  }

  async deleteJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiClient.delete(`${this.baseUrl}/journal-entries/${id}`);
    return response.data;
  }

  // General Ledger methods
  async getGeneralLedgerEntries(query?: any): Promise<{
    entries: GeneralLedgerEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/entries?${params.toString()}`);
    return response.data;
  }

  async getAccountLedger(accountId: string, dateFrom?: string, dateTo?: string): Promise<GeneralLedgerEntry[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/account/${accountId}/ledger?${params.toString()}`);
    return response.data;
  }

  async getAccountBalance(accountId: string, asOfDate?: string): Promise<{
    accountId: string;
    balance: number;
    asOfDate: string;
  }> {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/account/${accountId}/balance${params}`);
    return response.data;
  }

  async getTrialBalance(asOfDate?: string): Promise<TrialBalance> {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/trial-balance${params}`);
    return response.data;
  }

  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheet> {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/balance-sheet${params}`);
    return response.data;
  }

  async getIncomeStatement(periodFrom: string, periodTo: string): Promise<IncomeStatement> {
    const params = `?periodFrom=${periodFrom}&periodTo=${periodTo}`;
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/income-statement${params}`);
    return response.data;
  }

  async validateGeneralLedgerIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/general-ledger/validate-integrity`);
    return response.data;
  }
}

export const accountingService = new AccountingService();
