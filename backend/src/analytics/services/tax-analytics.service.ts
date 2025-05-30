import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxAnalytics } from '../analytics.repository';

export interface TaxOptimizationInsights {
  vatOptimization: {
    currentLiability: number;
    potentialSavings: number;
    recommendations: string[];
    complianceRisk: 'low' | 'medium' | 'high';
  };
  incomeTaxOptimization: {
    currentEstimate: number;
    deductionOpportunities: Array<{
      category: string;
      currentAmount: number;
      potentialAmount: number;
      savings: number;
      description: string;
    }>;
    recommendations: string[];
  };
  cashFlowOptimization: {
    vatPaymentSchedule: Array<{
      dueDate: Date;
      amount: number;
      type: 'VAT' | 'Income Tax' | 'PAYE';
    }>;
    recommendedReserves: number;
    cashFlowImpact: string[];
  };
}

export interface ZraComplianceAnalysis {
  complianceScore: number; // 0-100
  riskAreas: Array<{
    area: string;
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  }>;
  filingStatus: {
    vatReturns: { current: boolean; overdue: number };
    incomeTaxReturns: { current: boolean; overdue: number };
    payeReturns: { current: boolean; overdue: number };
  };
  auditReadiness: {
    score: number;
    missingDocuments: string[];
    recommendations: string[];
  };
}

@Injectable()
export class TaxAnalyticsService {
  private readonly logger = new Logger(TaxAnalyticsService.name);

