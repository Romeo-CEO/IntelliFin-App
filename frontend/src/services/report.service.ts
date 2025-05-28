import { API_BASE_URL } from '../config/api';

export interface FinancialMetrics {
  revenue: number;
  expenses: number;
  profit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  vatLiability: number;
  previousPeriodRevenue?: number;
  previousPeriodExpenses?: number;
  previousPeriodProfit?: number;
}

export interface PeriodComparison {
  current: FinancialMetrics;
  previous: FinancialMetrics;
  changes: {
    revenue: { amount: number; percentage: number };
    expenses: { amount: number; percentage: number };
    profit: { amount: number; percentage: number };
    cashBalance: { amount: number; percentage: number };
    accountsReceivable: { amount: number; percentage: number };
    accountsPayable: { amount: number; percentage: number };
  };
}

export interface RevenueBreakdown {
  byCustomer: Array<{ customerId: string; customerName: string; amount: number; percentage: number }>;
  byMonth: Array<{ month: string; amount: number }>;
  byPaymentMethod: Array<{ method: string; amount: number; percentage: number }>;
}

export interface ExpenseBreakdown {
  byCategory: Array<{ categoryId: string; categoryName: string; amount: number; percentage: number }>;
  byMonth: Array<{ month: string; amount: number }>;
  byPaymentMethod: Array<{ method: string; amount: number; percentage: number }>;
}

export interface CashFlowData {
  operatingCashFlow: Array<{ month: string; inflow: number; outflow: number; net: number }>;
  monthlyBalance: Array<{ month: string; balance: number }>;
  projectedCashFlow: Array<{ month: string; projected: number }>;
}

export interface AccountsReceivableAging {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  total: number;
  details: Array<{
    customerId: string;
    customerName: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    category: 'current' | '30days' | '60days' | '90days';
  }>;
}

export interface VatReport {
  period: { startDate: string; endDate: string };
  sales: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    totalSales: number;
    outputVat: number;
  };
  purchases: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    totalPurchases: number;
    inputVat: number;
  };
  vatLiability: number;
  vatRefund: number;
}

export interface DashboardMetrics {
  financialMetrics: FinancialMetrics;
  periodComparison?: PeriodComparison;
  revenueBreakdown: RevenueBreakdown;
  cashFlow: CashFlowData;
  accountsReceivable: AccountsReceivableAging;
}

export interface ReportQuery {
  type: ReportType;
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  includeComparison?: boolean;
  exportFormat?: ExportFormat;
}

export interface DashboardQuery {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  includeComparison?: boolean;
}

export enum ReportType {
  FINANCIAL_OVERVIEW = 'FINANCIAL_OVERVIEW',
  PROFIT_LOSS = 'PROFIT_LOSS',
  CASH_FLOW = 'CASH_FLOW',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  VAT_REPORT = 'VAT_REPORT',
  REVENUE_BREAKDOWN = 'REVENUE_BREAKDOWN',
  EXPENSE_BREAKDOWN = 'EXPENSE_BREAKDOWN',
  CUSTOMER_ANALYSIS = 'CUSTOMER_ANALYSIS',
}

export enum ReportPeriod {
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

class ReportService {
  private baseUrl = `${API_BASE_URL}/reports`;

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getDashboardMetrics(query: DashboardQuery = {}): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/dashboard?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<DashboardMetrics>(response);
  }

