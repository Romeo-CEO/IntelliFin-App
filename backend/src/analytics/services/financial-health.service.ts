import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BusinessHealthScore, FinancialRatios } from '../analytics.repository';

export interface HealthScoreComponents {
  cashFlow: {
    score: number;
    metrics: {
      operatingCashFlow: number;
      cashFlowTrend: number;
      cashReserves: number;
      burnRate: number;
    };
    insights: string[];
  };
  profitability: {
    score: number;
    metrics: {
      grossMargin: number;
      netMargin: number;
      revenueGrowth: number;
      profitTrend: number;
    };
    insights: string[];
  };
  growth: {
    score: number;
    metrics: {
      revenueGrowth: number;
      customerGrowth: number;
      marketExpansion: number;
      sustainabilityIndex: number;
    };
    insights: string[];
  };
  efficiency: {
    score: number;
    metrics: {
      assetUtilization: number;
      operationalEfficiency: number;
      costControl: number;
      productivityIndex: number;
    };
    insights: string[];
  };
  stability: {
    score: number;
    metrics: {
      revenueStability: number;
      customerConcentration: number;
      debtLevels: number;
      riskDiversification: number;
    };
    insights: string[];
  };
}

@Injectable()
export class FinancialHealthService {
  private readonly logger = new Logger(FinancialHealthService.name);