  // Zambian tax rates and thresholds
  private readonly VAT_RATE = 0.16; // 16% VAT rate in Zambia
  private readonly INCOME_TAX_BRACKETS = [
    { min: 0, max: 4800, rate: 0 },
    { min: 4800, max: 9600, rate: 0.25 },
    { min: 9600, max: 19200, rate: 0.3 },
    { min: 19200, max: Infinity, rate: 0.375 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate comprehensive tax analytics
   */
  async generateTaxAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxAnalytics> {
    try {
      this.logger.log(
        `Generating tax analytics for organization: ${organizationId}`
      );

      const period = this.formatPeriod(startDate, endDate);

      // Calculate VAT analytics
      const vatAnalytics = await this.calculateVatAnalytics(
        organizationId,
        startDate,
        endDate
      );

      // Calculate income tax analytics
      const incomeTaxAnalytics = await this.calculateIncomeTaxAnalytics(
        organizationId,
        startDate,
        endDate
      );

      // Calculate compliance score
      const complianceScore = await this.calculateComplianceScore(
        organizationId,
        startDate,
        endDate
      );

      // Generate recommendations
      const recommendations = this.generateTaxRecommendations(
        vatAnalytics,
        incomeTaxAnalytics,
        complianceScore
      );

      this.logger.log(
        `Tax analytics generated successfully for organization: ${organizationId}`
      );

      return {
        period,
        vatCollected: vatAnalytics.collected,
        vatPaid: vatAnalytics.paid,
        vatLiability: vatAnalytics.liability,
        estimatedQuarterlyVat: vatAnalytics.quarterlyEstimate,
        taxDeductions: incomeTaxAnalytics.deductions,
        taxableIncome: incomeTaxAnalytics.taxableIncome,
        estimatedIncomeTax: incomeTaxAnalytics.estimatedTax,
        complianceScore,
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate tax analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate tax optimization insights
   */
  async generateTaxOptimizationInsights(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxOptimizationInsights> {
    try {
      this.logger.log(
        `Generating tax optimization insights for organization: ${organizationId}`
      );

      // VAT optimization analysis
      const vatOptimization = await this.analyzeVatOptimization(
        organizationId,
        startDate,
        endDate
      );

      // Income tax optimization analysis
      const incomeTaxOptimization = await this.analyzeIncomeTaxOptimization(
        organizationId,
        startDate,
        endDate
      );

      // Cash flow optimization analysis
      const cashFlowOptimization = await this.analyzeCashFlowOptimization(
        organizationId,
        startDate,
        endDate
      );

      this.logger.log(`Tax optimization insights generated successfully`);

      return {
        vatOptimization,
        incomeTaxOptimization,
        cashFlowOptimization,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate tax optimization insights: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Analyze ZRA compliance status
   */
  async analyzeZraCompliance(
    organizationId: string
  ): Promise<ZraComplianceAnalysis> {
    try {
      this.logger.log(
        `Analyzing ZRA compliance for organization: ${organizationId}`
      );

      // Calculate overall compliance score
      const complianceScore =
        await this.calculateDetailedComplianceScore(organizationId);

      // Identify risk areas
      const riskAreas = await this.identifyComplianceRiskAreas(organizationId);

      // Check filing status
      const filingStatus = await this.checkFilingStatus(organizationId);

      // Assess audit readiness
      const auditReadiness = await this.assessAuditReadiness(organizationId);

      this.logger.log(`ZRA compliance analysis completed`);

      return {
        complianceScore,
        riskAreas,
        filingStatus,
        auditReadiness,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze ZRA compliance: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate VAT analytics
   */
  private async calculateVatAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    collected: number;
    paid: number;
    liability: number;
    quarterlyEstimate: number;
  }> {
    // VAT collected from sales (output VAT)
    const salesVat = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
      },
      _sum: { vatAmount: true },
    });

    // VAT paid on purchases (input VAT) - from expenses
    const purchaseVat = await this.prisma.expense.aggregate({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
        // Assuming VAT is calculated as 16% of amount for VAT-eligible expenses
      },
      _sum: { amount: true },
    });

    const collected = salesVat._sum.vatAmount?.toNumber() || 0;
    const paid =
      (purchaseVat._sum.amount?.toNumber() || 0) * this.VAT_RATE * 0.7; // Assume 70% of expenses are VAT-eligible
    const liability = Math.max(0, collected - paid);

    // Estimate quarterly VAT based on current period
    const periodMonths = this.getMonthsDifference(startDate, endDate);
    const quarterlyEstimate =
      periodMonths > 0 ? (liability / periodMonths) * 3 : liability;

    return {
      collected,
      paid,
      liability,
      quarterlyEstimate,
    };
  }

  /**
   * Calculate income tax analytics
   */
  private async calculateIncomeTaxAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    deductions: number;
    taxableIncome: number;
    estimatedTax: number;
  }> {
    // Get total revenue
    const revenue = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
      },
      _sum: { paidAmount: true },
    });

    // Get deductible expenses
    const expenses = await this.prisma.expense.aggregate({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
        // Filter for tax-deductible expenses
      },
      _sum: { amount: true },
    });

    const totalRevenue = revenue._sum.paidAmount?.toNumber() || 0;
    const deductions = expenses._sum.amount?.toNumber() || 0;
    const taxableIncome = Math.max(0, totalRevenue - deductions);

    // Calculate estimated income tax using Zambian brackets
    const estimatedTax = this.calculateIncomeTax(taxableIncome);

    return {
      deductions,
      taxableIncome,
      estimatedTax,
    };
  }

  /**
   * Calculate compliance score
   */
  private async calculateComplianceScore(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let score = 100;

    // Check for missing VAT on invoices
    const invoicesWithoutVat = await this.prisma.invoice.count({
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        vatAmount: { equals: 0 },
        totalAmount: { gt: 0 },
      },
    });

    const totalInvoices = await this.prisma.invoice.count({
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        totalAmount: { gt: 0 },
      },
    });

    if (totalInvoices > 0) {
      const vatComplianceRate = 1 - invoicesWithoutVat / totalInvoices;
      score *= vatComplianceRate;
    }

    // Check for proper expense categorization
    const uncategorizedExpenses = await this.prisma.expense.count({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        category: { in: ['Other', 'Uncategorized', ''] },
      },
    });

