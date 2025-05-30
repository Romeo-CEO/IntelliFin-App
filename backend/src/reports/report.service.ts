import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportRepository } from './report.repository';
import {
  DashboardQueryDto,
  ExportFormat,
  ReportPeriod,
  ReportQueryDto,
  ReportType,
} from './dto/report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly reportRepository: ReportRepository) {}

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(organizationId: string, query: DashboardQueryDto) {
    try {
      const { startDate, endDate } = this.getPeriodDates(
        query.period || ReportPeriod.THIS_MONTH,
        query.startDate,
        query.endDate
      );

      const [
        financialMetrics,
        revenueBreakdown,
        cashFlow,
        accountsReceivable,
        periodComparison,
      ] = await Promise.all([
        this.reportRepository.getFinancialMetrics(
          organizationId,
          startDate,
          endDate
        ),
        this.reportRepository.getRevenueBreakdown(
          organizationId,
          startDate,
          endDate
        ),
        this.reportRepository.getCashFlowData(
          organizationId,
          startDate,
          endDate
        ),
        this.reportRepository.getAccountsReceivableAging(organizationId),
        query.includeComparison
          ? this.getPeriodComparison(organizationId, startDate, endDate)
          : null,
      ]);

      return {
        financialMetrics,
        periodComparison,
        revenueBreakdown,
        cashFlow,
        accountsReceivable,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard metrics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate a specific report
   */
  async generateReport(organizationId: string, query: ReportQueryDto) {
    try {
      const { startDate, endDate } = this.getPeriodDates(
        query.period || ReportPeriod.THIS_MONTH,
        query.startDate,
        query.endDate
      );

      let reportData: any;

      switch (query.type) {
        case ReportType.FINANCIAL_OVERVIEW:
          reportData = await this.generateFinancialOverviewReport(
            organizationId,
            startDate,
            endDate,
            query.includeComparison
          );
          break;
        case ReportType.PROFIT_LOSS:
          reportData = await this.generateProfitLossReport(
            organizationId,
            startDate,
            endDate,
            query.includeComparison
          );
          break;
        case ReportType.CASH_FLOW:
          reportData = await this.generateCashFlowReport(
            organizationId,
            startDate,
            endDate
          );
          break;
        case ReportType.ACCOUNTS_RECEIVABLE:
          reportData =
            await this.generateAccountsReceivableReport(organizationId);
          break;
        case ReportType.VAT_REPORT:
          reportData = await this.generateVatReport(
            organizationId,
            startDate,
            endDate
          );
          break;
        case ReportType.REVENUE_BREAKDOWN:
          reportData = await this.generateRevenueBreakdownReport(
            organizationId,
            startDate,
            endDate
          );
          break;
        case ReportType.EXPENSE_BREAKDOWN:
          reportData = await this.generateExpenseBreakdownReport(
            organizationId,
            startDate,
            endDate
          );
          break;
        case ReportType.CUSTOMER_ANALYSIS:
          reportData = await this.generateCustomerAnalysisReport(
            organizationId,
            startDate,
            endDate
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported report type: ${query.type}`
          );
      }

      const report = {
        type: query.type,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        generatedAt: new Date().toISOString(),
        data: reportData,
      };

      // Handle export format if specified
      if (query.exportFormat) {
        return await this.exportReport(report, query.exportFormat);
      }

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate financial overview report
   */
  private async generateFinancialOverviewReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    includeComparison?: boolean
  ) {
    const [
      financialMetrics,
      revenueBreakdown,
      expenseBreakdown,
      periodComparison,
    ] = await Promise.all([
      this.reportRepository.getFinancialMetrics(
        organizationId,
        startDate,
        endDate
      ),
      this.reportRepository.getRevenueBreakdown(
        organizationId,
        startDate,
        endDate
      ),
      this.reportRepository.getExpenseBreakdown(
        organizationId,
        startDate,
        endDate
      ),
      includeComparison
        ? this.getPeriodComparison(organizationId, startDate, endDate)
        : null,
    ]);

    return {
      financialMetrics,
      revenueBreakdown,
      expenseBreakdown,
      periodComparison,
    };
  }

  /**
   * Generate profit & loss report
   */
  private async generateProfitLossReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    includeComparison?: boolean
  ) {
    const [
      financialMetrics,
      revenueBreakdown,
      expenseBreakdown,
      periodComparison,
    ] = await Promise.all([
      this.reportRepository.getFinancialMetrics(
        organizationId,
        startDate,
        endDate
      ),
      this.reportRepository.getRevenueBreakdown(
        organizationId,
        startDate,
        endDate
      ),
      this.reportRepository.getExpenseBreakdown(
        organizationId,
        startDate,
        endDate
      ),
      includeComparison
        ? this.getPeriodComparison(organizationId, startDate, endDate)
        : null,
    ]);

    // Calculate profit margins
    const grossProfitMargin =
      financialMetrics.revenue === 0
        ? 0
        : (financialMetrics.profit / financialMetrics.revenue) * 100;
    const netProfitMargin = grossProfitMargin; // Simplified for now

    return {
      summary: {
        revenue: financialMetrics.revenue,
        expenses: financialMetrics.expenses,
        grossProfit: financialMetrics.profit,
        netProfit: financialMetrics.profit,
        grossProfitMargin,
        netProfitMargin,
      },
      revenueBreakdown,
      expenseBreakdown,
      periodComparison,
    };
  }

  /**
   * Generate cash flow report
   */
  private async generateCashFlowReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await this.reportRepository.getCashFlowData(
      organizationId,
      startDate,
      endDate
    );
  }

  /**
   * Generate accounts receivable report
   */
  private async generateAccountsReceivableReport(organizationId: string) {
    return await this.reportRepository.getAccountsReceivableAging(
      organizationId
    );
  }

  /**
   * Generate VAT report for ZRA compliance
   */
  private async generateVatReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await this.reportRepository.getVatReport(
      organizationId,
      startDate,
      endDate
    );
  }

  /**
   * Generate revenue breakdown report
   */
  private async generateRevenueBreakdownReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await this.reportRepository.getRevenueBreakdown(
      organizationId,
      startDate,
      endDate
    );
  }

  /**
   * Generate expense breakdown report
   */
  private async generateExpenseBreakdownReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await this.reportRepository.getExpenseBreakdown(
      organizationId,
      startDate,
      endDate
    );
  }

  /**
   * Generate customer analysis report
   */
  private async generateCustomerAnalysisReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const revenueBreakdown = await this.reportRepository.getRevenueBreakdown(
      organizationId,
      startDate,
      endDate
    );
    const accountsReceivable =
      await this.reportRepository.getAccountsReceivableAging(organizationId);

    // Calculate customer metrics
    const customerMetrics = revenueBreakdown.byCustomer.map(customer => {
      const receivables = accountsReceivable.details
        .filter(detail => detail.customerId === customer.customerId)
        .reduce((sum, detail) => sum + detail.amount, 0);

      return {
        ...customer,
        receivables,
        paymentRatio:
          customer.amount === 0
            ? 0
            : ((customer.amount - receivables) / customer.amount) * 100,
      };
    });

    return {
      customerMetrics,
      topCustomers: customerMetrics.slice(0, 10),
      riskCustomers: customerMetrics
        .filter(c => c.paymentRatio < 80)
        .slice(0, 10),
    };
  }

  /**
   * Get period comparison data
   */
  private async getPeriodComparison(
    organizationId: string,
    currentStart: Date,
    currentEnd: Date
  ) {
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    return await this.reportRepository.getPeriodComparison(
      organizationId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd
    );
  }

  /**
   * Export report in specified format
   */
  private async exportReport(report: any, format: ExportFormat) {
    switch (format) {
      case ExportFormat.PDF:
        return await this.exportToPdf(report);
      case ExportFormat.EXCEL:
        return await this.exportToExcel(report);
      case ExportFormat.CSV:
        return await this.exportToCsv(report);
      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export report to PDF
   */
  private async exportToPdf(report: any) {
    // TODO: Implement PDF export using a library like puppeteer or pdfkit
    this.logger.log('PDF export requested - implementation pending');
    return {
      format: 'PDF',
      url: `/api/reports/export/pdf/${  Date.now()}`,
      message:
        'PDF export functionality will be implemented in a future update',
    };
  }

  /**
   * Export report to Excel
   */
  private async exportToExcel(report: any) {
    // TODO: Implement Excel export using a library like exceljs
    this.logger.log('Excel export requested - implementation pending');
    return {
      format: 'EXCEL',
      url: `/api/reports/export/excel/${  Date.now()}`,
      message:
        'Excel export functionality will be implemented in a future update',
    };
  }

  /**
   * Export report to CSV
   */
  private async exportToCsv(report: any) {
    // TODO: Implement CSV export
    this.logger.log('CSV export requested - implementation pending');
    return {
      format: 'CSV',
      url: `/api/reports/export/csv/${  Date.now()}`,
      message:
        'CSV export functionality will be implemented in a future update',
    };
  }

  /**
   * Get date range for a given period
   */
  private getPeriodDates(
    period: ReportPeriod,
    customStart?: string,
    customEnd?: string
  ): { startDate: Date; endDate: Date } {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;
    let currentQuarter: number;
    let lastQuarter: number;
    let quarterYear: number;
    let adjustedQuarter: number;

    switch (period) {
      case ReportPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case ReportPeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case ReportPeriod.THIS_QUARTER:
        currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case ReportPeriod.LAST_QUARTER:
        lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        quarterYear =
          lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(quarterYear, adjustedQuarter * 3, 1);
        endDate = new Date(quarterYear, (adjustedQuarter + 1) * 3, 0);
        break;
      case ReportPeriod.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case ReportPeriod.LAST_YEAR:
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case ReportPeriod.CUSTOM:
        if (!customStart || !customEnd) {
          throw new BadRequestException(
            'Custom period requires startDate and endDate'
          );
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        break;
      default:
        throw new BadRequestException(`Unsupported period: ${period}`);
    }

    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return { startDate, endDate };
  }

  /**
   * Get available report types
   */
  getAvailableReportTypes() {
    return Object.values(ReportType).map(type => ({
      type,
      name: this.getReportTypeName(type),
      description: this.getReportTypeDescription(type),
    }));
  }

  /**
   * Get human-readable report type name
   */
  private getReportTypeName(type: ReportType): string {
    const names = {
      [ReportType.FINANCIAL_OVERVIEW]: 'Financial Overview',
      [ReportType.PROFIT_LOSS]: 'Profit & Loss Statement',
      [ReportType.CASH_FLOW]: 'Cash Flow Statement',
      [ReportType.ACCOUNTS_RECEIVABLE]: 'Accounts Receivable Aging',
      [ReportType.VAT_REPORT]: 'VAT Report (ZRA Compliance)',
      [ReportType.REVENUE_BREAKDOWN]: 'Revenue Analysis',
      [ReportType.EXPENSE_BREAKDOWN]: 'Expense Analysis',
      [ReportType.CUSTOMER_ANALYSIS]: 'Customer Analysis',
    };
    return names[type] || type;
  }

  /**
   * Get report type description
   */
  private getReportTypeDescription(type: ReportType): string {
    const descriptions = {
      [ReportType.FINANCIAL_OVERVIEW]:
        'Comprehensive overview of financial performance including revenue, expenses, and key metrics',
      [ReportType.PROFIT_LOSS]:
        'Detailed profit and loss statement showing revenue, expenses, and profitability',
      [ReportType.CASH_FLOW]:
        'Cash flow analysis showing money in, money out, and projected cash position',
      [ReportType.ACCOUNTS_RECEIVABLE]:
        'Aging report of outstanding customer invoices and payment status',
      [ReportType.VAT_REPORT]:
        'VAT calculation report for ZRA tax compliance and submission',
      [ReportType.REVENUE_BREAKDOWN]:
        'Detailed analysis of revenue by customer, time period, and payment method',
      [ReportType.EXPENSE_BREAKDOWN]:
        'Detailed analysis of expenses by category, time period, and payment method',
      [ReportType.CUSTOMER_ANALYSIS]:
        'Customer performance analysis including payment behavior and risk assessment',
    };
    return descriptions[type] || 'Report description not available';
  }
}
