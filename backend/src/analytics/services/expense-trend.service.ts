import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimeSeriesDataPoint, TrendAnalysis } from '../analytics.repository';

export interface ExpenseTrendAnalysis {
  overall: TrendAnalysis;
  byCategory: Array<{
    category: string;
    trend: TrendAnalysis;
    totalAmount: number;
    percentageOfTotal: number;
    monthlyAverage: number;
  }>;
  insights: {
    fastestGrowingCategory: string;
    largestCategory: string;
    volatileCategories: string[];
    seasonalCategories: string[];
    recommendations: string[];
  };
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
}

export interface ExpenseAnomalyDetection {
  anomalies: Array<{
    date: Date;
    category: string;
    amount: number;
    expectedAmount: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  patterns: {
    unusualSpikes: number;
    unusualDips: number;
    newCategories: string[];
    dormantCategories: string[];
  };
  alerts: Array<{
    type:
      | 'budget_exceeded'
      | 'unusual_pattern'
      | 'new_category'
      | 'dormant_category';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    actionRequired: boolean;
  }>;
}

@Injectable()
export class ExpenseTrendService {
  private readonly logger = new Logger(ExpenseTrendService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze expense trends for an organization
   */
  async analyzeExpenseTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseTrendAnalysis> {
    try {
      this.logger.log(
        `Analyzing expense trends for organization: ${organizationId}`
      );

      // Get overall expense data
      const overallData = await this.getOverallExpenseData(
        organizationId,
        startDate,
        endDate
      );
      const overall = this.analyzeTrend(overallData);

      // Get expense data by category
      const categoryData = await this.getExpenseDataByCategory(
        organizationId,
        startDate,
        endDate
      );
      const byCategory = await Promise.all(
        categoryData.map(async category => {
          const categoryTimeSeries = await this.getCategoryTimeSeries(
            organizationId,
            category.category,
            startDate,
            endDate
          );
          const trend = this.analyzeTrend(categoryTimeSeries);

          return {
            category: category.category,
            trend,
            totalAmount: category.totalAmount,
            percentageOfTotal: category.percentageOfTotal,
            monthlyAverage:
              category.totalAmount /
              this.getMonthsDifference(startDate, endDate),
          };
        })
      );

      // Generate insights
      const insights = this.generateInsights(byCategory, overall);

      // Generate forecast
      const forecast = this.generateExpenseForecast(overallData, overall);

      this.logger.log(
        `Expense trend analysis completed for organization: ${organizationId}`
      );

      return {
        overall,
        byCategory,
        insights,
        forecast,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze expense trends: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Detect expense anomalies
   */
  async detectExpenseAnomalies(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseAnomalyDetection> {
    try {
      this.logger.log(
        `Detecting expense anomalies for organization: ${organizationId}`
      );

      const anomalies: ExpenseAnomalyDetection['anomalies'] = [];
      const alerts: ExpenseAnomalyDetection['alerts'] = [];

      // Get expense data by category and month
      const monthlyExpenses = await this.getMonthlyExpensesByCategory(
        organizationId,
        startDate,
        endDate
      );

      // Detect anomalies for each category
      for (const [category, data] of monthlyExpenses.entries()) {
        const categoryAnomalies = this.detectCategoryAnomalies(category, data);
        anomalies.push(...categoryAnomalies);
      }

      // Detect patterns
      const patterns = this.detectExpensePatterns(monthlyExpenses);

      // Generate alerts based on anomalies and patterns
      alerts.push(...this.generateAnomalyAlerts(anomalies, patterns));

      this.logger.log(`Detected ${anomalies.length} expense anomalies`);

      return {
        anomalies,
        patterns,
        alerts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to detect expense anomalies: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get overall expense time series data
   */
  private async getOverallExpenseData(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesDataPoint[]> {
    const expenseData = await this.prisma.expense.groupBy({
      by: ['expenseDate'],
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by month
    const monthlyData = new Map<string, number>();

    expenseData.forEach(item => {
      const monthKey = this.getMonthKey(item.expenseDate);
      const existing = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, existing + (item._sum.amount?.toNumber() || 0));
    });

    return Array.from(monthlyData.entries()).map(([period, value]) => ({
      period,
      value,
      date: new Date(`${period  }-01`),
    }));
  }

  /**
   * Get expense data grouped by category
   */
  private async getExpenseDataByCategory(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{ category: string; totalAmount: number; percentageOfTotal: number }>
  > {
    const categoryData = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalAmount = categoryData.reduce(
      (sum, item) => sum + (item._sum.amount?.toNumber() || 0),
      0
    );

    return categoryData.map(item => ({
      category: item.category,
      totalAmount: item._sum.amount?.toNumber() || 0,
      percentageOfTotal:
        totalAmount > 0
          ? ((item._sum.amount?.toNumber() || 0) / totalAmount) * 100
          : 0,
    }));
  }

  /**
   * Get time series data for a specific category
   */
  private async getCategoryTimeSeries(
    organizationId: string,
    category: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesDataPoint[]> {
    const expenseData = await this.prisma.expense.groupBy({
      by: ['expenseDate'],
      where: {
        organizationId,
        category,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by month
    const monthlyData = new Map<string, number>();

    expenseData.forEach(item => {
      const monthKey = this.getMonthKey(item.expenseDate);
      const existing = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, existing + (item._sum.amount?.toNumber() || 0));
    });

    return Array.from(monthlyData.entries()).map(([period, value]) => ({
      period,
      value,
      date: new Date(`${period  }-01`),
    }));
  }

  /**
   * Analyze trend in time series data
   */
  private analyzeTrend(data: TimeSeriesDataPoint[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        trend: 'stable',
        strength: 0,
        seasonality: { detected: false },
        anomalies: [],
      };
    }

    // Calculate linear trend
    const { slope, r2 } = this.calculateLinearRegression(data);

    // Determine trend direction and strength
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.1) {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Detect seasonality
    const seasonality = this.detectSeasonality(data);

    // Detect anomalies
    const anomalies = this.detectAnomalies(data);

    return {
      trend,
      strength: Math.min(Math.abs(slope) / 1000, 1),
      seasonality,
      anomalies,
    };
  }

  /**
   * Generate insights from trend analysis
   */
  private generateInsights(
    byCategory: ExpenseTrendAnalysis['byCategory'],
    overall: TrendAnalysis
  ): ExpenseTrendAnalysis['insights'] {
    // Find fastest growing category
    const fastestGrowingCategory = byCategory.reduce((max, current) =>
      current.trend.strength > max.trend.strength &&
      current.trend.trend === 'increasing'
        ? current
        : max
    ).category;

    // Find largest category
    const largestCategory = byCategory.reduce((max, current) =>
      current.totalAmount > max.totalAmount ? current : max
    ).category;

    // Find volatile categories (high anomaly count)
    const volatileCategories = byCategory
      .filter(cat => cat.trend.anomalies.length > 1)
      .map(cat => cat.category);

    // Find seasonal categories
    const seasonalCategories = byCategory
      .filter(cat => cat.trend.seasonality.detected)
      .map(cat => cat.category);

    // Generate recommendations
    const recommendations: string[] = [];

    if (overall.trend === 'increasing' && overall.strength > 0.5) {
      recommendations.push(
        'Expense growth is accelerating - review budget allocations'
      );
    }

    if (volatileCategories.length > 0) {
      recommendations.push(
        `Monitor volatile categories: ${volatileCategories.join(', ')}`
      );
    }

    if (seasonalCategories.length > 0) {
      recommendations.push('Plan for seasonal expense variations in budget');
    }

    if (overall.anomalies.length > 2) {
      recommendations.push(
        'Implement expense approval controls to reduce volatility'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Expense patterns are stable - maintain current controls'
      );
    }

    return {
      fastestGrowingCategory,
      largestCategory,
      volatileCategories,
      seasonalCategories,
      recommendations,
    };
  }

  /**
   * Generate expense forecast
   */
  private generateExpenseForecast(
    data: TimeSeriesDataPoint[],
    trend: TrendAnalysis
  ): ExpenseTrendAnalysis['forecast'] {
    if (data.length === 0) {
      return { nextMonth: 0, nextQuarter: 0, confidence: 0 };
    }

    const lastValue = data[data.length - 1].value;
    const { slope } = this.calculateLinearRegression(data);

    // Simple linear projection
    const nextMonth = Math.max(0, lastValue + slope);
    const nextQuarter = Math.max(0, lastValue + slope * 3);

    // Calculate confidence based on trend strength and anomalies
    let confidence = 0.8;
    if (trend.strength > 0.7) confidence -= 0.2;
    if (trend.anomalies.length > 2) confidence -= 0.3;
    confidence = Math.max(0.3, confidence);

    return {
      nextMonth,
      nextQuarter,
      confidence,
    };
  }

  /**
   * Get monthly expenses by category
   */
  private async getMonthlyExpensesByCategory(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, TimeSeriesDataPoint[]>> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        organizationId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
      },
      select: {
        category: true,
        amount: true,
        expenseDate: true,
      },
    });

    const categoryMap = new Map<string, Map<string, number>>();

    expenses.forEach(expense => {
      const category = expense.category;
      const monthKey = this.getMonthKey(expense.expenseDate);
      const amount = expense.amount.toNumber();

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const monthlyData = categoryMap.get(category)!;
      const existing = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, existing + amount);
    });

    // Convert to TimeSeriesDataPoint format
    const result = new Map<string, TimeSeriesDataPoint[]>();

    categoryMap.forEach((monthlyData, category) => {
      const timeSeries = Array.from(monthlyData.entries()).map(
        ([period, value]) => ({
          period,
          value,
          date: new Date(`${period  }-01`),
        })
      );
      result.set(category, timeSeries);
    });

    return result;
  }

  /**
   * Detect anomalies for a specific category
   */
  private detectCategoryAnomalies(
    category: string,
    data: TimeSeriesDataPoint[]
  ): ExpenseAnomalyDetection['anomalies'] {
    if (data.length < 3) return [];

    const anomalies: ExpenseAnomalyDetection['anomalies'] = [];
    const mean =
      data.reduce((sum, point) => sum + point.value, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) /
        data.length
    );

    data.forEach(point => {
      const zScore = Math.abs(point.value - mean) / stdDev;

      if (zScore > 2) {
        const deviation = ((point.value - mean) / mean) * 100;
        anomalies.push({
          date: point.date,
          category,
          amount: point.value,
          expectedAmount: mean,
          deviation,
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          description: `${category} expense ${deviation > 0 ? 'spike' : 'dip'} of ${Math.abs(deviation).toFixed(1)}%`,
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect expense patterns
   */
  private detectExpensePatterns(
    monthlyExpenses: Map<string, TimeSeriesDataPoint[]>
  ): ExpenseAnomalyDetection['patterns'] {
    let unusualSpikes = 0;
    let unusualDips = 0;
    const newCategories: string[] = [];
    const dormantCategories: string[] = [];

    monthlyExpenses.forEach((data, category) => {
      if (data.length === 0) return;

      // Check for spikes and dips
      const mean =
        data.reduce((sum, point) => sum + point.value, 0) / data.length;
      data.forEach(point => {
        const deviation = (point.value - mean) / mean;
        if (deviation > 0.5) unusualSpikes++;
        if (deviation < -0.5) unusualDips++;
      });

      // Check for new categories (only recent data)
      const recentData = data.filter(point => {
        const monthsAgo =
          (new Date().getTime() - point.date.getTime()) /
          (1000 * 60 * 60 * 24 * 30);
        return monthsAgo <= 3;
      });

      if (recentData.length > 0 && data.length <= 3) {
        newCategories.push(category);
      }

      // Check for dormant categories (no recent activity)
      if (recentData.length === 0 && data.length > 0) {
        dormantCategories.push(category);
      }
    });

    return {
      unusualSpikes,
      unusualDips,
      newCategories,
      dormantCategories,
    };
  }

  /**
   * Generate alerts based on anomalies and patterns
   */
  private generateAnomalyAlerts(
    anomalies: ExpenseAnomalyDetection['anomalies'],
    patterns: ExpenseAnomalyDetection['patterns']
  ): ExpenseAnomalyDetection['alerts'] {
    const alerts: ExpenseAnomalyDetection['alerts'] = [];

    // High severity anomaly alerts
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highSeverityAnomalies.length > 0) {
      alerts.push({
        type: 'unusual_pattern',
        message: `${highSeverityAnomalies.length} high-severity expense anomalies detected`,
        severity: 'critical',
        actionRequired: true,
      });
    }

    // New category alerts
    if (patterns.newCategories.length > 0) {
      alerts.push({
        type: 'new_category',
        message: `New expense categories detected: ${patterns.newCategories.join(', ')}`,
        severity: 'info',
        actionRequired: false,
      });
    }

    // Dormant category alerts
    if (patterns.dormantCategories.length > 0) {
      alerts.push({
        type: 'dormant_category',
        message: `Dormant expense categories: ${patterns.dormantCategories.join(', ')}`,
        severity: 'info',
        actionRequired: false,
      });
    }

    // Unusual spike pattern
    if (patterns.unusualSpikes > 3) {
      alerts.push({
        type: 'unusual_pattern',
        message: 'Multiple expense spikes detected - review budget controls',
        severity: 'warning',
        actionRequired: true,
      });
    }

    return alerts;
  }

  /**
   * Helper methods
   */
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    return Math.max(1, months);
  }

  private calculateLinearRegression(data: TimeSeriesDataPoint[]): {
    slope: number;
    intercept: number;
    r2: number;
  } {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = data.reduce(
      (sum, point) => sum + Math.pow(point.value - meanY, 2),
      0
    );
    const ssResidual = data.reduce((sum, point, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(point.value - predicted, 2);
    }, 0);
    const r2 = 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }

  private detectSeasonality(
    data: TimeSeriesDataPoint[]
  ): TrendAnalysis['seasonality'] {
    if (data.length < 12) {
      return { detected: false };
    }

    // Simple seasonality detection
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    data.forEach(point => {
      const month = point.date.getMonth();
      monthlyAverages[month] += point.value;
      monthlyCounts[month]++;
    });

    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }

    const mean = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    const variance =
      monthlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      12;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    const detected = coefficientOfVariation > 0.2;

    return {
      detected,
      pattern: detected ? 'monthly' : undefined,
      strength: detected ? Math.min(coefficientOfVariation, 1) : undefined,
    };
  }

  private detectAnomalies(
    data: TimeSeriesDataPoint[]
  ): TrendAnalysis['anomalies'] {
    if (data.length < 3) return [];

    const anomalies: TrendAnalysis['anomalies'] = [];
    const mean =
      data.reduce((sum, point) => sum + point.value, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) /
        data.length
    );

    data.forEach(point => {
      const zScore = Math.abs(point.value - mean) / stdDev;

      if (zScore > 2.5) {
        anomalies.push({
          period: point.period,
          value: point.value,
          expectedValue: mean,
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          date: point.date,
        });
      }
    });

    return anomalies;
  }
}