    const totalExpenses = await this.prisma.expense.count({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    if (totalExpenses > 0) {
      const categorizationRate = 1 - uncategorizedExpenses / totalExpenses;
      score *= categorizationRate;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate tax recommendations
   */
  private generateTaxRecommendations(
    vatAnalytics: any,
    incomeTaxAnalytics: any,
    complianceScore: number
  ): string[] {
    const recommendations: string[] = [];

    // VAT recommendations
    if (vatAnalytics.liability > 10000) {
      recommendations.push(
        'Consider setting aside funds for quarterly VAT payments'
      );
    }

    if (vatAnalytics.paid < vatAnalytics.collected * 0.3) {
      recommendations.push(
        'Review input VAT claims to ensure all eligible expenses are included'
      );
    }

    // Income tax recommendations
    if (
      incomeTaxAnalytics.deductions <
      incomeTaxAnalytics.taxableIncome * 0.2
    ) {
      recommendations.push(
        'Review expense categorization to maximize tax deductions'
      );
    }

    // Compliance recommendations
    if (complianceScore < 80) {
      recommendations.push(
        'Improve record-keeping and expense categorization for better compliance'
      );
    }

    if (complianceScore < 60) {
      recommendations.push(
        'Consider consulting with a tax professional for compliance review'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Tax compliance and optimization are on track');
    }

    return recommendations;
  }

  /**
   * Analyze VAT optimization opportunities
   */
  private async analyzeVatOptimization(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxOptimizationInsights['vatOptimization']> {
    const vatAnalytics = await this.calculateVatAnalytics(
      organizationId,
      startDate,
      endDate
    );

    // Identify potential savings
    const potentialInputVat = await this.identifyMissedInputVat(
      organizationId,
      startDate,
      endDate
    );
    const potentialSavings = potentialInputVat * this.VAT_RATE;

    const recommendations: string[] = [];
    let complianceRisk: 'low' | 'medium' | 'high' = 'low';

    if (potentialSavings > 1000) {
      recommendations.push(
        'Review expense receipts to claim additional input VAT'
      );
    }

    if (vatAnalytics.liability > vatAnalytics.collected * 0.8) {
      recommendations.push('Ensure all input VAT is properly claimed');
      complianceRisk = 'medium';
    }

    return {
      currentLiability: vatAnalytics.liability,
      potentialSavings,
      recommendations,
      complianceRisk,
    };
  }

  /**
   * Analyze income tax optimization opportunities
   */
  private async analyzeIncomeTaxOptimization(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxOptimizationInsights['incomeTaxOptimization']> {
    const incomeTaxAnalytics = await this.calculateIncomeTaxAnalytics(
      organizationId,
      startDate,
      endDate
    );

    // Identify deduction opportunities
    const deductionOpportunities = await this.identifyDeductionOpportunities(
      organizationId,
      startDate,
      endDate
    );

    const recommendations: string[] = [];

    if (deductionOpportunities.length > 0) {
      recommendations.push(
        'Review expense categorization to maximize deductions'
      );
    }

    recommendations.push('Consider timing of expenses for tax optimization');
    recommendations.push(
      'Maintain proper documentation for all business expenses'
    );

    return {
      currentEstimate: incomeTaxAnalytics.estimatedTax,
      deductionOpportunities,
      recommendations,
    };
  }

  /**
   * Analyze cash flow optimization for taxes
   */
  private async analyzeCashFlowOptimization(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxOptimizationInsights['cashFlowOptimization']> {
    const vatAnalytics = await this.calculateVatAnalytics(
      organizationId,
      startDate,
      endDate
    );
    const incomeTaxAnalytics = await this.calculateIncomeTaxAnalytics(
      organizationId,
      startDate,
      endDate
    );

    // Generate payment schedule
    const vatPaymentSchedule: TaxOptimizationInsights['cashFlowOptimization']['vatPaymentSchedule'] =
      [];

    // VAT is typically due quarterly in Zambia
    const nextQuarterEnd = this.getNextQuarterEnd();
    vatPaymentSchedule.push({
      dueDate: nextQuarterEnd,
      amount: vatAnalytics.quarterlyEstimate,
      type: 'VAT',
    });

    // Income tax is typically due annually
    const nextYearEnd = new Date(new Date().getFullYear() + 1, 2, 31); // March 31st
    vatPaymentSchedule.push({
      dueDate: nextYearEnd,
      amount: incomeTaxAnalytics.estimatedTax,
      type: 'Income Tax',
    });

    const recommendedReserves =
      vatAnalytics.quarterlyEstimate + incomeTaxAnalytics.estimatedTax * 0.25;

    const cashFlowImpact = [
      `Set aside ${this.formatCurrency(recommendedReserves)} for upcoming tax payments`,
      'Consider monthly tax reserves to smooth cash flow impact',
    ];

    return {
      vatPaymentSchedule,
      recommendedReserves,
      cashFlowImpact,
    };
  }

  /**
   * Helper methods
   */
  private calculateIncomeTax(taxableIncome: number): number {
    let tax = 0;
    let remainingIncome = taxableIncome;

    for (const bracket of this.INCOME_TAX_BRACKETS) {
      if (remainingIncome <= 0) break;

      const taxableAtThisBracket = Math.min(
        remainingIncome,
        bracket.max - bracket.min
      );
      tax += taxableAtThisBracket * bracket.rate;
      remainingIncome -= taxableAtThisBracket;
    }

    return tax;
  }

  private formatPeriod(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `${start} to ${end}`;
  }

  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    return Math.max(1, months);
  }

  private getNextQuarterEnd(): Date {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const nextQuarterMonth = (currentQuarter + 1) * 3;

    if (nextQuarterMonth >= 12) {
      return new Date(now.getFullYear() + 1, 2, 31); // March 31st next year
    } else {
      const lastDayOfMonth = new Date(
        now.getFullYear(),
        nextQuarterMonth,
        0
      ).getDate();
      return new Date(now.getFullYear(), nextQuarterMonth - 1, lastDayOfMonth);
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  }

  private async identifyMissedInputVat(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Simplified implementation - identify expenses without VAT claims
    const expensesWithoutVat = await this.prisma.expense.aggregate({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
        // Add condition for expenses that should have VAT but don't
      },
      _sum: { amount: true },
    });

    return (expensesWithoutVat._sum.amount?.toNumber() || 0) * 0.5; // Assume 50% could have VAT
  }

  private async identifyDeductionOpportunities(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    TaxOptimizationInsights['incomeTaxOptimization']['deductionOpportunities']
  > {
    // Simplified implementation
    return [
      {
        category: 'Office Expenses',
        currentAmount: 5000,
        potentialAmount: 7000,
        savings: 750, // 37.5% tax rate on additional 2000
        description: 'Review office supply and equipment purchases',
      },
      {
        category: 'Professional Services',
        currentAmount: 3000,
        potentialAmount: 4500,
        savings: 562.5,
        description: 'Include consulting and professional development costs',
      },
    ];
  }

  private async calculateDetailedComplianceScore(
    organizationId: string
  ): Promise<number> {
    // Enhanced compliance scoring
    return 85; // Simplified for now
  }

  private async identifyComplianceRiskAreas(
    organizationId: string
  ): Promise<ZraComplianceAnalysis['riskAreas']> {
    // Simplified implementation
    return [
      {
        area: 'VAT Documentation',
        riskLevel: 'medium',
        description: 'Some invoices missing proper VAT calculations',
        recommendations: [
          'Ensure all invoices include correct VAT amounts',
          'Review VAT registration requirements',
        ],
      },
    ];
  }

  private async checkFilingStatus(
    organizationId: string
  ): Promise<ZraComplianceAnalysis['filingStatus']> {
    // Simplified implementation
    return {
      vatReturns: { current: true, overdue: 0 },
      incomeTaxReturns: { current: true, overdue: 0 },
      payeReturns: { current: true, overdue: 0 },
    };
  }

  private async assessAuditReadiness(
    organizationId: string
  ): Promise<ZraComplianceAnalysis['auditReadiness']> {
    // Simplified implementation
    return {
      score: 80,
      missingDocuments: [
        'Some expense receipts',
        'Bank reconciliation statements',
      ],
      recommendations: [
        'Organize all financial documents',
        'Ensure proper backup of digital records',
      ],
    };
  }
}
