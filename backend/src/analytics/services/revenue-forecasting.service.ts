import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseAnalyticsService } from './base-analytics.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { TimeSeriesDataPoint, ForecastDataPoint, TrendAnalysis } from '../analytics.repository';
import {
  ForecastResult as NewForecastResult,
  DateRange,
  AnalyticsDataSource
} from '../interfaces/analytics-data.interface';

export interface ForecastingOptions {
  periods: number; // Number of periods to forecast
  confidence: number; // Confidence level (0.8, 0.9, 0.95)
  method: 'linear' | 'exponential' | 'seasonal';
  includeSeasonality: boolean;
}

export interface ForecastResult {
  historical: TimeSeriesDataPoint[];
  forecast: ForecastDataPoint[];
  trendAnalysis: TrendAnalysis;
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    r2: number; // R-squared
  };
  insights: {
    expectedGrowth: number;
    seasonalPeaks: string[];
    riskFactors: string[];
    recommendations: string[];
  };
}

@Injectable()
export class RevenueForecastingService {
  private readonly logger = new Logger(RevenueForecastingService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly baseAnalyticsService: BaseAnalyticsService,
    private readonly aggregationService: AnalyticsAggregationService
  ) {}

  /**
   * Generate enhanced revenue forecast using new analytics infrastructure
   */
  async generateEnhancedRevenueForecast(
    organizationId: string,
    dateRange: DateRange,
    forecastPeriods: number = 6,
    modelType?: 'LINEAR' | 'SEASONAL' | 'EXPONENTIAL'
  ): Promise<NewForecastResult[]> {
    try {
      this.logger.log(`Generating enhanced revenue forecast for organization ${organizationId}`);

      // Get aggregated financial data using new infrastructure
      const financialData = await this.aggregationService.aggregateFinancialData(
        organizationId,
        dateRange
      );

      // Convert to time series data
      const timeSeriesData = this.convertInvoicesToTimeSeries(financialData.invoices);

      // Validate data sufficiency
      this.validateTimeSeriesData(timeSeriesData);

      // Get or create forecasting model
      const model = await this.getOrCreateForecastingModel(
        organizationId,
        timeSeriesData,
        modelType
      );

      // Generate forecast
      const forecast = this.generateForecastByModel(model, timeSeriesData, forecastPeriods);

      // Apply Zambian business context
      const enhancedForecast = this.applyZambianBusinessContext(forecast, dateRange);

      this.logger.log(`Generated ${enhancedForecast.length} period enhanced forecast`);
      return enhancedForecast;

    } catch (error) {
      this.logger.error(`Failed to generate enhanced revenue forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate revenue forecast for an organization (legacy method)
   */
  async generateRevenueForecast(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    options: ForecastingOptions = {
      periods: 6,
      confidence: 0.9,
      method: 'seasonal',
      includeSeasonality: true,
    },
  ): Promise<ForecastResult> {
    try {
      this.logger.log(`Generating revenue forecast for organization: ${organizationId}`);

      // Get historical revenue data
      const historical = await this.getHistoricalRevenueData(organizationId, startDate, endDate);

      if (historical.length < 3) {
        throw new Error('Insufficient historical data for forecasting (minimum 3 periods required)');
      }

      // Perform trend analysis
      const trendAnalysis = this.analyzeTrend(historical);

      // Generate forecast based on selected method
      const forecast = await this.generateForecastData(historical, options, trendAnalysis);

      // Calculate accuracy metrics using cross-validation
      const accuracy = this.calculateAccuracy(historical, options);

      // Generate insights and recommendations
      const insights = this.generateInsights(historical, forecast, trendAnalysis);

      this.logger.log(`Revenue forecast generated successfully: ${forecast.length} periods`);

      return {
        historical,
        forecast,
        trendAnalysis,
        accuracy,
        insights,
      };
    } catch (error) {
      this.logger.error(`Failed to generate revenue forecast: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get historical revenue data from database
   */
  private async getHistoricalRevenueData(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSeriesDataPoint[]> {
    const revenueData = await this.prisma.invoice.groupBy({
      by: ['issueDate'],
      where: {
        organizationId,
        issueDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
      },
      _sum: { paidAmount: true },
      orderBy: { issueDate: 'asc' },
    });

    // Group by month for better forecasting
    const monthlyData = new Map<string, number>();

    revenueData.forEach(item => {
      const monthKey = this.getMonthKey(item.issueDate);
      const existing = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, existing + (item._sum.paidAmount?.toNumber() || 0));
    });

    return Array.from(monthlyData.entries()).map(([period, value]) => ({
      period,
      value,
      date: new Date(period + '-01'),
    }));
  }

  /**
   * Analyze trend in historical data
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

    // Detect seasonality (simplified approach)
    const seasonality = this.detectSeasonality(data);

    // Detect anomalies
    const anomalies = this.detectAnomalies(data);

    return {
      trend,
      strength: Math.min(Math.abs(slope) / 1000, 1), // Normalize strength
      seasonality,
      anomalies,
    };
  }

  /**
   * Generate forecast data points
   */
  private async generateForecastData(
    historical: TimeSeriesDataPoint[],
    options: ForecastingOptions,
    trendAnalysis: TrendAnalysis,
  ): Promise<ForecastDataPoint[]> {
    const forecast: ForecastDataPoint[] = [];
    const lastDataPoint = historical[historical.length - 1];
    const lastDate = new Date(lastDataPoint.date);

    for (let i = 1; i <= options.periods; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      let predicted: number;

      switch (options.method) {
        case 'linear':
          predicted = this.linearForecast(historical, i);
          break;
        case 'exponential':
          predicted = this.exponentialForecast(historical, i);
          break;
        case 'seasonal':
        default:
          predicted = this.seasonalForecast(historical, i, trendAnalysis);
          break;
      }

      // Apply seasonality adjustment if enabled
      if (options.includeSeasonality && trendAnalysis.seasonality.detected) {
        predicted = this.applySeasonalityAdjustment(predicted, forecastDate, trendAnalysis);
      }

      // Calculate confidence intervals
      const variance = this.calculateVariance(historical);
      const confidenceMultiplier = this.getConfidenceMultiplier(options.confidence);
      const margin = Math.sqrt(variance) * confidenceMultiplier;

      forecast.push({
        period: this.getMonthKey(forecastDate),
        predicted: Math.max(0, predicted), // Ensure non-negative
        confidence: {
          lower: Math.max(0, predicted - margin),
          upper: predicted + margin,
        },
        date: forecastDate,
      });
    }

    return forecast;
  }

  /**
   * Linear forecasting method
   */
  private linearForecast(data: TimeSeriesDataPoint[], periodsAhead: number): number {
    const { slope, intercept } = this.calculateLinearRegression(data);
    const nextPeriod = data.length + periodsAhead;
    return intercept + slope * nextPeriod;
  }

  /**
   * Exponential smoothing forecasting method
   */
  private exponentialForecast(data: TimeSeriesDataPoint[], periodsAhead: number): number {
    const alpha = 0.3; // Smoothing parameter
    let smoothed = data[0].value;

    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].value + (1 - alpha) * smoothed;
    }

    // Simple exponential forecast (can be enhanced with trend and seasonality)
    return smoothed;
  }

  /**
   * Seasonal forecasting method
   */
  private seasonalForecast(
    data: TimeSeriesDataPoint[],
    periodsAhead: number,
    trendAnalysis: TrendAnalysis,
  ): number {
    // Use linear trend as base
    const baseForecast = this.linearForecast(data, periodsAhead);

    // Apply seasonal adjustment if detected
    if (trendAnalysis.seasonality.detected) {
      const seasonalIndex = this.getSeasonalIndex(data, periodsAhead);
      return baseForecast * seasonalIndex;
    }

    return baseForecast;
  }

  /**
   * Calculate linear regression for trend analysis
   */
  private calculateLinearRegression(data: TimeSeriesDataPoint[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    const sumYY = data.reduce((sum, point) => sum + point.value * point.value, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.value - meanY, 2), 0);
    const ssResidual = data.reduce((sum, point, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(point.value - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  /**
   * Detect seasonality in data
   */
  private detectSeasonality(data: TimeSeriesDataPoint[]): TrendAnalysis['seasonality'] {
    if (data.length < 12) {
      return { detected: false };
    }

    // Simple seasonality detection based on month-over-month patterns
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    data.forEach(point => {
      const month = point.date.getMonth();
      monthlyAverages[month] += point.value;
      monthlyCounts[month]++;
    });

    // Calculate average for each month
    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }

    // Calculate coefficient of variation to detect seasonality
    const mean = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 12;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    const detected = coefficientOfVariation > 0.2; // Threshold for seasonality detection

    return {
      detected,
      pattern: detected ? 'monthly' : undefined,
      strength: detected ? Math.min(coefficientOfVariation, 1) : undefined,
    };
  }

  /**
   * Detect anomalies in data
   */
  private detectAnomalies(data: TimeSeriesDataPoint[]): TrendAnalysis['anomalies'] {
    if (data.length < 3) return [];

    const anomalies: TrendAnalysis['anomalies'] = [];
    const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) / data.length
    );

    data.forEach(point => {
      const zScore = Math.abs(point.value - mean) / stdDev;

      if (zScore > 2.5) { // Threshold for anomaly detection
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

  /**
   * Helper methods
   */
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private calculateVariance(data: TimeSeriesDataPoint[]): number {
    const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length;
    return data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) / data.length;
  }

  private getConfidenceMultiplier(confidence: number): number {
    const multipliers: Record<number, number> = {
      0.8: 1.28,
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return multipliers[confidence] || 1.645;
  }

  private applySeasonalityAdjustment(
    predicted: number,
    date: Date,
    trendAnalysis: TrendAnalysis,
  ): number {
    // Simple seasonal adjustment based on month
    const month = date.getMonth();
    const seasonalFactors = [0.9, 0.85, 0.95, 1.0, 1.1, 1.15, 1.2, 1.1, 1.05, 1.0, 0.95, 1.1];
    return predicted * seasonalFactors[month];
  }

  private getSeasonalIndex(data: TimeSeriesDataPoint[], periodsAhead: number): number {
    // Simplified seasonal index calculation
    const targetMonth = (new Date().getMonth() + periodsAhead) % 12;
    const seasonalFactors = [0.9, 0.85, 0.95, 1.0, 1.1, 1.15, 1.2, 1.1, 1.05, 1.0, 0.95, 1.1];
    return seasonalFactors[targetMonth];
  }

  private calculateAccuracy(data: TimeSeriesDataPoint[], options: ForecastingOptions): ForecastResult['accuracy'] {
    // Simplified accuracy calculation using last few periods
    if (data.length < 6) {
      return { mape: 0, rmse: 0, r2: 0 };
    }

    const testSize = Math.min(3, Math.floor(data.length * 0.2));
    const trainData = data.slice(0, -testSize);
    const testData = data.slice(-testSize);

    let totalError = 0;
    let totalSquaredError = 0;
    let totalPercentageError = 0;

    testData.forEach((actual, i) => {
      const predicted = this.linearForecast(trainData, i + 1);
      const error = actual.value - predicted;
      const percentageError = Math.abs(error / actual.value) * 100;

      totalError += Math.abs(error);
      totalSquaredError += error * error;
      totalPercentageError += percentageError;
    });

    const mape = totalPercentageError / testSize;
    const rmse = Math.sqrt(totalSquaredError / testSize);
    const { r2 } = this.calculateLinearRegression(data);

    return { mape, rmse, r2 };
  }

  private generateInsights(
    historical: TimeSeriesDataPoint[],
    forecast: ForecastDataPoint[],
    trendAnalysis: TrendAnalysis,
  ): ForecastResult['insights'] {
    const lastValue = historical[historical.length - 1].value;
    const avgForecast = forecast.reduce((sum, point) => sum + point.predicted, 0) / forecast.length;
    const expectedGrowth = ((avgForecast - lastValue) / lastValue) * 100;

    const seasonalPeaks: string[] = [];
    if (trendAnalysis.seasonality.detected) {
      // Identify peak months (simplified)
      seasonalPeaks.push('December', 'June'); // Common peak months for Zambian businesses
    }

    const riskFactors: string[] = [];
    if (trendAnalysis.trend === 'decreasing') {
      riskFactors.push('Declining revenue trend detected');
    }
    if (trendAnalysis.anomalies.length > 0) {
      riskFactors.push('Revenue volatility detected');
    }

    const recommendations: string[] = [];
    if (expectedGrowth < 0) {
      recommendations.push('Consider implementing revenue growth strategies');
    }
    if (trendAnalysis.seasonality.detected) {
      recommendations.push('Plan for seasonal variations in cash flow');
    }
    if (riskFactors.length === 0) {
      recommendations.push('Revenue forecast looks stable - maintain current strategies');
    }

    return {
      expectedGrowth,
      seasonalPeaks,
      riskFactors,
      recommendations,
    };
  }

  // ============================================================================
  // ENHANCED FORECASTING METHODS FOR NEW ANALYTICS INFRASTRUCTURE
  // ============================================================================

  /**
   * Convert invoice data to time series format for enhanced analytics
   */
  private convertInvoicesToTimeSeries(invoices: any[]): any[] {
    const monthlyRevenue: Record<string, number> = {};

    invoices.forEach(invoice => {
      const month = invoice.issueDate.toISOString().slice(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + invoice.totalAmount;
    });

    return Object.entries(monthlyRevenue)
      .map(([period, value]) => ({
        date: new Date(period + '-01'),
        value,
        period
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Validate time series data for enhanced forecasting
   */
  private validateTimeSeriesData(data: any[]): void {
    if (data.length < 3) {
      throw new Error('Insufficient historical data for forecasting. Minimum 3 months required.');
    }

    const zeroValues = data.filter(d => d.value === 0).length;
    if (zeroValues > data.length * 0.5) {
      throw new Error('Too many zero revenue periods. Data quality insufficient for reliable forecasting.');
    }

    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.baseAnalyticsService.calculateStandardDeviation(values);

    const outliers = values.filter(val => Math.abs(val - mean) > 3 * stdDev);
    if (outliers.length > data.length * 0.2) {
      this.logger.warn('High number of outliers detected in revenue data');
    }
  }

  /**
   * Get or create forecasting model for enhanced analytics
   */
  private async getOrCreateForecastingModel(
    organizationId: string,
    timeSeriesData: any[],
    preferredModelType?: string
  ): Promise<any> {
    try {
      // Try to get existing active model
      const existingModel = await this.databaseService.forecastingModel.findFirst({
        where: {
          organizationId,
          isActive: true,
          modelType: preferredModelType || undefined
        },
        orderBy: {
          lastTrainedAt: 'desc'
        }
      });

      // Check if existing model is still valid (trained within last 30 days)
      if (existingModel && this.isModelValid(existingModel)) {
        return this.convertToForecastModel(existingModel);
      }

      // Create new model
      const modelType = preferredModelType || this.selectBestModelType(timeSeriesData);
      const modelParameters = this.trainEnhancedModel(timeSeriesData, modelType);

      // Save model to database
      const savedModel = await this.databaseService.forecastingModel.create({
        data: {
          organizationId,
          modelType,
          modelParameters: modelParameters as any,
          isActive: true,
          lastTrainedAt: new Date()
        }
      });

      return this.convertToForecastModel(savedModel);

    } catch (error) {
      this.logger.error(`Failed to get/create forecasting model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Select best model type based on data characteristics
   */
  private selectBestModelType(data: any[]): string {
    const values = data.map(d => d.value);
    const trend = this.calculateTrendStrength(values);
    const seasonality = this.detectSeasonalityStrength(data);

    if (seasonality > 0.3) {
      return 'SEASONAL';
    } else if (Math.abs(trend) > 0.1) {
      return 'LINEAR';
    } else {
      return 'EXPONENTIAL';
    }
  }

  /**
   * Train enhanced model with Zambian business context
   */
  private trainEnhancedModel(data: any[], modelType: string): Record<string, any> {
    const values = data.map(d => d.value);

    switch (modelType) {
      case 'LINEAR':
        return this.trainEnhancedLinearModel(values);
      case 'SEASONAL':
        return this.trainEnhancedSeasonalModel(data);
      case 'EXPONENTIAL':
        return this.trainEnhancedExponentialModel(values);
      default:
        return this.trainEnhancedLinearModel(values);
    }
  }

  /**
   * Enhanced linear model with Zambian context
   */
  private trainEnhancedLinearModel(values: number[]): Record<string, any> {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);

    // Calculate linear regression parameters
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = values.reduce((sum, val, i) => {
      const predicted = intercept + slope * (i + 1);
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    return {
      type: 'LINEAR',
      slope,
      intercept,
      rSquared,
      zambianContext: true,
      trainedAt: new Date().toISOString()
    };
  }

  /**
   * Enhanced seasonal model with Zambian business cycles
   */
  private trainEnhancedSeasonalModel(data: any[]): Record<string, any> {
    const values = data.map(d => d.value);
    const seasonalPeriod = 12; // Monthly data, annual seasonality

    // Enhanced seasonal decomposition with Zambian context
    const trend = this.baseAnalyticsService.calculateMovingAverage(values, Math.min(seasonalPeriod, values.length));
    const detrended = values.map((val, i) => val - (trend[i] || trend[trend.length - 1]));

    // Calculate seasonal components with Zambian business patterns
    const seasonal = this.calculateZambianSeasonalComponents(data, seasonalPeriod);

    return {
      type: 'SEASONAL',
      trend: trend,
      seasonal: seasonal,
      seasonalPeriod,
      zambianContext: true,
      trainedAt: new Date().toISOString()
    };
  }

  /**
   * Enhanced exponential model
   */
  private trainEnhancedExponentialModel(values: number[]): Record<string, any> {
    const alpha = 0.3; // Smoothing parameter
    let smoothed = [values[0]];

    for (let i = 1; i < values.length; i++) {
      smoothed[i] = alpha * values[i] + (1 - alpha) * smoothed[i - 1];
    }

    const mae = values.reduce((sum, val, i) => {
      return sum + Math.abs(val - smoothed[i]);
    }, 0) / values.length;

    return {
      type: 'EXPONENTIAL',
      alpha,
      lastSmoothed: smoothed[smoothed.length - 1],
      mae,
      zambianContext: true,
      trainedAt: new Date().toISOString()
    };
  }

  /**
   * Generate forecast using enhanced model
   */
  private generateForecastByModel(
    model: any,
    historicalData: any[],
    periods: number
  ): NewForecastResult[] {
    switch (model.type) {
      case 'LINEAR':
        return this.generateEnhancedLinearForecast(model, historicalData, periods);
      case 'SEASONAL':
        return this.generateEnhancedSeasonalForecast(model, historicalData, periods);
      case 'EXPONENTIAL':
        return this.generateEnhancedExponentialForecast(model, historicalData, periods);
      default:
        return this.generateEnhancedLinearForecast(model, historicalData, periods);
    }
  }

  /**
   * Generate enhanced linear forecast
   */
  private generateEnhancedLinearForecast(
    model: any,
    historicalData: any[],
    periods: number
  ): NewForecastResult[] {
    const { slope, intercept, rSquared } = model.parameters;
    const startPeriod = historicalData.length + 1;
    const forecast: NewForecastResult[] = [];

    for (let i = 0; i < periods; i++) {
      const periodIndex = startPeriod + i;
      const predictedValue = intercept + slope * periodIndex;

      const confidence = Math.max(0.5, rSquared);
      const margin = predictedValue * (1 - confidence) * 0.5;

      const forecastDate = new Date(historicalData[historicalData.length - 1].date);
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);

      forecast.push({
        period: forecastDate.toISOString().slice(0, 7),
        predictedValue: Math.max(0, predictedValue),
        confidenceInterval: {
          lower: Math.max(0, predictedValue - margin),
          upper: predictedValue + margin
        },
        confidence,
        factors: [
          {
            factor: 'Linear Trend',
            impact: slope > 0 ? 0.7 : -0.7,
            description: `${slope > 0 ? 'Positive' : 'Negative'} linear trend detected`
          },
          {
            factor: 'Model Accuracy',
            impact: rSquared,
            description: `Model explains ${(rSquared * 100).toFixed(1)}% of variance`
          }
        ]
      });
    }

    return forecast;
  }

  /**
   * Generate enhanced seasonal forecast with Zambian context
   */
  private generateEnhancedSeasonalForecast(
    model: any,
    historicalData: any[],
    periods: number
  ): NewForecastResult[] {
    const { trend, seasonal, seasonalPeriod } = model.parameters;
    const lastTrend = trend[trend.length - 1] || 0;
    const forecast: NewForecastResult[] = [];

    for (let i = 0; i < periods; i++) {
      const seasonalIndex = (historicalData.length + i) % seasonalPeriod;
      const seasonalComponent = seasonal[seasonalIndex] || 0;
      const predictedValue = lastTrend + seasonalComponent;

      const forecastDate = new Date(historicalData[historicalData.length - 1].date);
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);

      // Apply Zambian seasonal adjustments
      const zambianSeason = this.baseAnalyticsService.getZambianSeason(forecastDate);
      const zambianMultiplier = this.getZambianSeasonalMultiplier(zambianSeason);
      const adjustedValue = predictedValue * zambianMultiplier;

      forecast.push({
        period: forecastDate.toISOString().slice(0, 7),
        predictedValue: Math.max(0, adjustedValue),
        confidenceInterval: {
          lower: Math.max(0, adjustedValue * 0.85),
          upper: adjustedValue * 1.15
        },
        confidence: 0.8,
        factors: [
          {
            factor: 'Seasonal Pattern',
            impact: seasonalComponent / lastTrend,
            description: 'Historical seasonal pattern'
          },
          {
            factor: 'Zambian Season',
            impact: zambianMultiplier - 1,
            description: `${zambianSeason} seasonal adjustment`
          }
        ]
      });
    }

    return forecast;
  }

  /**
   * Generate enhanced exponential forecast
   */
  private generateEnhancedExponentialForecast(
    model: any,
    historicalData: any[],
    periods: number
  ): NewForecastResult[] {
    const { lastSmoothed, mae } = model.parameters;
    const forecast: NewForecastResult[] = [];

    for (let i = 0; i < periods; i++) {
      const forecastDate = new Date(historicalData[historicalData.length - 1].date);
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);

      const predictedValue = lastSmoothed;
      const margin = mae * 1.96; // 95% confidence interval

      forecast.push({
        period: forecastDate.toISOString().slice(0, 7),
        predictedValue: Math.max(0, predictedValue),
        confidenceInterval: {
          lower: Math.max(0, predictedValue - margin),
          upper: predictedValue + margin
        },
        confidence: 0.75,
        factors: [
          {
            factor: 'Exponential Smoothing',
            impact: 0.8,
            description: 'Weighted average of historical values'
          },
          {
            factor: 'Forecast Uncertainty',
            impact: mae / predictedValue,
            description: 'Uncertainty increases with forecast horizon'
          }
        ]
      });
    }

    return forecast;
  }

  /**
   * Apply Zambian business context to forecasts
   */
  private applyZambianBusinessContext(
    forecast: NewForecastResult[],
    dateRange: DateRange
  ): NewForecastResult[] {
    return forecast.map(result => {
      const forecastDate = new Date(result.period + '-01');

      // Apply Zambian holiday effects
      const holidayMultiplier = this.getZambianHolidayMultiplier(forecastDate);

      if (holidayMultiplier !== 1.0) {
        result.predictedValue *= holidayMultiplier;
        result.confidenceInterval.lower *= holidayMultiplier;
        result.confidenceInterval.upper *= holidayMultiplier;

        result.factors.push({
          factor: 'Zambian Holiday Effect',
          impact: holidayMultiplier - 1,
          description: 'Zambian holiday calendar adjustment'
        });
      }

      return result;
    });
  }

  /**
   * Helper methods for enhanced forecasting
   */
  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  private detectSeasonalityStrength(data: any[]): number {
    const monthlyVariance: Record<number, number[]> = {};

    data.forEach(point => {
      const month = point.date.getMonth();
      if (!monthlyVariance[month]) monthlyVariance[month] = [];
      monthlyVariance[month].push(point.value);
    });

    const monthlyCV = Object.entries(monthlyVariance).map(([month, values]) => {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = this.baseAnalyticsService.calculateStandardDeviation(values);
      return stdDev / mean;
    });

    return monthlyCV.reduce((sum, cv) => sum + cv, 0) / monthlyCV.length;
  }

  private calculateZambianSeasonalComponents(data: any[], period: number): number[] {
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    data.forEach((point, index) => {
      const seasonIndex = index % period;
      const zambianSeason = this.baseAnalyticsService.getZambianSeason(point.date);
      const zambianMultiplier = this.getZambianSeasonalMultiplier(zambianSeason);

      seasonal[seasonIndex] += point.value * zambianMultiplier;
      counts[seasonIndex]++;
    });

    return seasonal.map((sum, index) => counts[index] > 0 ? sum / counts[index] : 0);
  }

  private getZambianSeasonalMultiplier(season: string): number {
    switch (season) {
      case 'DRY_SEASON':
        return 1.1; // Higher business activity during dry season
      case 'RAINY_SEASON':
        return 0.9; // Lower activity during rainy season
      case 'TRANSITION':
        return 1.0; // Normal activity during transition
      default:
        return 1.0;
    }
  }

  private getZambianHolidayMultiplier(date: Date): number {
    const month = date.getMonth() + 1;

    // Major Zambian holidays affecting business
    if (month === 12) return 1.2; // December - holiday season boost
    if (month === 1) return 0.9;  // January - post-holiday slowdown
    if (month === 3) return 1.1;  // March - Youth Day, Heroes Day
    if (month === 10) return 1.1; // October - Independence Day

    return 1.0;
  }

  private isModelValid(model: any): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return model.lastTrainedAt > thirtyDaysAgo;
  }

  private convertToForecastModel(dbModel: any): any {
    return {
      type: dbModel.modelType,
      parameters: dbModel.modelParameters,
      accuracy: dbModel.accuracyMetrics?.accuracy || 0,
      lastTrained: dbModel.lastTrainedAt,
      isActive: dbModel.isActive
    };
  }
}