  // Zambian SME benchmarks
  private readonly SME_BENCHMARKS = {
    cashFlowRatio: 0.15, // 15% of revenue as cash reserves
    profitMargin: 0.12, // 12% net profit margin
    growthRate: 0.20, // 20% annual growth
    debtToEquity: 0.40, // 40% debt-to-equity ratio
    currentRatio: 1.5, // 1.5:1 current ratio
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate comprehensive business health score
   */
  async calculateBusinessHealthScore(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BusinessHealthScore> {
    try {
      this.logger.log(`Calculating business health score for organization: ${organizationId}`);

      // Calculate component scores
      const components = await this.calculateHealthComponents(organizationId, startDate, endDate);

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(components);

      // Determine category
      const category = this.determineHealthCategory(overallScore);

      // Analyze trends
      const trends = await this.analyzeTrends(organizationId, startDate, endDate);

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(components, overallScore);

      // Get benchmarks
      const benchmarks = await this.getBenchmarks(organizationId);

      this.logger.log(`Business health score calculated: ${overallScore}`);

      return {
        overallScore,
        category,
        components: {
          cashFlow: { score: components.cashFlow.score, weight: 0.25 },
          profitability: { score: components.profitability.score, weight: 0.25 },
          growth: { score: components.growth.score, weight: 0.20 },
          efficiency: { score: components.efficiency.score, weight: 0.15 },
          stability: { score: components.stability.score, weight: 0.15 },
        },
        trends,
        recommendations,
        benchmarks,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate business health score: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Calculate financial ratios
   */
  async calculateFinancialRatios(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialRatios> {
    try {
      this.logger.log(`Calculating financial ratios for organization: ${organizationId}`);

      // Get financial data
      const financialData = await this.getFinancialData(organizationId, startDate, endDate);

      // Calculate liquidity ratios
      const liquidity = this.calculateLiquidityRatios(financialData);

      // Calculate profitability ratios
      const profitability = this.calculateProfitabilityRatios(financialData);

      // Calculate efficiency ratios
      const efficiency = this.calculateEfficiencyRatios(financialData);

      // Calculate leverage ratios
      const leverage = this.calculateLeverageRatios(financialData);

      this.logger.log(`Financial ratios calculated successfully`);

      return {
        liquidity,
        profitability,
        efficiency,
        leverage,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate financial ratios: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get detailed health score components
   */
  async getHealthScoreComponents(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HealthScoreComponents> {
    try {
      this.logger.log(`Getting detailed health score components for organization: ${organizationId}`);

      const components = await this.calculateHealthComponents(organizationId, startDate, endDate);

      this.logger.log(`Health score components retrieved successfully`);

      return components;
    } catch (error) {
      this.logger.error(`Failed to get health score components: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Calculate health score components
   */
  private async calculateHealthComponents(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HealthScoreComponents> {
    const financialData = await this.getFinancialData(organizationId, startDate, endDate);

    // Calculate cash flow component
    const cashFlow = this.calculateCashFlowScore(financialData);

    // Calculate profitability component
    const profitability = this.calculateProfitabilityScore(financialData);

    // Calculate growth component
    const growth = await this.calculateGrowthScore(organizationId, startDate, endDate, financialData);

    // Calculate efficiency component
    const efficiency = this.calculateEfficiencyScore(financialData);

    // Calculate stability component
    const stability = await this.calculateStabilityScore(organizationId, startDate, endDate, financialData);

    return {
      cashFlow,
      profitability,
      growth,
      efficiency,
      stability,
    };
  }

  /**
   * Get financial data for calculations
   */
  private async getFinancialData(organizationId: string, startDate: Date, endDate: Date) {
    const [revenue, expenses, assets, liabilities, customers, invoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        _sum: { paidAmount: true, totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          expenseDate: { gte: startDate, lte: endDate },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Simplified asset calculation
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          category: { in: ['Equipment', 'Assets', 'Capital'] },
        },
        _sum: { amount: true },
      }),
      // Simplified liability calculation
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          category: { in: ['Loans', 'Debt', 'Liabilities'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.customer.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
        },
        select: { customerId: true, paidAmount: true },
      }),
    ]);

    return {
      totalRevenue: revenue._sum.paidAmount?.toNumber() || 0,
      totalExpenses: expenses._sum.amount?.toNumber() || 0,
      totalAssets: assets._sum.amount?.toNumber() || 10000, // Default minimum
      totalLiabilities: liabilities._sum.amount?.toNumber() || 0,
      customerCount: customers,
      invoiceCount: revenue._count.id,
      invoices: invoices,
    };
  }

  /**
   * Calculate cash flow score
   */
  private calculateCashFlowScore(financialData: any): HealthScoreComponents['cashFlow'] {
    const operatingCashFlow = financialData.totalRevenue - financialData.totalExpenses;
    const cashFlowRatio = financialData.totalRevenue > 0 ? operatingCashFlow / financialData.totalRevenue : 0;
    
    // Simplified cash reserves calculation
    const cashReserves = Math.max(0, operatingCashFlow * 0.3);
    const burnRate = financialData.totalExpenses / 12; // Monthly burn rate

    let score = 50; // Base score

    // Adjust score based on cash flow metrics
    if (cashFlowRatio > this.SME_BENCHMARKS.cashFlowRatio) score += 30;
    else if (cashFlowRatio > 0) score += 15;
    else score -= 20;

    if (cashReserves > burnRate * 3) score += 20; // 3 months runway
    else if (cashReserves > burnRate) score += 10;
    else score -= 15;

    const insights: string[] = [];
    if (operatingCashFlow < 0) insights.push('Negative cash flow requires immediate attention');
    if (cashReserves < burnRate * 2) insights.push('Low cash reserves - consider improving collections');
    if (score > 80) insights.push('Strong cash flow position');

    return {
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        operatingCashFlow,
        cashFlowTrend: 0, // Would need historical data
        cashReserves,
        burnRate,
      },
      insights,
    };
  }

  /**
   * Calculate profitability score
   */
  private calculateProfitabilityScore(financialData: any): HealthScoreComponents['profitability'] {
    const grossProfit = financialData.totalRevenue - (financialData.totalExpenses * 0.6); // Assume 60% COGS
    const netProfit = financialData.totalRevenue - financialData.totalExpenses;
    
    const grossMargin = financialData.totalRevenue > 0 ? (grossProfit / financialData.totalRevenue) * 100 : 0;
    const netMargin = financialData.totalRevenue > 0 ? (netProfit / financialData.totalRevenue) * 100 : 0;

    let score = 50; // Base score

    // Adjust score based on profitability
    if (netMargin > this.SME_BENCHMARKS.profitMargin * 100) score += 30;
    else if (netMargin > 5) score += 15;
    else if (netMargin > 0) score += 5;
    else score -= 25;

    if (grossMargin > 40) score += 20;
    else if (grossMargin > 25) score += 10;
    else score -= 10;

    const insights: string[] = [];
    if (netMargin < 0) insights.push('Business is operating at a loss');
    if (netMargin < 5) insights.push('Low profit margins - review pricing and costs');
    if (grossMargin < 25) insights.push('Low gross margins - optimize cost of goods sold');
    if (score > 80) insights.push('Strong profitability performance');

    return {
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        grossMargin,
        netMargin,
        revenueGrowth: 0, // Would need historical data
        profitTrend: 0, // Would need historical data
      },
      insights,
    };
  }

  /**
   * Calculate growth score
   */
  private async calculateGrowthScore(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    financialData: any,
  ): Promise<HealthScoreComponents['growth']> {
    // Get previous period data for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const prevData = await this.getFinancialData(organizationId, prevStartDate, prevEndDate);

    const revenueGrowth = prevData.totalRevenue > 0 ? 
      ((financialData.totalRevenue - prevData.totalRevenue) / prevData.totalRevenue) * 100 : 0;

    const customerGrowth = prevData.customerCount > 0 ? 
      ((financialData.customerCount - prevData.customerCount) / prevData.customerCount) * 100 : 0;

    let score = 50; // Base score

    // Adjust score based on growth metrics
    if (revenueGrowth > this.SME_BENCHMARKS.growthRate * 100) score += 30;
    else if (revenueGrowth > 10) score += 20;
    else if (revenueGrowth > 0) score += 10;
    else score -= 15;

    if (customerGrowth > 15) score += 20;
    else if (customerGrowth > 5) score += 10;
    else if (customerGrowth < -5) score -= 10;

    const insights: string[] = [];
    if (revenueGrowth < 0) insights.push('Revenue is declining - focus on growth strategies');
    if (customerGrowth < 0) insights.push('Customer base is shrinking - improve retention');
    if (revenueGrowth > 20) insights.push('Strong revenue growth momentum');
    if (score < 40) insights.push('Growth performance needs improvement');

    return {
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        revenueGrowth,
        customerGrowth,
        marketExpansion: 0, // Simplified
        sustainabilityIndex: Math.min(revenueGrowth, customerGrowth),
      },
      insights,
    };
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(financialData: any): HealthScoreComponents['efficiency'] {
    const assetTurnover = financialData.totalAssets > 0 ? 
      financialData.totalRevenue / financialData.totalAssets : 0;

    const revenuePerCustomer = financialData.customerCount > 0 ? 
      financialData.totalRevenue / financialData.customerCount : 0;

    const costRatio = financialData.totalRevenue > 0 ? 
      (financialData.totalExpenses / financialData.totalRevenue) * 100 : 100;

    let score = 50; // Base score

    // Adjust score based on efficiency metrics
    if (assetTurnover > 2) score += 20;
    else if (assetTurnover > 1) score += 10;
    else score -= 10;

    if (costRatio < 70) score += 25;
    else if (costRatio < 85) score += 15;
    else if (costRatio < 95) score += 5;
    else score -= 20;

    if (revenuePerCustomer > 5000) score += 15;
    else if (revenuePerCustomer > 2000) score += 10;

    const insights: string[] = [];
    if (costRatio > 90) insights.push('High cost ratio - focus on operational efficiency');
    if (assetTurnover < 0.5) insights.push('Low asset utilization - optimize asset usage');
    if (revenuePerCustomer < 1000) insights.push('Low revenue per customer - improve customer value');
    if (score > 80) insights.push('Excellent operational efficiency');

    return {
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        assetUtilization: assetTurnover,
        operationalEfficiency: 100 - costRatio,
        costControl: 100 - costRatio,
        productivityIndex: revenuePerCustomer / 1000, // Normalized
      },
      insights,
    };
  }

  /**
   * Calculate stability score
   */
  private async calculateStabilityScore(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    financialData: any,
  ): Promise<HealthScoreComponents['stability']> {
    // Calculate customer concentration risk
    const customerRevenue = new Map<string, number>();
    financialData.invoices.forEach((invoice: any) => {
      const existing = customerRevenue.get(invoice.customerId) || 0;
      customerRevenue.set(invoice.customerId, existing + (invoice.paidAmount?.toNumber() || 0));
    });

    const revenueArray = Array.from(customerRevenue.values()).sort((a, b) => b - a);
    const topCustomerRevenue = revenueArray[0] || 0;
    const customerConcentration = financialData.totalRevenue > 0 ? 
      (topCustomerRevenue / financialData.totalRevenue) * 100 : 0;

    const debtToEquity = financialData.totalAssets > 0 ? 
      financialData.totalLiabilities / (financialData.totalAssets - financialData.totalLiabilities) : 0;

    let score = 50; // Base score

    // Adjust score based on stability metrics
    if (customerConcentration < 20) score += 25;
    else if (customerConcentration < 40) score += 15;
    else if (customerConcentration < 60) score += 5;
    else score -= 20;

    if (debtToEquity < this.SME_BENCHMARKS.debtToEquity) score += 20;
    else if (debtToEquity < 0.8) score += 10;
    else score -= 15;

    if (financialData.customerCount > 10) score += 15;
    else if (financialData.customerCount > 5) score += 10;
    else score -= 10;

    const insights: string[] = [];
    if (customerConcentration > 50) insights.push('High customer concentration risk - diversify customer base');
    if (debtToEquity > 1) insights.push('High debt levels - focus on debt reduction');
    if (financialData.customerCount < 5) insights.push('Limited customer base - expand market reach');
    if (score > 80) insights.push('Strong business stability');

    return {
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        revenueStability: 100 - (customerConcentration / 2), // Inverse of concentration
        customerConcentration,
        debtLevels: debtToEquity * 100,
        riskDiversification: Math.min(financialData.customerCount * 5, 100),
      },
      insights,
    };
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(components: HealthScoreComponents): number {
    const weights = {
      cashFlow: 0.25,
      profitability: 0.25,
      growth: 0.20,
      efficiency: 0.15,
      stability: 0.15,
    };

    return Math.round(
      components.cashFlow.score * weights.cashFlow +
      components.profitability.score * weights.profitability +
      components.growth.score * weights.growth +
      components.efficiency.score * weights.efficiency +
      components.stability.score * weights.stability
    );
  }

  /**
   * Determine health category
   */
  private determineHealthCategory(score: number): BusinessHealthScore['category'] {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Analyze trends
   */
  private async analyzeTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BusinessHealthScore['trends']> {
    // Simplified trend analysis
    return {
      improving: true,
      deteriorating: false,
      stable: false,
    };
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    components: HealthScoreComponents,
    overallScore: number,
  ): string[] {
    const recommendations: string[] = [];

    // Collect insights from all components
    Object.values(components).forEach(component => {
      recommendations.push(...component.insights);
    });

    // Add overall recommendations
    if (overallScore < 40) {
      recommendations.push('Business health is critical - consider professional financial consultation');
    } else if (overallScore < 70) {
      recommendations.push('Focus on improving cash flow and profitability');
    } else {
      recommendations.push('Maintain current performance and explore growth opportunities');
    }

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  /**
   * Get benchmarks
   */
  private async getBenchmarks(organizationId: string): Promise<BusinessHealthScore['benchmarks']> {
    // In a real implementation, these would be calculated from industry data
    return {
      industry: 72,
      smeAverage: 65,
      topPerformers: 88,
    };
  }

  /**
   * Calculate liquidity ratios
   */
  private calculateLiquidityRatios(financialData: any): FinancialRatios['liquidity'] {
    // Simplified calculations - would need actual balance sheet data
    const currentAssets = financialData.totalAssets * 0.6; // Assume 60% current assets
    const currentLiabilities = financialData.totalLiabilities * 0.8; // Assume 80% current liabilities
    const cash = currentAssets * 0.3; // Assume 30% of current assets is cash

    return {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets - currentAssets * 0.3) / currentLiabilities : 0,
      cashRatio: currentLiabilities > 0 ? cash / currentLiabilities : 0,
    };
  }

  /**
   * Calculate profitability ratios
   */
  private calculateProfitabilityRatios(financialData: any): FinancialRatios['profitability'] {
    const grossProfit = financialData.totalRevenue * 0.4; // Assume 40% gross margin
    const netProfit = financialData.totalRevenue - financialData.totalExpenses;
    const equity = financialData.totalAssets - financialData.totalLiabilities;

    return {
      grossProfitMargin: financialData.totalRevenue > 0 ? (grossProfit / financialData.totalRevenue) * 100 : 0,
      netProfitMargin: financialData.totalRevenue > 0 ? (netProfit / financialData.totalRevenue) * 100 : 0,
      returnOnAssets: financialData.totalAssets > 0 ? (netProfit / financialData.totalAssets) * 100 : 0,
      returnOnEquity: equity > 0 ? (netProfit / equity) * 100 : 0,
    };
  }

  /**
   * Calculate efficiency ratios
   */
  private calculateEfficiencyRatios(financialData: any): FinancialRatios['efficiency'] {
    const receivables = financialData.totalRevenue * 0.15; // Assume 15% of revenue as receivables

    return {
      assetTurnover: financialData.totalAssets > 0 ? financialData.totalRevenue / financialData.totalAssets : 0,
      receivablesTurnover: receivables > 0 ? financialData.totalRevenue / receivables : 0,
      payablesTurnover: 0, // Would need payables data
      inventoryTurnover: 0, // Would need inventory data
    };
  }

  /**
   * Calculate leverage ratios
   */
  private calculateLeverageRatios(financialData: any): FinancialRatios['leverage'] {
    const equity = financialData.totalAssets - financialData.totalLiabilities;
    const interestExpense = financialData.totalExpenses * 0.05; // Assume 5% of expenses are interest
    const ebit = financialData.totalRevenue - financialData.totalExpenses + interestExpense;

    return {
      debtToEquity: equity > 0 ? (financialData.totalLiabilities / equity) * 100 : 0,
      debtToAssets: financialData.totalAssets > 0 ? (financialData.totalLiabilities / financialData.totalAssets) * 100 : 0,
      interestCoverage: interestExpense > 0 ? ebit / interestExpense : 0,
    };
  }
}
