import { apiClient } from './api.client';

// Analytics data interfaces
export interface CashFlowData {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeBalance: number;
}

export interface CashFlowAnalytics {
  data: CashFlowData[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    currentBalance: number;
  };
}

export interface RevenueExpensesData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface RevenueExpensesAnalytics {
  data: RevenueExpensesData[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    averageProfitMargin: number;
  };
}

export interface KpiMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashBalance: number;
  accountsReceivable: number;
  averageInvoiceValue: number;
  paymentCycleTime: number;
  customerCount: number;
  invoiceCount: number;
  // Trend indicators (vs previous period)
  revenueTrend: number;
  expensesTrend: number;
  profitTrend: number;
  receivablesTrend: number;
}

export interface ReceivablesAgingDetail {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  category: 'current' | '30days' | '60days' | '90days' | '90plus';
}

export interface ReceivablesAgingData {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinety: number;
  total: number;
  details: ReceivablesAgingDetail[];
}

export interface ReceivablesAnalytics {
  aging: ReceivablesAgingData;
  insights: {
    riskLevel: 'low' | 'medium' | 'high';
    overduePercentage: number;
    averageDaysOverdue: number;
    recommendations: string[];
  };
}

export interface AnalyticsQuery {
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

class AnalyticsService {
  private readonly baseUrl = '/api/analytics';

  /**
   * Get cash flow analytics
   */
  async getCashFlowAnalytics(query: AnalyticsQuery = {}): Promise<CashFlowAnalytics> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.groupBy) params.append('groupBy', query.groupBy);

      const response = await apiClient.get(`${this.baseUrl}/cash-flow?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get cash flow analytics:', error);
      throw new Error('Failed to load cash flow analytics');
    }
  }

  /**
   * Get revenue vs expenses analytics
   */
  async getRevenueExpensesAnalytics(query: AnalyticsQuery = {}): Promise<RevenueExpensesAnalytics> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.groupBy) params.append('groupBy', query.groupBy);

      const response = await apiClient.get(`${this.baseUrl}/revenue-expenses?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get revenue vs expenses analytics:', error);
      throw new Error('Failed to load revenue vs expenses analytics');
    }
  }

  /**
   * Get KPI summary metrics
   */
  async getKpiSummary(query: AnalyticsQuery = {}): Promise<KpiMetrics> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/kpi-summary?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get KPI summary:', error);
      throw new Error('Failed to load KPI summary');
    }
  }

  /**
   * Get accounts receivable aging analysis
   */
  async getReceivablesAging(): Promise<ReceivablesAnalytics> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/receivables-aging`);
      return response.data;
    } catch (error) {
      console.error('Failed to get receivables aging:', error);
      throw new Error('Failed to load receivables aging analysis');
    }
  }

  /**
   * Format currency for Zambian context
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format trend indicator
   */
  formatTrend(value: number): { value: string; isPositive: boolean; isNeutral: boolean } {
    const isPositive = value > 0;
    const isNeutral = Math.abs(value) < 0.1;
    const formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

    return {
      value: formattedValue,
      isPositive,
      isNeutral,
    };
  }

  /**
   * Get period display name
   */
  getPeriodDisplayName(period: string): string {
    const periodMap: Record<string, string> = {
      day: 'Daily',
      week: 'Weekly',
      month: 'Monthly',
    };
    return periodMap[period] || period;
  }

  /**
   * Get risk level color
   */
  getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
    const colorMap = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colorMap[riskLevel];
  }

  /**
   * Get risk level background color
   */
  getRiskLevelBgColor(riskLevel: 'low' | 'medium' | 'high'): string {
    const colorMap = {
      low: 'bg-green-100',
      medium: 'bg-yellow-100',
      high: 'bg-red-100',
    };
    return colorMap[riskLevel];
  }

  /**
   * Calculate period dates for common periods
   */
  getPeriodDates(period: 'day' | 'week' | 'month' | 'quarter' | 'year'): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate: string;

    switch (period) {
      case 'day':
        startDate = endDate;
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = yearStart.toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(query: AnalyticsQuery & {
    periods?: number;
    confidence?: number;
    method?: 'linear' | 'exponential' | 'seasonal'
  } = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.periods) params.append('periods', query.periods.toString());
      if (query.confidence) params.append('confidence', query.confidence.toString());
      if (query.method) params.append('method', query.method);

      const response = await apiClient.get(`${this.baseUrl}/revenue-forecast?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get revenue forecast:', error);
      throw new Error('Failed to load revenue forecast');
    }
  }

  /**
   * Get expense trends analysis
   */
  async getExpenseTrends(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/expense-trends?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get expense trends:', error);
      throw new Error('Failed to load expense trends');
    }
  }

  /**
   * Get expense anomalies
   */
  async getExpenseAnomalies(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/expense-anomalies?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get expense anomalies:', error);
      throw new Error('Failed to load expense anomalies');
    }
  }

  /**
   * Get profitability analysis
   */
  async getProfitabilityAnalysis(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/profitability-analysis?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get profitability analysis:', error);
      throw new Error('Failed to load profitability analysis');
    }
  }

  /**
   * Get profitability trends
   */
  async getProfitabilityTrends(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/profitability-trends?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get profitability trends:', error);
      throw new Error('Failed to load profitability trends');
    }
  }

  /**
   * Get tax analytics
   */
  async getTaxAnalytics(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/tax-analytics?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get tax analytics:', error);
      throw new Error('Failed to load tax analytics');
    }
  }

  /**
   * Get tax optimization insights
   */
  async getTaxOptimization(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/tax-optimization?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get tax optimization:', error);
      throw new Error('Failed to load tax optimization insights');
    }
  }

  /**
   * Get ZRA compliance analysis
   */
  async getZraCompliance(): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/zra-compliance`);
      return response.data;
    } catch (error) {
      console.error('Failed to get ZRA compliance:', error);
      throw new Error('Failed to load ZRA compliance analysis');
    }
  }

  /**
   * Get business health score
   */
  async getBusinessHealthScore(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/business-health-score?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get business health score:', error);
      throw new Error('Failed to load business health score');
    }
  }

  /**
   * Get financial ratios
   */
  async getFinancialRatios(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/financial-ratios?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get financial ratios:', error);
      throw new Error('Failed to load financial ratios');
    }
  }

  /**
   * Get health score components
   */
  async getHealthScoreComponents(query: AnalyticsQuery = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiClient.get(`${this.baseUrl}/health-score-components?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get health score components:', error);
      throw new Error('Failed to load health score components');
    }
  }
}

export const analyticsService = new AnalyticsService();
