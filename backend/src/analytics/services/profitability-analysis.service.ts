import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CustomerProfitability, ProductProfitability } from '../analytics.repository';

export interface ProfitabilityAnalysis {
  customerProfitability: CustomerProfitability[];
  productProfitability: ProductProfitability[];
  insights: {
    topCustomers: CustomerProfitability[];
    bottomCustomers: CustomerProfitability[];
    topProducts: ProductProfitability[];
    bottomProducts: ProductProfitability[];
    recommendations: string[];
  };
  breakEvenAnalysis: {
    fixedCosts: number;
    variableCostRatio: number;
    breakEvenRevenue: number;
    breakEvenUnits: number;
    marginOfSafety: number;
    contributionMargin: number;
  };
  segmentAnalysis: {
    highValue: { count: number; revenue: number; profit: number };
    mediumValue: { count: number; revenue: number; profit: number };
    lowValue: { count: number; revenue: number; profit: number };
    atRisk: { count: number; revenue: number; profit: number };
  };
}

export interface ProfitabilityTrends {
  customerTrends: Array<{
    customerId: string;
    customerName: string;
    monthlyProfitability: Array<{
      month: string;
      revenue: number;
      profit: number;
      margin: number;
    }>;
    trend: 'improving' | 'declining' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  productTrends: Array<{
    productName: string;
    monthlyProfitability: Array<{
      month: string;
      revenue: number;
      profit: number;
      margin: number;
      unitsSold: number;
    }>;
    trend: 'improving' | 'declining' | 'stable';
    lifecycle: 'growth' | 'maturity' | 'decline';
  }>;
}

@Injectable()
export class ProfitabilityAnalysisService {
  private readonly logger = new Logger(ProfitabilityAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Perform comprehensive profitability analysis
   */
  async analyzeProfitability(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitabilityAnalysis> {
    try {
      this.logger.log(`Analyzing profitability for organization: ${organizationId}`);

      // Analyze customer profitability
      const customerProfitability = await this.analyzeCustomerProfitability(
        organizationId,
        startDate,
        endDate,
      );

      // Analyze product profitability
      const productProfitability = await this.analyzeProductProfitability(
        organizationId,
        startDate,
        endDate,
      );

      // Generate insights
      const insights = this.generateProfitabilityInsights(customerProfitability, productProfitability);

      // Perform break-even analysis
      const breakEvenAnalysis = await this.performBreakEvenAnalysis(organizationId, startDate, endDate);

      // Perform segment analysis
      const segmentAnalysis = this.performSegmentAnalysis(customerProfitability);

      this.logger.log(`Profitability analysis completed for organization: ${organizationId}`);

      return {
        customerProfitability,
        productProfitability,
        insights,
        breakEvenAnalysis,
        segmentAnalysis,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze profitability: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Analyze profitability trends over time
   */
  async analyzeProfitabilityTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitabilityTrends> {
    try {
      this.logger.log(`Analyzing profitability trends for organization: ${organizationId}`);

      // Get customer trends
      const customerTrends = await this.getCustomerProfitabilityTrends(
        organizationId,
        startDate,
        endDate,
      );

      // Get product trends
      const productTrends = await this.getProductProfitabilityTrends(
        organizationId,
        startDate,
        endDate,
      );

      this.logger.log(`Profitability trends analysis completed`);

      return {
        customerTrends,
        productTrends,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze profitability trends: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Analyze customer profitability
   */
  private async analyzeCustomerProfitability(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CustomerProfitability[]> {
    // Get customer revenue data
    const customerRevenue = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
      },
      _sum: { paidAmount: true, totalAmount: true },
      _count: { id: true },
      _avg: { totalAmount: true },
    });

    // Get customer cost data (simplified - using expense allocation)
    const customerCosts = await this.getCustomerCosts(organizationId, startDate, endDate);

    // Calculate customer profitability
    const profitability: CustomerProfitability[] = [];

    for (const revenue of customerRevenue) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: revenue.customerId },
        select: { name: true },
      });

      if (!customer) continue;

      const totalRevenue = revenue._sum.paidAmount?.toNumber() || 0;
      const totalCosts = customerCosts.get(revenue.customerId) || totalRevenue * 0.3; // Default 30% cost ratio
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const transactionCount = revenue._count.id;
      const averageOrderValue = revenue._avg.totalAmount?.toNumber() || 0;

      // Calculate lifetime value (simplified)
      const lifetimeValue = this.calculateCustomerLifetimeValue(
        totalRevenue,
        transactionCount,
        profitMargin,
      );

      // Calculate risk score
      const riskScore = this.calculateCustomerRiskScore(
        profitMargin,
        transactionCount,
        averageOrderValue,
      );

      profitability.push({
        customerId: revenue.customerId,
        customerName: customer.name,
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        transactionCount,
        averageOrderValue,
        lifetimeValue,
        riskScore,
      });
    }

    return profitability.sort((a, b) => b.netProfit - a.netProfit);
  }

  /**
   * Analyze product profitability
   */
  private async analyzeProductProfitability(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductProfitability[]> {
    // Get product revenue data from invoice items
    const productRevenue = await this.prisma.invoiceItem.groupBy({
      by: ['description'],
      where: {
        invoice: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
      },
      _sum: { totalAmount: true, quantity: true },
      _avg: { unitPrice: true },
      _count: { id: true },
    });

    // Calculate product profitability
    const profitability: ProductProfitability[] = [];

    for (const product of productRevenue) {
      const totalRevenue = product._sum.totalAmount?.toNumber() || 0;
      const unitsSold = product._sum.quantity?.toNumber() || 0;
      const averagePrice = product._avg.unitPrice?.toNumber() || 0;

      // Simplified cost calculation (can be enhanced with actual cost data)
      const costPerUnit = averagePrice * 0.4; // Assume 40% cost ratio
      const totalCosts = costPerUnit * unitsSold;
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Determine category (simplified)
      const category = this.categorizeProduct(product.description);

      profitability.push({
        productName: product.description,
        category,
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        unitsSold,
        averagePrice,
        costPerUnit,
      });
    }

    return profitability.sort((a, b) => b.netProfit - a.netProfit);
  }

  /**
   * Generate profitability insights
   */
  private generateProfitabilityInsights(
    customerProfitability: CustomerProfitability[],
    productProfitability: ProductProfitability[],
  ): ProfitabilityAnalysis['insights'] {
    // Top and bottom customers
    const topCustomers = customerProfitability.slice(0, 5);
    const bottomCustomers = customerProfitability
      .filter(c => c.netProfit < 0)
      .slice(-5)
      .reverse();

    // Top and bottom products
    const topProducts = productProfitability.slice(0, 5);
    const bottomProducts = productProfitability
      .filter(p => p.netProfit < 0)
      .slice(-5)
      .reverse();

    // Generate recommendations
    const recommendations: string[] = [];

    if (bottomCustomers.length > 0) {
      recommendations.push(`${bottomCustomers.length} customers are unprofitable - review pricing or service costs`);
    }

    if (bottomProducts.length > 0) {
      recommendations.push(`${bottomProducts.length} products are unprofitable - review pricing or discontinue`);
    }

    const highRiskCustomers = customerProfitability.filter(c => c.riskScore > 70).length;
    if (highRiskCustomers > 0) {
      recommendations.push(`${highRiskCustomers} customers are high-risk - implement retention strategies`);
    }

    const lowMarginProducts = productProfitability.filter(p => p.profitMargin < 10).length;
    if (lowMarginProducts > 0) {
      recommendations.push(`${lowMarginProducts} products have low margins - optimize pricing or costs`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Profitability analysis shows healthy margins across customers and products');
    }

    return {
      topCustomers,
      bottomCustomers,
      topProducts,
      bottomProducts,
      recommendations,
    };
  }

  /**
   * Perform break-even analysis
   */
  private async performBreakEvenAnalysis(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitabilityAnalysis['breakEvenAnalysis']> {
    // Get total revenue and expenses
    const [revenueData, expenseData] = await Promise.all([
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
    ]);

    const totalRevenue = revenueData._sum.paidAmount?.toNumber() || 0;
    const totalExpenses = expenseData._sum.amount?.toNumber() || 0;

    // Simplified break-even calculation
    const fixedCosts = totalExpenses * 0.6; // Assume 60% fixed costs
    const variableCosts = totalExpenses * 0.4; // Assume 40% variable costs
    const variableCostRatio = totalRevenue > 0 ? variableCosts / totalRevenue : 0.4;
    const contributionMargin = 1 - variableCostRatio;

    const breakEvenRevenue = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
    const breakEvenUnits = breakEvenRevenue > 0 && totalRevenue > 0 ? 
      breakEvenRevenue / (totalRevenue / this.getEstimatedUnitsSold(organizationId, startDate, endDate)) : 0;

    const marginOfSafety = totalRevenue > breakEvenRevenue ? 
      ((totalRevenue - breakEvenRevenue) / totalRevenue) * 100 : 0;

    return {
      fixedCosts,
      variableCostRatio: variableCostRatio * 100,
      breakEvenRevenue,
      breakEvenUnits,
      marginOfSafety,
      contributionMargin: contributionMargin * 100,
    };
  }

  /**
   * Perform customer segment analysis
   */
  private performSegmentAnalysis(
    customerProfitability: CustomerProfitability[],
  ): ProfitabilityAnalysis['segmentAnalysis'] {
    const segments = {
      highValue: { count: 0, revenue: 0, profit: 0 },
      mediumValue: { count: 0, revenue: 0, profit: 0 },
      lowValue: { count: 0, revenue: 0, profit: 0 },
      atRisk: { count: 0, revenue: 0, profit: 0 },
    };

    customerProfitability.forEach(customer => {
      if (customer.riskScore > 70) {
        segments.atRisk.count++;
        segments.atRisk.revenue += customer.totalRevenue;
        segments.atRisk.profit += customer.netProfit;
      } else if (customer.lifetimeValue > 10000) {
        segments.highValue.count++;
        segments.highValue.revenue += customer.totalRevenue;
        segments.highValue.profit += customer.netProfit;
      } else if (customer.lifetimeValue > 5000) {
        segments.mediumValue.count++;
        segments.mediumValue.revenue += customer.totalRevenue;
        segments.mediumValue.profit += customer.netProfit;
      } else {
        segments.lowValue.count++;
        segments.lowValue.revenue += customer.totalRevenue;
        segments.lowValue.profit += customer.netProfit;
      }
    });

    return segments;
  }

  /**
   * Get customer profitability trends
   */
  private async getCustomerProfitabilityTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitabilityTrends['customerTrends']> {
    // Simplified implementation - can be enhanced with actual monthly data
    const customers = await this.prisma.customer.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      take: 10, // Limit for performance
    });

    const trends: ProfitabilityTrends['customerTrends'] = [];

    for (const customer of customers) {
      // Get monthly data for customer (simplified)
      const monthlyData = await this.getCustomerMonthlyData(customer.id, startDate, endDate);
      
      const trend = this.calculateTrend(monthlyData.map(m => m.profit));
      const riskLevel = this.calculateRiskLevel(monthlyData);

      trends.push({
        customerId: customer.id,
        customerName: customer.name,
        monthlyProfitability: monthlyData,
        trend,
        riskLevel,
      });
    }

    return trends;
  }

  /**
   * Get product profitability trends
   */
  private async getProductProfitabilityTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitabilityTrends['productTrends']> {
    // Simplified implementation
    const products = await this.prisma.invoiceItem.groupBy({
      by: ['description'],
      where: {
        invoice: { organizationId },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const trends: ProfitabilityTrends['productTrends'] = [];

    for (const product of products) {
      const monthlyData = await this.getProductMonthlyData(
        organizationId,
        product.description,
        startDate,
        endDate,
      );
      
      const trend = this.calculateTrend(monthlyData.map(m => m.profit));
      const lifecycle = this.determineProductLifecycle(monthlyData);

      trends.push({
        productName: product.description,
        monthlyProfitability: monthlyData,
        trend,
        lifecycle,
      });
    }

    return trends;
  }

  /**
   * Helper methods
   */
  private async getCustomerCosts(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, number>> {
    // Simplified cost allocation - can be enhanced with actual cost tracking
    const costs = new Map<string, number>();
    
    // For now, use a simplified approach
    // In a real implementation, you would track customer-specific costs
    
    return costs;
  }

  private calculateCustomerLifetimeValue(
    revenue: number,
    transactionCount: number,
    profitMargin: number,
  ): number {
    // Simplified LTV calculation
    const avgOrderValue = transactionCount > 0 ? revenue / transactionCount : 0;
    const avgProfit = avgOrderValue * (profitMargin / 100);
    const estimatedLifetimeTransactions = Math.max(12, transactionCount * 2);
    
    return avgProfit * estimatedLifetimeTransactions;
  }

  private calculateCustomerRiskScore(
    profitMargin: number,
    transactionCount: number,
    averageOrderValue: number,
  ): number {
    let riskScore = 0;
    
    // Low profit margin increases risk
    if (profitMargin < 10) riskScore += 30;
    else if (profitMargin < 20) riskScore += 15;
    
    // Low transaction count increases risk
    if (transactionCount < 3) riskScore += 25;
    else if (transactionCount < 6) riskScore += 10;
    
    // Low order value increases risk
    if (averageOrderValue < 1000) riskScore += 20;
    else if (averageOrderValue < 5000) riskScore += 10;
    
    return Math.min(100, riskScore);
  }

  private categorizeProduct(productName: string): string {
    // Simplified product categorization
    const name = productName.toLowerCase();
    
    if (name.includes('service') || name.includes('consultation')) return 'Services';
    if (name.includes('software') || name.includes('digital')) return 'Digital Products';
    if (name.includes('equipment') || name.includes('hardware')) return 'Equipment';
    
    return 'General Products';
  }

  private async getEstimatedUnitsSold(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.prisma.invoiceItem.aggregate({
      where: {
        invoice: {
          organizationId,
          issueDate: { gte: startDate, lte: endDate },
        },
      },
      _sum: { quantity: true },
    });
    
    return result._sum.quantity?.toNumber() || 1;
  }

  private async getCustomerMonthlyData(
    customerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ month: string; revenue: number; profit: number; margin: number }>> {
    // Simplified monthly data - would need actual implementation
    return [];
  }

  private async getProductMonthlyData(
    organizationId: string,
    productName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ month: string; revenue: number; profit: number; margin: number; unitsSold: number }>> {
    // Simplified monthly data - would need actual implementation
    return [];
  }

  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private calculateRiskLevel(monthlyData: Array<{ profit: number }>): 'low' | 'medium' | 'high' {
    const profits = monthlyData.map(m => m.profit);
    const avgProfit = profits.reduce((sum, val) => sum + val, 0) / profits.length;
    const negativeMonths = profits.filter(p => p < 0).length;
    
    if (avgProfit < 0 || negativeMonths > profits.length * 0.5) return 'high';
    if (avgProfit < 1000 || negativeMonths > profits.length * 0.3) return 'medium';
    return 'low';
  }

  private determineProductLifecycle(
    monthlyData: Array<{ unitsSold: number }>
  ): 'growth' | 'maturity' | 'decline' {
    if (monthlyData.length < 3) return 'maturity';
    
    const trend = this.calculateTrend(monthlyData.map(m => m.unitsSold));
    
    if (trend === 'improving') return 'growth';
    if (trend === 'declining') return 'decline';
    return 'maturity';
  }
}
