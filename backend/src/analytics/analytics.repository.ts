import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CashFlowData {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeBalance: number;
}

export interface RevenueExpensesData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
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

export interface ReceivablesAgingData {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinety: number;
  total: number;
  details: Array<{
    customerId: string;
    customerName: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    category: 'current' | '30days' | '60days' | '90days' | '90plus';
  }>;
}

// Step 19: Advanced Analytics Interfaces
export interface TimeSeriesDataPoint {
  period: string;
  value: number;
  date: Date;
}

export interface ForecastDataPoint {
  period: string;
  actual?: number;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
  date: Date;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: number; // 0-1 scale
  seasonality: {
    detected: boolean;
    pattern?: 'monthly' | 'quarterly' | 'yearly';
    strength?: number;
  };
  anomalies: Array<{
    period: string;
    value: number;
    expectedValue: number;
    severity: 'low' | 'medium' | 'high';
    date: Date;
  }>;
}

export interface CustomerProfitability {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  averageOrderValue: number;
  lifetimeValue: number;
  riskScore: number; // 0-100 scale
}

export interface ProductProfitability {
  productId?: string;
  productName: string;
  category: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  unitsSold: number;
  averagePrice: number;
  costPerUnit: number;
}

export interface TaxAnalytics {
  period: string;
  vatCollected: number;
  vatPaid: number;
  vatLiability: number;
  estimatedQuarterlyVat: number;
  taxDeductions: number;
  taxableIncome: number;
  estimatedIncomeTax: number;
  complianceScore: number; // 0-100 scale
  recommendations: string[];
}