  async generateReport(query: ReportQuery): Promise<any> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/generate?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<any>(response);
  }

  async getAvailableReportTypes(): Promise<Array<{
    type: ReportType;
    name: string;
    description: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/types`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Array<{
      type: ReportType;
      name: string;
      description: string;
    }>>(response);
  }

  async getFinancialMetrics(query: DashboardQuery = {}): Promise<FinancialMetrics> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/financial-metrics?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<FinancialMetrics>(response);
  }

  async getRevenueBreakdown(query: DashboardQuery = {}): Promise<RevenueBreakdown> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/revenue-breakdown?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<RevenueBreakdown>(response);
  }

  async getExpenseBreakdown(query: DashboardQuery = {}): Promise<ExpenseBreakdown> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/expense-breakdown?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<ExpenseBreakdown>(response);
  }

  async getCashFlowData(query: DashboardQuery = {}): Promise<CashFlowData> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/cash-flow?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CashFlowData>(response);
  }

  async getAccountsReceivableAging(): Promise<AccountsReceivableAging> {
    const response = await fetch(`${this.baseUrl}/accounts-receivable`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<AccountsReceivableAging>(response);
  }

  async getVatReport(query: DashboardQuery = {}): Promise<VatReport> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/vat-report?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<VatReport>(response);
  }

  async getPeriodComparison(query: DashboardQuery = {}): Promise<PeriodComparison> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/period-comparison?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<PeriodComparison>(response);
  }

  // Utility methods
  formatCurrency(amount: number, currency = 'ZMW'): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatPercentage(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatMonth(monthString: string): string {
    const [year, month] = monthString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
    });
  }

  getReportPeriodLabel(period: ReportPeriod): string {
    const labels = {
      [ReportPeriod.THIS_MONTH]: 'This Month',
      [ReportPeriod.LAST_MONTH]: 'Last Month',
      [ReportPeriod.THIS_QUARTER]: 'This Quarter',
      [ReportPeriod.LAST_QUARTER]: 'Last Quarter',
      [ReportPeriod.THIS_YEAR]: 'This Year',
      [ReportPeriod.LAST_YEAR]: 'Last Year',
      [ReportPeriod.CUSTOM]: 'Custom Period',
    };
    return labels[period] || period;
  }

  getChangeColor(change: number): string {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  getChangeIcon(change: number): string {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  getAgingCategoryColor(category: string): string {
    const colors = {
      current: 'text-green-600',
      '30days': 'text-yellow-600',
      '60days': 'text-orange-600',
      '90days': 'text-red-600',
    };
    return colors[category] || 'text-gray-600';
  }

  getAgingCategoryLabel(category: string): string {
    const labels = {
      current: 'Current (0-30 days)',
      '30days': '31-60 days',
      '60days': '61-90 days',
      '90days': 'Over 90 days',
    };
    return labels[category] || category;
  }

  calculateProfitMargin(profit: number, revenue: number): number {
    if (revenue === 0) return 0;
    return (profit / revenue) * 100;
  }

  calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number {
    if (currentLiabilities === 0) return currentAssets > 0 ? Infinity : 0;
    return currentAssets / currentLiabilities;
  }

  getHealthScore(metrics: FinancialMetrics): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Array<{ factor: string; score: number; weight: number }>;
  } {
    const factors = [
      {
        factor: 'Profitability',
        score: this.calculateProfitMargin(metrics.profit, metrics.revenue),
        weight: 0.3,
      },
      {
        factor: 'Cash Position',
        score: metrics.cashBalance > 0 ? Math.min(100, (metrics.cashBalance / metrics.revenue) * 100) : 0,
        weight: 0.25,
      },
      {
        factor: 'Receivables Management',
        score: metrics.revenue > 0 ? Math.max(0, 100 - (metrics.accountsReceivable / metrics.revenue) * 100) : 100,
        weight: 0.25,
      },
      {
        factor: 'Expense Control',
        score: metrics.revenue > 0 ? Math.max(0, 100 - (metrics.expenses / metrics.revenue) * 100) : 0,
        weight: 0.2,
      },
    ];

    const weightedScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (weightedScore >= 80) status = 'excellent';
    else if (weightedScore >= 60) status = 'good';
    else if (weightedScore >= 40) status = 'fair';
    else status = 'poor';

    return {
      score: Math.round(weightedScore),
      status,
      factors,
    };
  }
}

export const reportService = new ReportService();
