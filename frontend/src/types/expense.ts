// Expense status enum
export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Payment method enum
export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

// Recurrence pattern enum
export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

// Category interface
export interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

// Receipt interface
export interface Receipt {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  ocrStatus?: string;
  createdAt: string;
}

// Expense tag interface
export interface ExpenseTag {
  id: string;
  name: string;
  color?: string;
}

// Transaction interface
export interface Transaction {
  id: string;
  amount: number;
  transactionDate: string;
  description: string;
}

// Main expense interface
export interface Expense {
  id: string;
  organizationId: string;
  category: Category;
  transaction?: Transaction;
  vendor?: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  isTaxDeductible: boolean;
  vatAmount: number;
  withholdingTax: number;
  status: ExpenseStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receipts?: Receipt[];
  tags?: ExpenseTag[];
}

// Create expense DTO
export interface CreateExpenseDto {
  categoryId: string;
  transactionId?: string;
  vendor?: string;
  date: string;
  amount: number;
  currency?: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  isTaxDeductible?: boolean;
  vatAmount?: number;
  withholdingTax?: number;
  notes?: string;
}

// Update expense DTO
export interface UpdateExpenseDto {
  categoryId?: string;
  transactionId?: string;
  vendor?: string;
  date?: string;
  amount?: number;
  currency?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  isTaxDeductible?: boolean;
  vatAmount?: number;
  withholdingTax?: number;
  status?: ExpenseStatus;
  notes?: string;
}

// Expense query DTO
export interface ExpenseQueryDto {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  isRecurring?: boolean;
  isTaxDeductible?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface ExpenseResponse {
  id: string;
  organizationId: string;
  category: Category;
  transaction?: Transaction;
  vendor?: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  isTaxDeductible: boolean;
  vatAmount: number;
  withholdingTax: number;
  status: ExpenseStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receipts?: Receipt[];
  tags?: ExpenseTag[];
}

export interface ExpenseListResponse {
  expenses: ExpenseResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpenseStatsResponse {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  expensesByStatus: Record<ExpenseStatus, number>;
  expensesByPaymentMethod: Record<PaymentMethod, number>;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    totalAmount: number;
  }>;
}

// Filter options
export interface ExpenseFilters {
  status?: ExpenseStatus | 'ALL';
  categoryId?: string;
  paymentMethod?: PaymentMethod | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  isRecurring?: boolean;
  isTaxDeductible?: boolean;
  search?: string;
}

// Expense summary for dashboard
export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  pendingAmount: number;
  pendingCount: number;
  approvedAmount: number;
  approvedCount: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
  }>;
}

// Expense trends for analytics
export interface ExpenseTrend {
  date: string;
  amount: number;
  count: number;
}

// Expense comparison
export interface ExpenseComparison {
  current: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
  };
  previous: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
  };
  changes: {
    amountChange: number;
    amountChangePercent: number;
    countChange: number;
    countChangePercent: number;
  };
}

// Audit trail entry
export interface ExpenseAuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes: Record<string, any>;
  notes?: string;
}

// Bulk operation result
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    expenseId: string;
    error: string;
  }>;
}