export interface FinancialRatios {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  profitability: {
    grossProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  efficiency: {
    assetTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    inventoryTurnover: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
  };
}

export interface BusinessHealthScore {
  overallScore: number; // 0-100 scale
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  components: {
    cashFlow: { score: number; weight: number };
    profitability: { score: number; weight: number };
    growth: { score: number; weight: number };
    efficiency: { score: number; weight: number };
    stability: { score: number; weight: number };
  };
  trends: {
    improving: boolean;
    deteriorating: boolean;
    stable: boolean;
  };
  recommendations: string[];
  benchmarks: {
    industry: number;
    smeAverage: number;
    topPerformers: number;
  };
}

@Injectable()
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cash flow data for a specific period
   */
  async getCashFlowData(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ): Promise<CashFlowData[]> {
    try {
      // Get payment inflows (revenue)
      const inflowQuery = this.prisma.payment.groupBy({
        by: ['paymentDate'],
        where: {
          organizationId,
          paymentDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        orderBy: { paymentDate: 'asc' },
      });

      // Get expense outflows
      const outflowQuery = this.prisma.expense.groupBy({
        by: ['expenseDate'],
        where: {
          organizationId,
          expenseDate: { gte: startDate, lte: endDate },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { amount: true },
        orderBy: { expenseDate: 'asc' },
      });

      const [inflows, outflows] = await Promise.all([inflowQuery, outflowQuery]);

      // Group data by specified period
      const cashFlowMap = new Map<string, { inflow: number; outflow: number }>();

      // Process inflows
      inflows.forEach(item => {
        const period = this.formatPeriod(item.paymentDate, groupBy);
        const existing = cashFlowMap.get(period) || { inflow: 0, outflow: 0 };
        existing.inflow += item._sum.amount?.toNumber() || 0;
        cashFlowMap.set(period, existing);
      });

      // Process outflows
      outflows.forEach(item => {
        const period = this.formatPeriod(item.expenseDate, groupBy);
        const existing = cashFlowMap.get(period) || { inflow: 0, outflow: 0 };
        existing.outflow += item._sum.amount?.toNumber() || 0;
        cashFlowMap.set(period, existing);
      });

      // Convert to array and calculate cumulative balance
      let cumulativeBalance = 0;
      const result: CashFlowData[] = [];

      // Sort periods chronologically
      const sortedPeriods = Array.from(cashFlowMap.keys()).sort();

      sortedPeriods.forEach(period => {
        const data = cashFlowMap.get(period)!;
        const netFlow = data.inflow - data.outflow;
        cumulativeBalance += netFlow;

        result.push({
          period,
          inflow: data.inflow,
          outflow: data.outflow,
          netFlow,
          cumulativeBalance,
        });
      });

      this.logger.log(`Retrieved cash flow data for organization: ${organizationId}, periods: ${result.length}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get cash flow data: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get revenue vs expenses data for comparison
   */
  async getRevenueExpensesData(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ): Promise<RevenueExpensesData[]> {
    try {
      // Get revenue from paid invoices
      const revenueQuery = this.prisma.invoice.groupBy({
        by: ['issueDate'],
        where: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        _sum: { paidAmount: true },
        orderBy: { issueDate: 'asc' },
      });

      // Get expenses
      const expensesQuery = this.prisma.expense.groupBy({
        by: ['expenseDate'],
        where: {
          organizationId,
          expenseDate: { gte: startDate, lte: endDate },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { amount: true },
        orderBy: { expenseDate: 'asc' },
      });

      const [revenues, expenses] = await Promise.all([revenueQuery, expensesQuery]);

      // Group data by specified period
      const dataMap = new Map<string, { revenue: number; expenses: number }>();

      // Process revenues
      revenues.forEach(item => {
        const period = this.formatPeriod(item.issueDate, groupBy);
        const existing = dataMap.get(period) || { revenue: 0, expenses: 0 };
        existing.revenue += item._sum.paidAmount?.toNumber() || 0;
        dataMap.set(period, existing);
      });

      // Process expenses
      expenses.forEach(item => {
        const period = this.formatPeriod(item.expenseDate, groupBy);
        const existing = dataMap.get(period) || { revenue: 0, expenses: 0 };
        existing.expenses += item._sum.amount?.toNumber() || 0;
        dataMap.set(period, existing);
      });

      // Convert to array with calculations
      const result: RevenueExpensesData[] = [];
      const sortedPeriods = Array.from(dataMap.keys()).sort();

      sortedPeriods.forEach(period => {
        const data = dataMap.get(period)!;
        const profit = data.revenue - data.expenses;
        const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

        result.push({
          period,
          revenue: data.revenue,
          expenses: data.expenses,
          profit,
          profitMargin,
        });
      });

      this.logger.log(`Retrieved revenue vs expenses data for organization: ${organizationId}, periods: ${result.length}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get revenue vs expenses data: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive KPI metrics
   */
  async getKpiMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<KpiMetrics> {
    try {
      // Calculate previous period dates for trend comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate.getTime() - 1);

      const [
        currentMetrics,
        previousMetrics,
        customerCount,
        invoiceStats,
        paymentCycleData,
      ] = await Promise.all([
        this.getBasicFinancialMetrics(organizationId, startDate, endDate),
        this.getBasicFinancialMetrics(organizationId, prevStartDate, prevEndDate),
        this.getCustomerCount(organizationId),
        this.getInvoiceStats(organizationId, startDate, endDate),
        this.getPaymentCycleTime(organizationId, startDate, endDate),
      ]);

      // Calculate trends (percentage change from previous period)
      const revenueTrend = this.calculateTrend(currentMetrics.revenue, previousMetrics.revenue);
      const expensesTrend = this.calculateTrend(currentMetrics.expenses, previousMetrics.expenses);
      const profitTrend = this.calculateTrend(currentMetrics.profit, previousMetrics.profit);
      const receivablesTrend = this.calculateTrend(currentMetrics.accountsReceivable, previousMetrics.accountsReceivable);

      const result: KpiMetrics = {
        totalRevenue: currentMetrics.revenue,
        totalExpenses: currentMetrics.expenses,
        netProfit: currentMetrics.profit,
        profitMargin: currentMetrics.revenue > 0 ? (currentMetrics.profit / currentMetrics.revenue) * 100 : 0,
        cashBalance: currentMetrics.cashBalance,
        accountsReceivable: currentMetrics.accountsReceivable,
        averageInvoiceValue: invoiceStats.averageValue,
        paymentCycleTime: paymentCycleData,
        customerCount,
        invoiceCount: invoiceStats.count,
        revenueTrend,
        expensesTrend,
        profitTrend,
        receivablesTrend,
      };

      this.logger.log(`Retrieved KPI metrics for organization: ${organizationId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get KPI metrics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get accounts receivable aging data
   */
  async getReceivablesAging(organizationId: string): Promise<ReceivablesAgingData> {
    try {
      const today = new Date();

      const receivables = await this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
          totalAmount: { gt: 0 },
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const agingData: ReceivablesAgingData = {
        current: 0,
        thirtyDays: 0,
        sixtyDays: 0,
        ninetyDays: 0,
        overNinety: 0,
        total: 0,
        details: [],
      };

      receivables.forEach(invoice => {
        const outstandingAmount = invoice.totalAmount.toNumber() - invoice.paidAmount.toNumber();
        if (outstandingAmount <= 0) return;

        const daysOverdue = Math.max(0, Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        let category: 'current' | '30days' | '60days' | '90days' | '90plus';

        if (daysOverdue <= 0) {
          category = 'current';
          agingData.current += outstandingAmount;
        } else if (daysOverdue <= 30) {
          category = '30days';
          agingData.thirtyDays += outstandingAmount;
        } else if (daysOverdue <= 60) {
          category = '60days';
          agingData.sixtyDays += outstandingAmount;
        } else if (daysOverdue <= 90) {
          category = '90days';
          agingData.ninetyDays += outstandingAmount;
        } else {
          category = '90plus';
          agingData.overNinety += outstandingAmount;
        }

        agingData.total += outstandingAmount;

        agingData.details.push({
          customerId: invoice.customerId,
          customerName: invoice.customer.name,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: outstandingAmount,
          daysOverdue,
          category,
        });
      });

      this.logger.log(`Retrieved receivables aging for organization: ${organizationId}, total: ${agingData.total}`);
      return agingData;
    } catch (error) {
      this.logger.error(`Failed to get receivables aging: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get basic financial metrics for a period
   */
  private async getBasicFinancialMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ revenue: number; expenses: number; profit: number; cashBalance: number; accountsReceivable: number }> {
    const [revenueData, expenseData, receivablesData] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          expenseDate: { gte: startDate, lte: endDate },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const revenue = revenueData._sum.paidAmount?.toNumber() || 0;
    const expenses = expenseData._sum.amount?.toNumber() || 0;
    const totalReceivable = receivablesData._sum.totalAmount?.toNumber() || 0;
    const paidReceivable = receivablesData._sum.paidAmount?.toNumber() || 0;
    const accountsReceivable = totalReceivable - paidReceivable;

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      cashBalance: revenue - expenses, // Simplified calculation
      accountsReceivable,
    };
  }

  /**
   * Get customer count
   */
  private async getCustomerCount(organizationId: string): Promise<number> {
    return this.prisma.customer.count({
      where: { organizationId, isActive: true, deletedAt: null },
    });
  }

  /**
   * Get invoice statistics
   */
  private async getInvoiceStats(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ count: number; averageValue: number }> {
    const stats = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _count: { id: true },
      _avg: { totalAmount: true },
    });

    return {
      count: stats._count.id,
      averageValue: stats._avg.totalAmount?.toNumber() || 0,
    };
  }

  /**
   * Get average payment cycle time in days
   */
  private async getPaymentCycleTime(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: 'PAID',
        issueDate: { gte: startDate, lte: endDate },
      },
      select: {
        issueDate: true,
        payments: {
          select: { paymentDate: true },
          orderBy: { paymentDate: 'desc' },
          take: 1,
        },
      },
    });

    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, invoice) => {
      if (invoice.payments.length > 0) {
        const daysDiff = Math.floor(
          (invoice.payments[0].paymentDate.getTime() - invoice.issueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(0, daysDiff);
      }
      return sum;
    }, 0);

    return Math.round(totalDays / paidInvoices.length);
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Format date according to grouping period
   */
  private formatPeriod(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const d = new Date(date);

    switch (groupBy) {
      case 'day':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }
}
