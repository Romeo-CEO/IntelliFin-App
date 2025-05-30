import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    amount: number;
    percentage: number;
  }>;
  byMonth: Array<{ month: string; amount: number }>;
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ExpenseBreakdown {
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  byMonth: Array<{ month: string; amount: number }>;
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface CashFlowData {
  operatingCashFlow: Array<{
    month: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
  monthlyBalance: Array<{ month: string; balance: number }>;
  projectedCashFlow: Array<{ month: string; projected: number }>;
}

export interface AccountsReceivableAging {
  current: number; // 0-30 days
  thirtyDays: number; // 31-60 days
  sixtyDays: number; // 61-90 days
  ninetyDays: number; // 91+ days
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
  period: { startDate: Date; endDate: Date };
  sales: {
    standardRated: number; // 16% VAT
    zeroRated: number; // 0% VAT
    exempt: number; // VAT exempt
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
  vatLiability: number; // Output VAT - Input VAT
  vatRefund: number; // If negative liability
}

@Injectable()
export class ReportRepository {
  private readonly logger = new Logger(ReportRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get key financial metrics for a period
   */
  async getFinancialMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialMetrics> {
    try {
      const [
        revenueData,
        expenseData,
        accountsReceivableData,
        accountsPayableData,
        vatLiabilityData,
      ] = await Promise.all([
        // Revenue from paid invoices
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            issueDate: { gte: startDate, lte: endDate },
            status: { in: ['PAID', 'PARTIALLY_PAID'] },
          },
          _sum: { paidAmount: true },
        }),
        // Expenses
        this.prisma.expense.aggregate({
          where: {
            organizationId,
            expenseDate: { gte: startDate, lte: endDate },
            status: { in: ['APPROVED', 'PAID'] },
          },
          _sum: { amount: true },
        }),
        // Accounts Receivable (unpaid invoices)
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        // Accounts Payable (unpaid expenses)
        this.prisma.expense.aggregate({
          where: {
            organizationId,
            status: { in: ['APPROVED'] },
          },
          _sum: { amount: true },
        }),
        // VAT Liability from invoices
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            issueDate: { gte: startDate, lte: endDate },
            status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
          },
          _sum: { vatAmount: true },
        }),
      ]);

      const revenue = revenueData._sum.paidAmount?.toNumber() || 0;
      const expenses = expenseData._sum.amount?.toNumber() || 0;
      const totalReceivable =
        accountsReceivableData._sum.totalAmount?.toNumber() || 0;
      const paidReceivable =
        accountsReceivableData._sum.paidAmount?.toNumber() || 0;
      const accountsReceivable = totalReceivable - paidReceivable;
      const accountsPayable = accountsPayableData._sum.amount?.toNumber() || 0;
      const vatLiability = vatLiabilityData._sum.vatAmount?.toNumber() || 0;

      // Calculate cash balance (simplified - in real implementation, this would come from bank/mobile money accounts)
      const cashBalance = revenue - expenses;

      return {
        revenue,
        expenses,
        profit: revenue - expenses,
        cashBalance,
        accountsReceivable,
        accountsPayable,
        vatLiability,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get financial metrics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get period comparison metrics
   */
  async getPeriodComparison(
    organizationId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<PeriodComparison> {
    try {
      const [current, previous] = await Promise.all([
        this.getFinancialMetrics(organizationId, currentStart, currentEnd),
        this.getFinancialMetrics(organizationId, previousStart, previousEnd),
      ]);

      const calculateChange = (
        currentValue: number,
        previousValue: number
      ) => ({
        amount: currentValue - previousValue,
        percentage:
          previousValue === 0
            ? 0
            : ((currentValue - previousValue) / previousValue) * 100,
      });

      return {
        current,
        previous,
        changes: {
          revenue: calculateChange(current.revenue, previous.revenue),
          expenses: calculateChange(current.expenses, previous.expenses),
          profit: calculateChange(current.profit, previous.profit),
          cashBalance: calculateChange(
            current.cashBalance,
            previous.cashBalance
          ),
          accountsReceivable: calculateChange(
            current.accountsReceivable,
            previous.accountsReceivable
          ),
          accountsPayable: calculateChange(
            current.accountsPayable,
            previous.accountsPayable
          ),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get period comparison: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get revenue breakdown by various dimensions
   */
  async getRevenueBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueBreakdown> {
    try {
      const [byCustomerData, byMonthData, byPaymentMethodData] =
        await Promise.all([
          // Revenue by customer
          this.prisma.invoice.groupBy({
            by: ['customerId'],
            where: {
              organizationId,
              issueDate: { gte: startDate, lte: endDate },
              status: { in: ['PAID', 'PARTIALLY_PAID'] },
            },
            _sum: { paidAmount: true },
            orderBy: { _sum: { paidAmount: 'desc' } },
            take: 10,
          }),
          // Revenue by month
          this.prisma.$queryRaw<Array<{ month: string; amount: number }>>`
          SELECT 
            TO_CHAR(issue_date, 'YYYY-MM') as month,
            SUM(paid_amount)::FLOAT as amount
          FROM invoices 
          WHERE organization_id = ${organizationId}
            AND issue_date >= ${startDate}
            AND issue_date <= ${endDate}
            AND status IN ('PAID', 'PARTIALLY_PAID')
          GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
          ORDER BY month
        `,
          // Revenue by payment method (from payments)
          this.prisma.payment.groupBy({
            by: ['paymentMethod'],
            where: {
              organizationId,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          }),
        ]);

      // Get customer names
      const customerIds = byCustomerData.map(item => item.customerId);
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      });

      const totalRevenue = byCustomerData.reduce(
        (sum, item) => sum + (item._sum.paidAmount?.toNumber() || 0),
        0
      );

      const byCustomer = byCustomerData.map(item => {
        const customer = customers.find(c => c.id === item.customerId);
        const amount = item._sum.paidAmount?.toNumber() || 0;
        return {
          customerId: item.customerId,
          customerName: customer?.name || 'Unknown',
          amount,
          percentage: totalRevenue === 0 ? 0 : (amount / totalRevenue) * 100,
        };
      });

      const totalPaymentAmount = byPaymentMethodData.reduce(
        (sum, item) => sum + (item._sum.amount?.toNumber() || 0),
        0
      );

      const byPaymentMethod = byPaymentMethodData.map(item => {
        const amount = item._sum.amount?.toNumber() || 0;
        return {
          method: item.paymentMethod,
          amount,
          percentage:
            totalPaymentAmount === 0 ? 0 : (amount / totalPaymentAmount) * 100,
        };
      });

      return {
        byCustomer,
        byMonth: byMonthData,
        byPaymentMethod,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get revenue breakdown: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get expense breakdown by various dimensions
   */
  async getExpenseBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseBreakdown> {
    try {
      const [byCategoryData, byMonthData] = await Promise.all([
        // Expenses by category
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: {
            organizationId,
            expenseDate: { gte: startDate, lte: endDate },
            status: { in: ['APPROVED', 'PAID'] },
          },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        // Expenses by month
        this.prisma.$queryRaw<Array<{ month: string; amount: number }>>`
          SELECT 
            TO_CHAR(expense_date, 'YYYY-MM') as month,
            SUM(amount)::FLOAT as amount
          FROM expenses 
          WHERE organization_id = ${organizationId}
            AND expense_date >= ${startDate}
            AND expense_date <= ${endDate}
            AND status IN ('APPROVED', 'PAID')
          GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
          ORDER BY month
        `,
      ]);

      // Get category names
      const categoryIds = byCategoryData
        .map(item => item.categoryId)
        .filter(Boolean);
      const categories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });

      const totalExpenses = byCategoryData.reduce(
        (sum, item) => sum + (item._sum.amount?.toNumber() || 0),
        0
      );

      const byCategory = byCategoryData.map(item => {
        const category = categories.find(c => c.id === item.categoryId);
        const amount = item._sum.amount?.toNumber() || 0;
        return {
          categoryId: item.categoryId || 'uncategorized',
          categoryName: category?.name || 'Uncategorized',
          amount,
          percentage: totalExpenses === 0 ? 0 : (amount / totalExpenses) * 100,
        };
      });

      return {
        byCategory,
        byMonth: byMonthData,
        byPaymentMethod: [], // TODO: Implement expense payment method tracking
      };
    } catch (error) {
      this.logger.error(
        `Failed to get expense breakdown: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get accounts receivable aging report
   */
  async getAccountsReceivableAging(
    organizationId: string
  ): Promise<AccountsReceivableAging> {
    try {
      const unpaidInvoices = await this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      const today = new Date();
      let current = 0;
      let thirtyDays = 0;
      let sixtyDays = 0;
      let ninetyDays = 0;

      const details = unpaidInvoices.map(invoice => {
        const outstandingAmount =
          invoice.totalAmount.toNumber() -
          (invoice.paidAmount?.toNumber() || 0);
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (today.getTime() - invoice.dueDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

        let category: 'current' | '30days' | '60days' | '90days';
        if (daysOverdue <= 30) {
          current += outstandingAmount;
          category = 'current';
        } else if (daysOverdue <= 60) {
          thirtyDays += outstandingAmount;
          category = '30days';
        } else if (daysOverdue <= 90) {
          sixtyDays += outstandingAmount;
          category = '60days';
        } else {
          ninetyDays += outstandingAmount;
          category = '90days';
        }

        return {
          customerId: invoice.customerId,
          customerName: invoice.customer.name,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: outstandingAmount,
          daysOverdue,
          category,
        };
      });

      return {
        current,
        thirtyDays,
        sixtyDays,
        ninetyDays,
        total: current + thirtyDays + sixtyDays + ninetyDays,
        details,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get accounts receivable aging: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get VAT report for ZRA compliance
   */
  async getVatReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VatReport> {
    try {
      // Sales VAT (from invoices)
      const salesData = await this.prisma.$queryRaw<
        Array<{
          vat_rate: number;
          total_sales: number;
          total_vat: number;
        }>
      >`
        SELECT 
          COALESCE(ii.vat_rate, 0) as vat_rate,
          SUM(ii.line_total)::FLOAT as total_sales,
          SUM(ii.vat_amount)::FLOAT as total_vat
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE i.organization_id = ${organizationId}
          AND i.issue_date >= ${startDate}
          AND i.issue_date <= ${endDate}
          AND i.status IN ('SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')
        GROUP BY ii.vat_rate
      `;

      // Purchases VAT (from expenses - simplified, assumes VAT is tracked)
      const purchasesData = await this.prisma.$queryRaw<
        Array<{
          total_purchases: number;
          total_vat: number;
        }>
      >`
        SELECT 
          SUM(amount)::FLOAT as total_purchases,
          SUM(amount * 0.16 / 1.16)::FLOAT as total_vat
        FROM expenses
        WHERE organization_id = ${organizationId}
          AND expense_date >= ${startDate}
          AND expense_date <= ${endDate}
          AND status IN ('APPROVED', 'PAID')
      `;

      let standardRatedSales = 0;
      let zeroRatedSales = 0;
      let exemptSales = 0;
      let outputVat = 0;

      salesData.forEach(item => {
        if (item.vat_rate === 16) {
          standardRatedSales += item.total_sales;
        } else if (item.vat_rate === 0) {
          zeroRatedSales += item.total_sales;
        } else if (item.vat_rate === -1) {
          exemptSales += item.total_sales;
        }
        outputVat += item.total_vat;
      });

      const totalSales = standardRatedSales + zeroRatedSales + exemptSales;
      const totalPurchases = purchasesData[0]?.total_purchases || 0;
      const inputVat = purchasesData[0]?.total_vat || 0;
      const vatLiability = Math.max(0, outputVat - inputVat);
      const vatRefund = Math.max(0, inputVat - outputVat);

      return {
        period: { startDate, endDate },
        sales: {
          standardRated: standardRatedSales,
          zeroRated: zeroRatedSales,
          exempt: exemptSales,
          totalSales,
          outputVat,
        },
        purchases: {
          standardRated: totalPurchases, // Simplified
          zeroRated: 0,
          exempt: 0,
          totalPurchases,
          inputVat,
        },
        vatLiability,
        vatRefund,
      };
    } catch (error) {
      this.logger.error(`Failed to get VAT report: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get cash flow data
   */
  async getCashFlowData(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlowData> {
    try {
      // Monthly cash flow from payments and expenses
      const monthlyData = await this.prisma.$queryRaw<
        Array<{
          month: string;
          inflow: number;
          outflow: number;
        }>
      >`
        SELECT 
          TO_CHAR(date_trunc('month', payment_date), 'YYYY-MM') as month,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::FLOAT as inflow,
          0::FLOAT as outflow
        FROM payments
        WHERE organization_id = ${organizationId}
          AND payment_date >= ${startDate}
          AND payment_date <= ${endDate}
        GROUP BY TO_CHAR(date_trunc('month', payment_date), 'YYYY-MM')
        
        UNION ALL
        
        SELECT 
          TO_CHAR(date_trunc('month', expense_date), 'YYYY-MM') as month,
          0::FLOAT as inflow,
          SUM(amount)::FLOAT as outflow
        FROM expenses
        WHERE organization_id = ${organizationId}
          AND expense_date >= ${startDate}
          AND expense_date <= ${endDate}
          AND status IN ('APPROVED', 'PAID')
        GROUP BY TO_CHAR(date_trunc('month', expense_date), 'YYYY-MM')
        
        ORDER BY month
      `;

      // Aggregate monthly data
      const monthlyMap = new Map<string, { inflow: number; outflow: number }>();
      monthlyData.forEach(item => {
        const existing = monthlyMap.get(item.month) || {
          inflow: 0,
          outflow: 0,
        };
        monthlyMap.set(item.month, {
          inflow: existing.inflow + item.inflow,
          outflow: existing.outflow + item.outflow,
        });
      });

      const operatingCashFlow = Array.from(monthlyMap.entries()).map(
        ([month, data]) => ({
          month,
          inflow: data.inflow,
          outflow: data.outflow,
          net: data.inflow - data.outflow,
        })
      );

      // Calculate running balance (simplified)
      let runningBalance = 0;
      const monthlyBalance = operatingCashFlow.map(item => {
        runningBalance += item.net;
        return {
          month: item.month,
          balance: runningBalance,
        };
      });

      // Simple projection (average of last 3 months)
      const recentMonths = operatingCashFlow.slice(-3);
      const avgNet =
        recentMonths.reduce((sum, item) => sum + item.net, 0) /
        recentMonths.length;
      const projectedCashFlow = Array.from({ length: 6 }, (_, i) => {
        const futureMonth = new Date();
        futureMonth.setMonth(futureMonth.getMonth() + i + 1);
        runningBalance += avgNet;
        return {
          month: futureMonth.toISOString().substring(0, 7),
          projected: runningBalance,
        };
      });

      return {
        operatingCashFlow,
        monthlyBalance,
        projectedCashFlow,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cash flow data: ${error.message}`,
        error
      );
      throw error;
    }
  }
}
