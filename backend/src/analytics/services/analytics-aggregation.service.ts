import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AnalyticsDataSource,
  DateRange,
  FinancialSummary,
} from '../interfaces/analytics-data.interface';

/**
 * Analytics Aggregation Service
 *
 * Aggregates financial data from all modules for analytics processing.
 * Optimized for Zambian SMEs with multi-tenant isolation and low-bandwidth considerations.
 *
 * Features:
 * - Efficient data aggregation from customers, invoices, payments, expenses, taxes
 * - Multi-tenant data isolation
 * - Performance optimization for low-bandwidth environments
 * - Zambian business context (ZMW currency, seasonal patterns)
 */
@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Aggregate all financial data for analytics processing
   */
  async aggregateFinancialData(
    organizationId: string,
    dateRange: DateRange
  ): Promise<AnalyticsDataSource> {
    try {
      this.logger.log(
        `Aggregating financial data for organization ${organizationId}`
      );

      const [
        customerData,
        invoiceData,
        paymentData,
        expenseData,
        taxData,
        accountData,
      ] = await Promise.all([
        this.aggregateCustomerData(organizationId, dateRange),
        this.aggregateInvoiceData(organizationId, dateRange),
        this.aggregatePaymentData(organizationId, dateRange),
        this.aggregateExpenseData(organizationId, dateRange),
        this.aggregateTaxData(organizationId, dateRange),
        this.aggregateAccountData(organizationId, dateRange),
      ]);

      return {
        customers: customerData,
        invoices: invoiceData,
        payments: paymentData,
        expenses: expenseData,
        taxes: taxData,
        accounts: accountData,
        dateRange,
        organizationId,
        aggregatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to aggregate financial data: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get financial summary for quick analytics
   */
  async getFinancialSummary(
    organizationId: string,
    dateRange: DateRange
  ): Promise<FinancialSummary> {
    try {
      const [revenue, expenses, payments, receivables] = await Promise.all([
        this.getTotalRevenue(organizationId, dateRange),
        this.getTotalExpenses(organizationId, dateRange),
        this.getTotalPayments(organizationId, dateRange),
        this.getAccountsReceivable(organizationId, dateRange.endDate),
      ]);

      const grossProfit = revenue - expenses;
      const netProfit = grossProfit; // Simplified for now, can add more deductions

      return {
        revenue,
        expenses,
        grossProfit,
        netProfit,
        totalPayments: payments,
        accountsReceivable: receivables,
        profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        period: dateRange,
        currency: 'ZMW',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get financial summary: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Aggregate customer analytics data
   */
  private async aggregateCustomerData(
    organizationId: string,
    dateRange: DateRange
  ) {
    const customers = await this.databaseService.customer.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        invoices: {
          where: {
            issueDate: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
        },
        payments: {
          where: {
            paymentDate: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
        },
      },
    });

    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      totalRevenue: customer.invoices.reduce(
        (sum, invoice) => sum + Number(invoice.totalAmount),
        0
      ),
      totalPayments: customer.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ),
      invoiceCount: customer.invoices.length,
      paymentCount: customer.payments.length,
      averageInvoiceValue:
        customer.invoices.length > 0
          ? customer.invoices.reduce(
              (sum, invoice) => sum + Number(invoice.totalAmount),
              0
            ) / customer.invoices.length
          : 0,
      paymentTerms: customer.paymentTerms,
      isActive: customer.isActive,
    }));
  }

  /**
   * Aggregate invoice analytics data
   */
  private async aggregateInvoiceData(
    organizationId: string,
    dateRange: DateRange
  ) {
    const invoices = await this.databaseService.invoice.findMany({
      where: {
        organizationId,
        issueDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    return invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      status: invoice.status,
      itemCount: invoice.items.length,
      paymentCount: invoice.payments.length,
      daysOverdue:
        invoice.status === 'OVERDUE'
          ? Math.floor(
              (new Date().getTime() - invoice.dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
    }));
  }

  /**
   * Aggregate payment analytics data
   */
  private async aggregatePaymentData(
    organizationId: string,
    dateRange: DateRange
  ) {
    const payments = await this.databaseService.payment.findMany({
      where: {
        organizationId,
        paymentDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    return payments.map(payment => ({
      id: payment.id,
      customerId: payment.customerId,
      customerName: payment.customer.name,
      invoiceId: payment.invoiceId,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      withholdingTaxAmount: Number(payment.withholdingTaxAmount || 0),
      grossAmount: Number(payment.grossAmount || payment.amount),
    }));
  }

  /**
   * Aggregate expense analytics data
   */
  private async aggregateExpenseData(
    organizationId: string,
    dateRange: DateRange
  ) {
    const expenses = await this.databaseService.expense.findMany({
      where: {
        organizationId,
        expenseDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        category: true,
        tags: true,
      },
    });

    return expenses.map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate,
      categoryId: expense.categoryId,
      categoryName: expense.category?.name || 'Uncategorized',
      status: expense.status,
      isRecurring: expense.isRecurring,
      tags: expense.tags.map(tag => tag.name),
      vatAmount: Number(expense.vatAmount || 0),
      isTaxDeductible: expense.isTaxDeductible,
    }));
  }

  /**
   * Aggregate tax analytics data
   */
  private async aggregateTaxData(organizationId: string, dateRange: DateRange) {
    // Get tax obligations and calculations for the period
    const taxObligations = await this.databaseService.taxObligation.findMany({
      where: {
        organizationId,
        dueDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    const taxPeriods = await this.databaseService.taxPeriod.findMany({
      where: {
        organizationId,
        periodStart: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    return {
      obligations: taxObligations.map(obligation => ({
        id: obligation.id,
        taxType: obligation.taxType,
        amount: Number(obligation.amount),
        dueDate: obligation.dueDate,
        status: obligation.status,
        penaltyAmount: Number(obligation.penaltyAmount || 0),
      })),
      periods: taxPeriods.map(period => ({
        id: period.id,
        taxType: period.taxType,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        filingDeadline: period.filingDeadline,
        paymentDeadline: period.paymentDeadline,
        status: period.status,
      })),
    };
  }

  /**
   * Aggregate chart of accounts data
   */
  private async aggregateAccountData(
    organizationId: string,
    dateRange: DateRange
  ) {
    const accounts = await this.databaseService.account.findMany({
      where: {
        organizationId,
      },
      include: {
        journalEntries: {
          where: {
            transactionDate: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
        },
      },
    });

    return accounts.map(account => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      balance: Number(account.balance),
      transactionCount: account.journalEntries.length,
      totalDebits: account.journalEntries
        .filter(entry => entry.type === 'DEBIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
      totalCredits: account.journalEntries
        .filter(entry => entry.type === 'CREDIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    }));
  }

  /**
   * Helper methods for financial calculations
   */
  private async getTotalRevenue(
    organizationId: string,
    dateRange: DateRange
  ): Promise<number> {
    const result = await this.databaseService.invoice.aggregate({
      where: {
        organizationId,
        issueDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: {
          in: ['SENT', 'PAID', 'PARTIALLY_PAID'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    return Number(result._sum.totalAmount || 0);
  }

  private async getTotalExpenses(
    organizationId: string,
    dateRange: DateRange
  ): Promise<number> {
    const result = await this.databaseService.expense.aggregate({
      where: {
        organizationId,
        expenseDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: {
          in: ['APPROVED', 'PAID'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  private async getTotalPayments(
    organizationId: string,
    dateRange: DateRange
  ): Promise<number> {
    const result = await this.databaseService.payment.aggregate({
      where: {
        organizationId,
        paymentDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  private async getAccountsReceivable(
    organizationId: string,
    asOfDate: Date
  ): Promise<number> {
    const result = await this.databaseService.invoice.aggregate({
      where: {
        organizationId,
        issueDate: {
          lte: asOfDate,
        },
        status: {
          in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
    });

    const totalInvoiced = Number(result._sum.totalAmount || 0);
    const totalPaid = Number(result._sum.paidAmount || 0);
    return totalInvoiced - totalPaid;
  }
}
