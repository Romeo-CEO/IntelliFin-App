import { Injectable, Logger } from '@nestjs/common';
import { BaseAnalyticsService } from './base-analytics.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { DatabaseService } from '../../database/database.service';
import { 
  ExpensePattern, 
  ExpenseAnomaly, 
  DateRange,
  TrendAnalysis 
} from '../interfaces/analytics-data.interface';

/**
 * Expense Trend Analysis Service
 * 
 * Provides advanced expense trend analysis and pattern detection for Zambian SMEs.
 * Includes anomaly detection, cost optimization insights, and seasonal pattern recognition.
 * 
 * Features:
 * - Expense trend analysis with statistical modeling
 * - Anomaly detection using Z-score and contextual analysis
 * - Category-wise expense pattern recognition
 * - Seasonal expense pattern detection for Zambian business cycles
 * - Cost optimization recommendations
 * - Tax-deductible expense tracking and optimization
 */
@Injectable()
export class ExpenseTrendAnalysisService {
  private readonly logger = new Logger(ExpenseTrendAnalysisService.name);

  constructor(
    private readonly baseAnalyticsService: BaseAnalyticsService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly databaseService: DatabaseService
  ) {}

  /**
   * Analyze expense trends with pattern detection
   */
  async analyzeExpenseTrends(
    organizationId: string,
    dateRange: DateRange,
    groupBy: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH'
  ): Promise<{
    trends: any[];
    patterns: ExpensePattern[];
    summary: any;
    insights: any[];
  }> {
    try {
      this.logger.log(`Analyzing expense trends for organization ${organizationId}`);

      // Get aggregated expense data
      const financialData = await this.aggregationService.aggregateFinancialData(
        organizationId,
        dateRange
      );

      // Split into time periods
      const periods = this.baseAnalyticsService.splitDateRangeIntoPeriods(dateRange, groupBy);
      
      // Calculate trends for each period
      const trends = this.calculateExpenseTrends(financialData.expenses, periods);
      
      // Detect expense patterns
      const patterns = this.detectExpensePatterns(financialData.expenses, trends);
      
      // Generate summary statistics
      const summary = this.generateExpenseSummary(trends, patterns);
      
      // Generate actionable insights
      const insights = this.generateExpenseInsights(trends, patterns, summary);

      this.logger.log(`Completed expense trend analysis for organization ${organizationId}`);
      return { trends, patterns, summary, insights };

    } catch (error) {
      this.logger.error(`Failed to analyze expense trends: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Detect expense anomalies using statistical analysis
   */
  async detectExpenseAnomalies(
    organizationId: string,
    dateRange: DateRange,
    sensitivityLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<{
    anomalies: ExpenseAnomaly[];
    summary: any;
    recommendations: string[];
  }> {
    try {
      this.logger.log(`Detecting expense anomalies for organization ${organizationId}`);

      // Get expense data
      const financialData = await this.aggregationService.aggregateFinancialData(
        organizationId,
        dateRange
      );

      // Detect anomalies by category
      const anomalies = this.detectAnomaliesByCategory(
        financialData.expenses,
        sensitivityLevel
      );

      // Generate summary
      const summary = this.generateAnomalySummary(anomalies);

      // Generate recommendations
      const recommendations = this.generateAnomalyRecommendations(anomalies, summary);

      this.logger.log(`Detected ${anomalies.length} expense anomalies`);
      return { anomalies, summary, recommendations };

    } catch (error) {
      this.logger.error(`Failed to detect expense anomalies: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateCostOptimizationRecommendations(
    organizationId: string,
    dateRange: DateRange
  ): Promise<{
    recommendations: any[];
    potentialSavings: number;
    summary: any;
  }> {
    try {
      this.logger.log(`Generating cost optimization recommendations for organization ${organizationId}`);

      // Get comprehensive expense analysis
      const [trendAnalysis, anomalies] = await Promise.all([
        this.analyzeExpenseTrends(organizationId, dateRange),
        this.detectExpenseAnomalies(organizationId, dateRange)
      ]);

      // Generate optimization recommendations
      const recommendations = this.generateOptimizationStrategies(
        trendAnalysis,
        anomalies
      );

      // Calculate potential savings
      const potentialSavings = this.calculatePotentialSavings(recommendations);

      // Generate summary
      const summary = this.generateOptimizationSummary(recommendations, potentialSavings);

      this.logger.log(`Generated ${recommendations.length} cost optimization recommendations`);
      return { recommendations, potentialSavings, summary };

    } catch (error) {
      this.logger.error(`Failed to generate cost optimization recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate expense trends for time periods
   */
  private calculateExpenseTrends(expenses: any[], periods: DateRange[]): any[] {
    return periods.map(period => {
      const periodExpenses = expenses.filter(expense => 
        expense.expenseDate >= period.startDate && expense.expenseDate <= period.endDate
      );

      const totalAmount = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const taxDeductibleAmount = periodExpenses
        .filter(expense => expense.isTaxDeductible)
        .reduce((sum, expense) => sum + expense.amount, 0);

      // Category breakdown
      const categoryBreakdown = this.calculateCategoryBreakdown(periodExpenses);

      // Calculate period-over-period change
      const previousPeriodIndex = periods.indexOf(period) - 1;
      let changeFromPrevious = 0;
      if (previousPeriodIndex >= 0) {
        const previousPeriodExpenses = expenses.filter(expense => 
          expense.expenseDate >= periods[previousPeriodIndex].startDate && 
          expense.expenseDate <= periods[previousPeriodIndex].endDate
        );
        const previousTotal = previousPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        changeFromPrevious = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0;
      }

      return {
        period: period.startDate.toISOString().slice(0, 7),
        startDate: period.startDate,
        endDate: period.endDate,
        totalAmount,
        expenseCount: periodExpenses.length,
        averageExpenseAmount: periodExpenses.length > 0 ? totalAmount / periodExpenses.length : 0,
        taxDeductibleAmount,
        taxDeductiblePercentage: totalAmount > 0 ? (taxDeductibleAmount / totalAmount) * 100 : 0,
        categoryBreakdown,
        changeFromPrevious,
        zambianSeason: this.baseAnalyticsService.getZambianSeason(period.startDate)
      };
    });
  }

  /**
   * Calculate category breakdown for expenses
   */
  private calculateCategoryBreakdown(expenses: any[]): Record<string, any> {
    const breakdown: Record<string, any> = {};

    expenses.forEach(expense => {
      const category = expense.categoryName || 'Uncategorized';
      
      if (!breakdown[category]) {
        breakdown[category] = {
          amount: 0,
          count: 0,
          taxDeductibleAmount: 0
        };
      }

      breakdown[category].amount += expense.amount;
      breakdown[category].count += 1;
      if (expense.isTaxDeductible) {
        breakdown[category].taxDeductibleAmount += expense.amount;
      }
    });

    // Calculate percentages
    const totalAmount = Object.values(breakdown).reduce((sum: number, cat: any) => sum + cat.amount, 0);
    Object.values(breakdown).forEach((cat: any) => {
      cat.percentage = totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0;
      cat.averageAmount = cat.count > 0 ? cat.amount / cat.count : 0;
    });

    return breakdown;
  }

  /**
   * Detect expense patterns across categories and time
   */
  private detectExpensePatterns(expenses: any[], trends: any[]): ExpensePattern[] {
    const patterns: ExpensePattern[] = [];

    // Group expenses by category
    const categoryGroups: Record<string, any[]> = {};
    expenses.forEach(expense => {
      const category = expense.categoryName || 'Uncategorized';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(expense);
    });

    // Analyze patterns for each category
    Object.entries(categoryGroups).forEach(([category, categoryExpenses]) => {
      if (categoryExpenses.length < 3) return; // Need minimum data for pattern detection

      const monthlyAmounts = this.getMonthlyAmounts(categoryExpenses);
      const pattern = this.analyzePattern(monthlyAmounts);
      const seasonality = this.detectSeasonality(categoryExpenses);

      patterns.push({
        category,
        pattern: pattern.direction,
        changeRate: pattern.changeRate,
        confidence: pattern.confidence,
        recommendations: this.generatePatternRecommendations(category, pattern, seasonality),
        seasonalityDetected: seasonality.detected
      });
    });

    return patterns;
  }

  /**
   * Get monthly expense amounts for a category
   */
  private getMonthlyAmounts(expenses: any[]): number[] {
    const monthlyAmounts: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const month = expense.expenseDate.toISOString().slice(0, 7);
      monthlyAmounts[month] = (monthlyAmounts[month] || 0) + expense.amount;
    });

    return Object.values(monthlyAmounts);
  }

  /**
   * Analyze expense pattern direction and strength
   */
  private analyzePattern(amounts: number[]): {
    direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
    changeRate: number;
    confidence: number;
  } {
    if (amounts.length < 2) {
      return { direction: 'STABLE', changeRate: 0, confidence: 0 };
    }

    // Calculate linear trend
    const trend = this.calculateLinearTrend(amounts);
    const volatility = this.calculateVolatility(amounts);

    // Determine pattern direction
    let direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
    if (volatility > 0.3) {
      direction = 'VOLATILE';
    } else if (trend > 0.1) {
      direction = 'INCREASING';
    } else if (trend < -0.1) {
      direction = 'DECREASING';
    } else {
      direction = 'STABLE';
    }

    return {
      direction,
      changeRate: trend * 100,
      confidence: Math.max(0, 1 - volatility)
    };
  }

  /**
   * Calculate linear trend for expense amounts
   */
  private calculateLinearTrend(amounts: number[]): number {
    const n = amounts.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = amounts.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * amounts[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    return avgY > 0 ? slope / avgY : 0; // Normalized slope
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private calculateVolatility(amounts: number[]): number {
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const stdDev = this.baseAnalyticsService.calculateStandardDeviation(amounts);
    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Detect seasonality in expense data
   */
  private detectSeasonality(expenses: any[]): { detected: boolean; strength: number } {
    // Group by Zambian seasons
    const seasonalGroups: Record<string, number[]> = {
      DRY_SEASON: [],
      RAINY_SEASON: [],
      TRANSITION: []
    };

    expenses.forEach(expense => {
      const season = this.baseAnalyticsService.getZambianSeason(expense.expenseDate);
      seasonalGroups[season].push(expense.amount);
    });

    // Calculate seasonal variance
    const seasonalAverages = Object.entries(seasonalGroups).map(([season, amounts]) => {
      return amounts.length > 0 ? amounts.reduce((sum, val) => sum + val, 0) / amounts.length : 0;
    });

    const overallAverage = seasonalAverages.reduce((sum, val) => sum + val, 0) / seasonalAverages.length;
    const seasonalVariance = seasonalAverages.reduce((sum, val) => 
      sum + Math.pow(val - overallAverage, 2), 0
    ) / seasonalAverages.length;

    const strength = overallAverage > 0 ? Math.sqrt(seasonalVariance) / overallAverage : 0;

    return {
      detected: strength > 0.2,
      strength
    };
  }

  /**
   * Detect anomalies by category using statistical methods
   */
  private detectAnomaliesByCategory(
    expenses: any[],
    sensitivityLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ): ExpenseAnomaly[] {
    const anomalies: ExpenseAnomaly[] = [];
    const thresholds = { LOW: 3, MEDIUM: 2.5, HIGH: 2 };
    const threshold = thresholds[sensitivityLevel];

    // Group by category
    const categoryGroups: Record<string, any[]> = {};
    expenses.forEach(expense => {
      const category = expense.categoryName || 'Uncategorized';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(expense);
    });

    // Detect anomalies in each category
    Object.entries(categoryGroups).forEach(([category, categoryExpenses]) => {
      if (categoryExpenses.length < 5) return; // Need minimum data for anomaly detection

      const amounts = categoryExpenses.map(e => e.amount);
      const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const stdDev = this.baseAnalyticsService.calculateStandardDeviation(amounts);

      categoryExpenses.forEach(expense => {
        const zScore = Math.abs((expense.amount - mean) / stdDev);
        
        if (zScore > threshold) {
          anomalies.push({
            expenseId: expense.id,
            description: expense.description,
            amount: expense.amount,
            expectedAmount: mean,
            variance: expense.amount - mean,
            anomalyScore: zScore,
            category,
            date: expense.expenseDate,
            reason: this.getAnomalyReason(zScore, threshold)
          });
        }
      });
    });

    // Sort by anomaly score (highest first)
    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  /**
   * Get human-readable anomaly reason
   */
  private getAnomalyReason(zScore: number, threshold: number): string {
    if (zScore > threshold * 1.5) {
      return 'Extreme outlier - amount significantly above normal pattern';
    } else if (zScore > threshold) {
      return 'Significant deviation from normal pattern';
    } else {
      return 'Minor deviation from expected range';
    }
  }

  /**
   * Generate pattern-based recommendations
   */
  private generatePatternRecommendations(
    category: string,
    pattern: any,
    seasonality: any
  ): string[] {
    const recommendations: string[] = [];

    switch (pattern.direction) {
      case 'INCREASING':
        recommendations.push(`${category} expenses are increasing by ${pattern.changeRate.toFixed(1)}% - review for cost control opportunities`);
        recommendations.push(`Consider negotiating better rates with ${category} suppliers`);
        break;
      case 'DECREASING':
        recommendations.push(`${category} expenses are decreasing - maintain current cost management strategies`);
        break;
      case 'VOLATILE':
        recommendations.push(`${category} expenses show high volatility - implement better budgeting and approval controls`);
        recommendations.push(`Consider setting spending limits for ${category}`);
        break;
      case 'STABLE':
        recommendations.push(`${category} expenses are stable - good cost control`);
        break;
    }

    if (seasonality.detected) {
      recommendations.push(`${category} shows seasonal patterns - plan budget accordingly`);
    }

    return recommendations;
  }

  /**
   * Generate expense summary statistics
   */
  private generateExpenseSummary(trends: any[], patterns: ExpensePattern[]): any {
    const totalExpenses = trends.reduce((sum, trend) => sum + trend.totalAmount, 0);
    const averageMonthlyExpenses = totalExpenses / trends.length;
    
    const increasingPatterns = patterns.filter(p => p.pattern === 'INCREASING').length;
    const volatilePatterns = patterns.filter(p => p.pattern === 'VOLATILE').length;
    
    const overallGrowthRate = trends.length > 1 
      ? this.baseAnalyticsService.calculatePercentageChange(
          trends[trends.length - 1].totalAmount,
          trends[0].totalAmount
        )
      : 0;

    return {
      totalExpenses,
      averageMonthlyExpenses,
      overallGrowthRate,
      increasingCategories: increasingPatterns,
      volatileCategories: volatilePatterns,
      totalCategories: patterns.length,
      averageTaxDeductiblePercentage: trends.reduce((sum, trend) => 
        sum + trend.taxDeductiblePercentage, 0) / trends.length
    };
  }

  /**
   * Generate actionable expense insights
   */
  private generateExpenseInsights(trends: any[], patterns: ExpensePattern[], summary: any): any[] {
    const insights: any[] = [];

    // Growth rate insights
    if (summary.overallGrowthRate > 20) {
      insights.push({
        type: 'WARNING',
        title: 'High expense growth detected',
        description: `Expenses have grown by ${summary.overallGrowthRate.toFixed(1)}% over the period`,
        recommendation: 'Implement cost control measures and review major expense categories',
        priority: 'HIGH'
      });
    } else if (summary.overallGrowthRate < -10) {
      insights.push({
        type: 'POSITIVE',
        title: 'Expense reduction achieved',
        description: `Expenses have decreased by ${Math.abs(summary.overallGrowthRate).toFixed(1)}% over the period`,
        recommendation: 'Continue current cost management strategies',
        priority: 'MEDIUM'
      });
    }

    // Volatile categories insight
    if (summary.volatileCategories > 0) {
      insights.push({
        type: 'WARNING',
        title: 'Volatile expense categories detected',
        description: `${summary.volatileCategories} categories show high volatility`,
        recommendation: 'Implement better budgeting and approval controls for volatile categories',
        priority: 'MEDIUM'
      });
    }

    // Tax deductible insight
    if (summary.averageTaxDeductiblePercentage < 60) {
      insights.push({
        type: 'OPPORTUNITY',
        title: 'Tax optimization opportunity',
        description: `Only ${summary.averageTaxDeductiblePercentage.toFixed(1)}% of expenses are tax-deductible`,
        recommendation: 'Review expense categorization and documentation for tax optimization',
        priority: 'MEDIUM'
      });
    }

    return insights;
  }

  /**
   * Generate optimization strategies
   */
  private generateOptimizationStrategies(trendAnalysis: any, anomalies: any): any[] {
    const strategies: any[] = [];

    // High-growth category strategies
    const highGrowthCategories = trendAnalysis.patterns
      .filter((p: ExpensePattern) => p.pattern === 'INCREASING' && p.changeRate > 15)
      .slice(0, 3);

    highGrowthCategories.forEach((pattern: ExpensePattern) => {
      strategies.push({
        type: 'COST_REDUCTION',
        category: pattern.category,
        title: `Optimize ${pattern.category} expenses`,
        description: `${pattern.category} expenses are increasing by ${pattern.changeRate.toFixed(1)}%`,
        potentialSaving: 0.1, // 10% potential saving
        priority: 'HIGH',
        actions: [
          'Review vendor contracts and negotiate better rates',
          'Implement approval workflows for this category',
          'Consider alternative suppliers or solutions'
        ]
      });
    });

    // Anomaly-based strategies
    if (anomalies.anomalies.length > 5) {
      strategies.push({
        type: 'PROCESS_IMPROVEMENT',
        category: 'General',
        title: 'Implement expense controls',
        description: `${anomalies.anomalies.length} expense anomalies detected`,
        potentialSaving: 0.05, // 5% potential saving
        priority: 'MEDIUM',
        actions: [
          'Set up automated expense approval workflows',
          'Implement spending limits by category',
          'Regular expense audits and reviews'
        ]
      });
    }

    return strategies;
  }

  /**
   * Calculate potential savings from optimization strategies
   */
  private calculatePotentialSavings(strategies: any[]): number {
    return strategies.reduce((total, strategy) => {
      // This would be calculated based on actual expense amounts
      // For now, return a placeholder calculation
      return total + (strategy.potentialSaving * 10000); // Simplified calculation
    }, 0);
  }

  /**
   * Generate optimization summary
   */
  private generateOptimizationSummary(strategies: any[], potentialSavings: number): any {
    return {
      totalStrategies: strategies.length,
      highPriorityStrategies: strategies.filter(s => s.priority === 'HIGH').length,
      potentialSavings,
      estimatedImplementationTime: strategies.length * 2, // 2 weeks per strategy
      riskLevel: strategies.length > 5 ? 'HIGH' : strategies.length > 2 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Generate anomaly-based recommendations
   */
  private generateAnomalyRecommendations(anomalies: ExpenseAnomaly[], summary: any): string[] {
    const recommendations: string[] = [];

    if (anomalies.length > 10) {
      recommendations.push('Implement automated expense approval workflows to prevent anomalies');
    }

    if (anomalies.length > 5) {
      recommendations.push('Set up spending limits by category to control unusual expenses');
      recommendations.push('Regular expense audits and reviews');
    }

    if (summary.highSeverityCount > 0) {
      recommendations.push('Investigate high-severity anomalies immediately');
    }

    if (recommendations.length === 0) {
      recommendations.push('Expense patterns are within normal ranges - maintain current controls');
    }

    return recommendations;
  }

  /**
   * Generate anomaly summary
   */
  private generateAnomalySummary(anomalies: ExpenseAnomaly[]): any {
    const totalAnomalyAmount = anomalies.reduce((sum, anomaly) => 
      sum + Math.abs(anomaly.variance), 0
    );

    const highSeverityCount = anomalies.filter(a => a.anomalyScore > 3).length;
    const mediumSeverityCount = anomalies.filter(a => 
      a.anomalyScore > 2 && a.anomalyScore <= 3
    ).length;

    const categoryBreakdown: Record<string, number> = {};
    anomalies.forEach(anomaly => {
      categoryBreakdown[anomaly.category] = (categoryBreakdown[anomaly.category] || 0) + 1;
    });

    return {
      totalAnomalies: anomalies.length,
      totalAnomalyAmount,
      highSeverityCount,
      mediumSeverityCount,
      categoryBreakdown,
      mostAffectedCategory: Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    };
  }
}
