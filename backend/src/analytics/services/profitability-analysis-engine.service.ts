import { Injectable, Logger } from '@nestjs/common';
import { BaseAnalyticsService } from './base-analytics.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { DatabaseService } from '../../database/database.service';
import { 
  CustomerProfitability, 
  DateRange,
  AnalyticsDataSource 
} from '../interfaces/analytics-data.interface';

/**
 * Profitability Analysis Engine Service
 * 
 * Provides comprehensive profitability analysis for Zambian SMEs including
 * customer profitability, product margins, cost allocation, and optimization insights.
 * 
 * Features:
 * - Advanced customer profitability analysis with activity-based costing
 * - Product/service margin analysis and optimization
 * - Cost allocation algorithms for accurate profitability calculation
 * - Risk assessment and customer ranking
 * - Profitability trend analysis and forecasting
 * - Zambian market context and industry benchmarking
 */
@Injectable()
export class ProfitabilityAnalysisEngineService {
  private readonly logger = new Logger(ProfitabilityAnalysisEngineService.name);

  constructor(
    private readonly baseAnalyticsService: BaseAnalyticsService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly databaseService: DatabaseService
  ) {}

  /**
   * Analyze customer profitability with advanced cost allocation
   */
  async analyzeCustomerProfitability(
    organizationId: string,
    dateRange: DateRange,
    includeCostAllocation: boolean = true,
    minProfitThreshold?: number
  ): Promise<{
    customers: CustomerProfitability[];
    summary: any;
    insights: any[];
    recommendations: any[];
  }> {
    try {
      this.logger.log(`Analyzing customer profitability for organization ${organizationId}`);

      // Get comprehensive financial data
      const financialData = await this.aggregationService.aggregateFinancialData(
        organizationId,
        dateRange
      );

      // Calculate customer profitability with advanced algorithms
      const customerProfitability = await this.calculateCustomerProfitability(
        financialData,
        includeCostAllocation
      );

      // Filter by minimum profit threshold if specified
      const filteredCustomers = minProfitThreshold 
        ? customerProfitability.filter(c => c.netProfit >= minProfitThreshold)
        : customerProfitability;

      // Generate summary statistics
      const summary = this.generateProfitabilitySummary(filteredCustomers);

      // Generate insights
      const insights = this.generateProfitabilityInsights(filteredCustomers, summary);

      // Generate optimization recommendations
      const recommendations = this.generateProfitabilityRecommendations(
        filteredCustomers,
        summary
      );

      this.logger.log(`Completed customer profitability analysis for ${filteredCustomers.length} customers`);
      return { customers: filteredCustomers, summary, insights, recommendations };

    } catch (error) {
      this.logger.error(`Failed to analyze customer profitability: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze profitability trends over time
   */
  async analyzeProfitabilityTrends(
    organizationId: string,
    dateRange: DateRange,
    groupBy: 'MONTH' | 'QUARTER' = 'MONTH'
  ): Promise<{
    trends: any[];
    summary: any;
    forecasts: any[];
  }> {
    try {
      this.logger.log(`Analyzing profitability trends for organization ${organizationId}`);

      // Split date range into periods
      const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(dateRange, groupBy);

      // Calculate profitability for each period
      const trends = await Promise.all(
        periods.map(async (period) => {
          const periodData = await this.aggregationService.aggregateFinancialData(
            organizationId,
            period
          );
          return this.calculatePeriodProfitability(periodData, period);
        })
      );

      // Generate trend summary
      const summary = this.generateTrendSummary(trends);

      // Generate profitability forecasts
      const forecasts = this.generateProfitabilityForecasts(trends, 3); // 3 periods ahead

      this.logger.log(`Completed profitability trend analysis for ${trends.length} periods`);
      return { trends, summary, forecasts };

    } catch (error) {
      this.logger.error(`Failed to analyze profitability trends: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate margin optimization recommendations
   */
  async generateMarginOptimizationRecommendations(
    organizationId: string,
    dateRange: DateRange
  ): Promise<{
    recommendations: any[];
    potentialImpact: number;
    summary: any;
  }> {
    try {
      this.logger.log(`Generating margin optimization recommendations for organization ${organizationId}`);

      // Get profitability analysis
      const profitabilityAnalysis = await this.analyzeCustomerProfitability(
        organizationId,
        dateRange,
        true
      );

      // Generate optimization strategies
      const recommendations = this.generateOptimizationStrategies(profitabilityAnalysis);

      // Calculate potential impact
      const potentialImpact = this.calculateOptimizationImpact(
        recommendations,
        profitabilityAnalysis.summary
      );

      // Generate summary
      const summary = this.generateOptimizationSummary(recommendations, potentialImpact);

      this.logger.log(`Generated ${recommendations.length} margin optimization recommendations`);
      return { recommendations, potentialImpact, summary };

    } catch (error) {
      this.logger.error(`Failed to generate margin optimization recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate customer profitability with advanced cost allocation
   */
  private async calculateCustomerProfitability(
    financialData: AnalyticsDataSource,
    includeCostAllocation: boolean
  ): Promise<CustomerProfitability[]> {
    const customers = financialData.customers;
    const expenses = financialData.expenses;

    // Calculate total expenses for allocation
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalRevenue, 0);

    // Calculate customer profitability
    const customerProfitability = customers.map(customer => {
      const revenue = customer.totalRevenue;

      // Calculate direct costs (simplified - would use actual COGS data)
      const directCosts = this.calculateDirectCosts(customer, financialData);

      // Calculate allocated costs if requested
      let allocatedCosts = 0;
      if (includeCostAllocation && totalRevenue > 0) {
        allocatedCosts = this.calculateAllocatedCosts(
          customer,
          totalExpenses,
          totalRevenue,
          financialData
        );
      }

      // Calculate profitability metrics
      const grossProfit = revenue - directCosts;
      const netProfit = grossProfit - allocatedCosts;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Assess risk level
      const riskLevel = this.assessCustomerRisk(customer, profitMargin, financialData);

      return {
        customerId: customer.id,
        customerName: customer.name,
        revenue,
        directCosts,
        allocatedCosts,
        grossProfit,
        netProfit,
        profitMargin,
        ranking: 0, // Will be set after sorting
        riskLevel
      };
    });

    // Sort by net profit and assign rankings
    customerProfitability.sort((a, b) => b.netProfit - a.netProfit);
    customerProfitability.forEach((customer, index) => {
      customer.ranking = index + 1;
    });

    return customerProfitability;
  }

  /**
   * Calculate direct costs for a customer
   */
  private calculateDirectCosts(customer: any, financialData: AnalyticsDataSource): number {
    // Simplified direct cost calculation
    // In a real implementation, this would use actual cost data
    
    // Assume 60% of revenue as direct costs (industry average for services)
    const costRatio = this.getIndustryCostRatio(customer);
    return customer.totalRevenue * costRatio;
  }

  /**
   * Get industry-specific cost ratio
   */
  private getIndustryCostRatio(customer: any): number {
    // Simplified industry cost ratios for Zambian market
    // This would be configurable and based on actual industry data
    return 0.6; // 60% default cost ratio
  }

  /**
   * Calculate allocated costs using activity-based costing principles
   */
  private calculateAllocatedCosts(
    customer: any,
    totalExpenses: number,
    totalRevenue: number,
    financialData: AnalyticsDataSource
  ): number {
    // Multiple allocation methods for accuracy

    // 1. Revenue-based allocation (primary)
    const revenuePercentage = customer.totalRevenue / totalRevenue;
    const revenueBasedAllocation = totalExpenses * revenuePercentage * 0.6; // 60% weight

    // 2. Transaction-based allocation
    const totalTransactions = financialData.customers.reduce(
      (sum, c) => sum + c.invoiceCount, 0
    );
    const transactionPercentage = customer.invoiceCount / totalTransactions;
    const transactionBasedAllocation = totalExpenses * transactionPercentage * 0.3; // 30% weight

    // 3. Time-based allocation (simplified)
    const timeBasedAllocation = totalExpenses * revenuePercentage * 0.1; // 10% weight

    return revenueBasedAllocation + transactionBasedAllocation + timeBasedAllocation;
  }

  /**
   * Assess customer risk level
   */
  private assessCustomerRisk(
    customer: any,
    profitMargin: number,
    financialData: AnalyticsDataSource
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Profitability risk
    if (profitMargin < 5) riskScore += 3;
    else if (profitMargin < 15) riskScore += 1;

    // Payment behavior risk
    const avgPaymentTime = this.calculateAveragePaymentTime(customer, financialData);
    if (avgPaymentTime > 45) riskScore += 2;
    else if (avgPaymentTime > 30) riskScore += 1;

    // Revenue concentration risk
    const totalRevenue = financialData.customers.reduce(
      (sum, c) => sum + c.totalRevenue, 0
    );
    const revenueConcentration = customer.totalRevenue / totalRevenue;
    if (revenueConcentration > 0.3) riskScore += 2; // High dependency
    else if (revenueConcentration > 0.15) riskScore += 1;

    // Determine risk level
    if (riskScore >= 5) return 'HIGH';
    else if (riskScore >= 3) return 'MEDIUM';
    else return 'LOW';
  }

  /**
   * Calculate average payment time for a customer
   */
  private calculateAveragePaymentTime(customer: any, financialData: AnalyticsDataSource): number {
    const customerPayments = financialData.payments.filter(
      payment => payment.customerId === customer.id
    );

    if (customerPayments.length === 0) return 30; // Default assumption

    // Simplified calculation - would use actual invoice due dates
    return 25; // Placeholder - average 25 days
  }

  /**
   * Calculate profitability for a specific period
   */
  private calculatePeriodProfitability(financialData: AnalyticsDataSource, period: DateRange): any {
    const revenue = financialData.invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const expenses = financialData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate costs (simplified)
    const directCosts = revenue * 0.6; // 60% of revenue
    const grossProfit = revenue - directCosts;
    const netProfit = grossProfit - expenses;
    
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      period: period.startDate.toISOString().slice(0, 7),
      startDate: period.startDate,
      endDate: period.endDate,
      revenue,
      directCosts,
      expenses,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      customerCount: financialData.customers.length,
      invoiceCount: financialData.invoices.length
    };
  }

  /**
   * Generate profitability summary statistics
   */
  private generateProfitabilitySummary(customers: CustomerProfitability[]): any {
    const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
    const totalNetProfit = customers.reduce((sum, c) => sum + c.netProfit, 0);
    const averageProfitMargin = customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.profitMargin, 0) / customers.length 
      : 0;

    const profitableCustomers = customers.filter(c => c.netProfit > 0);
    const unprofitableCustomers = customers.filter(c => c.netProfit <= 0);

    // Top performers
    const top10Customers = customers.slice(0, 10);
    const top10Revenue = top10Customers.reduce((sum, c) => sum + c.revenue, 0);
    const top10Profit = top10Customers.reduce((sum, c) => sum + c.netProfit, 0);

    return {
      totalCustomers: customers.length,
      totalRevenue,
      totalNetProfit,
      averageProfitMargin,
      profitableCustomers: profitableCustomers.length,
      unprofitableCustomers: unprofitableCustomers.length,
      top10Revenue,
      top10Profit,
      top10RevenuePercentage: totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0,
      averageRevenuePerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0,
      highRiskCustomers: customers.filter(c => c.riskLevel === 'HIGH').length,
      mediumRiskCustomers: customers.filter(c => c.riskLevel === 'MEDIUM').length
    };
  }

  /**
   * Generate profitability insights
   */
  private generateProfitabilityInsights(
    customers: CustomerProfitability[],
    summary: any
  ): any[] {
    const insights: any[] = [];

    // Revenue concentration insight
    if (summary.top10RevenuePercentage > 80) {
      insights.push({
        type: 'WARNING',
        title: 'High revenue concentration risk',
        description: `Top 10 customers represent ${summary.top10RevenuePercentage.toFixed(1)}% of revenue`,
        recommendation: 'Diversify customer base to reduce dependency risk',
        priority: 'HIGH'
      });
    }

    // Unprofitable customers insight
    if (summary.unprofitableCustomers > 0) {
      insights.push({
        type: 'OPPORTUNITY',
        title: 'Unprofitable customers identified',
        description: `${summary.unprofitableCustomers} customers are unprofitable`,
        recommendation: 'Review pricing and service delivery for unprofitable customers',
        priority: 'MEDIUM'
      });
    }

    // High-risk customers insight
    if (summary.highRiskCustomers > 0) {
      insights.push({
        type: 'WARNING',
        title: 'High-risk customers detected',
        description: `${summary.highRiskCustomers} customers are classified as high-risk`,
        recommendation: 'Implement risk mitigation strategies for high-risk customers',
        priority: 'HIGH'
      });
    }

    // Profitability performance insight
    if (summary.averageProfitMargin > 20) {
      insights.push({
        type: 'POSITIVE',
        title: 'Strong profitability performance',
        description: `Average profit margin of ${summary.averageProfitMargin.toFixed(1)}% is excellent`,
        recommendation: 'Maintain current strategies and consider expansion',
        priority: 'LOW'
      });
    } else if (summary.averageProfitMargin < 10) {
      insights.push({
        type: 'WARNING',
        title: 'Low profitability margins',
        description: `Average profit margin of ${summary.averageProfitMargin.toFixed(1)}% is below optimal`,
        recommendation: 'Focus on cost reduction and pricing optimization',
        priority: 'HIGH'
      });
    }

    return insights;
  }

  /**
   * Generate profitability recommendations
   */
  private generateProfitabilityRecommendations(
    customers: CustomerProfitability[],
    summary: any
  ): any[] {
    const recommendations: any[] = [];

    // Focus on top customers
    const topCustomers = customers.slice(0, 5);
    if (topCustomers.length > 0) {
      recommendations.push({
        type: 'CUSTOMER_FOCUS',
        title: 'Strengthen relationships with top customers',
        description: `Top 5 customers generate ${topCustomers.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()} in revenue`,
        actions: [
          'Develop customer retention programs',
          'Provide premium service levels',
          'Regular business reviews and feedback sessions'
        ],
        priority: 'HIGH',
        estimatedImpact: 'High'
      });
    }

    // Address unprofitable customers
    const unprofitableCustomers = customers.filter(c => c.netProfit <= 0);
    if (unprofitableCustomers.length > 0) {
      recommendations.push({
        type: 'PROFITABILITY_IMPROVEMENT',
        title: 'Address unprofitable customers',
        description: `${unprofitableCustomers.length} customers are currently unprofitable`,
        actions: [
          'Review and adjust pricing for unprofitable customers',
          'Optimize service delivery to reduce costs',
          'Consider customer relationship restructuring'
        ],
        priority: 'MEDIUM',
        estimatedImpact: 'Medium'
      });
    }

    // Risk mitigation
    const highRiskCustomers = customers.filter(c => c.riskLevel === 'HIGH');
    if (highRiskCustomers.length > 0) {
      recommendations.push({
        type: 'RISK_MITIGATION',
        title: 'Mitigate high-risk customer exposure',
        description: `${highRiskCustomers.length} customers are classified as high-risk`,
        actions: [
          'Implement stricter payment terms',
          'Require deposits or guarantees',
          'Monitor payment behavior closely'
        ],
        priority: 'HIGH',
        estimatedImpact: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Generate trend summary
   */
  private generateTrendSummary(trends: any[]): any {
    if (trends.length < 2) {
      return { trendDirection: 'INSUFFICIENT_DATA', message: 'Need more data for trend analysis' };
    }

    const firstPeriod = trends[0];
    const lastPeriod = trends[trends.length - 1];

    const revenueGrowth = this.baseAnalyticsService.calculatePercentageChange(
      lastPeriod.revenue,
      firstPeriod.revenue
    );

    const profitGrowth = this.baseAnalyticsService.calculatePercentageChange(
      lastPeriod.netProfit,
      firstPeriod.netProfit
    );

    const marginTrend = lastPeriod.netMargin - firstPeriod.netMargin;

    return {
      periodsAnalyzed: trends.length,
      revenueGrowth,
      profitGrowth,
      marginTrend,
      averageNetMargin: trends.reduce((sum, t) => sum + t.netMargin, 0) / trends.length,
      trendDirection: profitGrowth > 5 ? 'IMPROVING' : profitGrowth < -5 ? 'DECLINING' : 'STABLE'
    };
  }

  /**
   * Generate profitability forecasts
   */
  private generateProfitabilityForecasts(trends: any[], periods: number): any[] {
    if (trends.length < 3) {
      return []; // Need minimum data for forecasting
    }

    const forecasts: any[] = [];
    const lastTrend = trends[trends.length - 1];

    // Simple linear extrapolation
    const revenueGrowthRate = this.calculateGrowthRate(trends.map(t => t.revenue));
    const marginTrend = this.calculateGrowthRate(trends.map(t => t.netMargin));

    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(lastTrend.endDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      const forecastRevenue = lastTrend.revenue * Math.pow(1 + revenueGrowthRate, i);
      const forecastMargin = Math.max(0, lastTrend.netMargin + (marginTrend * i));
      const forecastProfit = forecastRevenue * (forecastMargin / 100);

      forecasts.push({
        period: forecastDate.toISOString().slice(0, 7),
        forecastRevenue,
        forecastMargin,
        forecastProfit,
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence
      });
    }

    return forecasts;
  }

  /**
   * Calculate growth rate from time series
   */
  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;

    if (firstValue <= 0) return 0;

    return Math.pow(lastValue / firstValue, 1 / periods) - 1;
  }

  /**
   * Generate optimization strategies
   */
  private generateOptimizationStrategies(profitabilityAnalysis: any): any[] {
    const strategies: any[] = [];
    const { customers, summary } = profitabilityAnalysis;

    // Strategy 1: Focus on high-margin customers
    const highMarginCustomers = customers.filter((c: CustomerProfitability) => c.profitMargin > 25);
    if (highMarginCustomers.length > 0) {
      strategies.push({
        type: 'CUSTOMER_FOCUS',
        title: 'Expand high-margin customer relationships',
        description: `${highMarginCustomers.length} customers have margins above 25%`,
        potentialImpact: 0.15, // 15% potential improvement
        priority: 'HIGH'
      });
    }

    // Strategy 2: Improve low-margin customers
    const lowMarginCustomers = customers.filter((c: CustomerProfitability) => 
      c.profitMargin > 0 && c.profitMargin < 10
    );
    if (lowMarginCustomers.length > 0) {
      strategies.push({
        type: 'MARGIN_IMPROVEMENT',
        title: 'Optimize low-margin customer relationships',
        description: `${lowMarginCustomers.length} customers have margins below 10%`,
        potentialImpact: 0.1, // 10% potential improvement
        priority: 'MEDIUM'
      });
    }

    return strategies;
  }

  /**
   * Calculate optimization impact
   */
  private calculateOptimizationImpact(strategies: any[], summary: any): number {
    return strategies.reduce((total, strategy) => {
      return total + (summary.totalRevenue * strategy.potentialImpact);
    }, 0);
  }

  /**
   * Generate optimization summary
   */
  private generateOptimizationSummary(strategies: any[], potentialImpact: number): any {
    return {
      totalStrategies: strategies.length,
      highPriorityStrategies: strategies.filter(s => s.priority === 'HIGH').length,
      potentialImpact,
      estimatedImplementationTime: strategies.length * 4, // 4 weeks per strategy
      riskLevel: 'LOW' // Profitability optimization is generally low risk
    };
  }
}
