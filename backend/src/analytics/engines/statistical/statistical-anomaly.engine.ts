import { Logger } from '@nestjs/common';
import * as ss from 'simple-statistics';
import * as math from 'mathjs';
import { Matrix } from 'ml-matrix';
import { 
  IAnomalyDetectionEngine, 
  AnalyticsData, 
  AnomalySensitivity, 
  AnomalyResult,
  AnalyticsCapability,
  AnomalyPoint,
  AnomalyPattern,
  AnomalySeverity
} from '../../interfaces/analytics-engine.interface';

/**
 * Enhanced Statistical Anomaly Detection Engine
 * 
 * Implements advanced statistical anomaly detection methods using
 * proven mathematical libraries for improved accuracy and performance
 */
export class StatisticalAnomalyEngine implements IAnomalyDetectionEngine {
  private readonly logger = new Logger(StatisticalAnomalyEngine.name);
  
  readonly engineType = 'STATISTICAL' as const;
  readonly version = '2.0.0';
  readonly capabilities: AnalyticsCapability[] = [
    'ANOMALY_DETECTION',
    'PATTERN_RECOGNITION'
  ];

  /**
   * Detect anomalies using multiple statistical methods
   */
  async detectAnomalies(
    data: AnalyticsData,
    sensitivity: AnomalySensitivity = 'MEDIUM'
  ): Promise<AnomalyResult> {
    try {
      this.logger.log(`Detecting anomalies with ${sensitivity} sensitivity`);
      
      // Validate input data
      this.validateAnalyticsData(data);
      
      // Extract time series data
      const timeSeriesData = data.timeSeries;
      if (!timeSeriesData) {
        throw new Error('Time series data is required for anomaly detection');
      }
      
      // Apply multiple anomaly detection methods
      const zScoreAnomalies = this.detectZScoreAnomalies(timeSeriesData.values, sensitivity);
      const iqrAnomalies = this.detectIQRAnomalies(timeSeriesData.values, sensitivity);
      const isolationAnomalies = this.detectIsolationAnomalies(timeSeriesData.values, sensitivity);
      const seasonalAnomalies = this.detectSeasonalAnomalies(timeSeriesData.values, sensitivity);
      
      // Combine and rank anomalies
      const combinedAnomalies = this.combineAnomalies([
        zScoreAnomalies,
        iqrAnomalies,
        isolationAnomalies,
        seasonalAnomalies
      ], timeSeriesData.timestamps);
      
      // Detect patterns in anomalies
      const patterns = this.detectAnomalyPatterns(combinedAnomalies);
      
      // Generate severity levels
      const severity = this.calculateAnomalySeverity(combinedAnomalies);
      
      // Generate recommendations
      const recommendations = this.generateAnomalyRecommendations(combinedAnomalies, patterns);
      
      return {
        anomalies: combinedAnomalies,
        severity,
        patterns,
        recommendations
      };
      
    } catch (error) {
      this.logger.error(`Anomaly detection failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Train model (placeholder for future ML implementation)
   */
  async trainModel(historicalData: AnalyticsData): Promise<void> {
    this.logger.log('Training statistical anomaly detection model');
    // For statistical methods, we don't need explicit training
    // This method is prepared for future ML integration
  }

  /**
   * Update model (placeholder for future ML implementation)
   */
  async updateModel(newData: AnalyticsData): Promise<void> {
    this.logger.log('Updating statistical anomaly detection model');
    // For statistical methods, we don't need explicit model updates
    // This method is prepared for future ML integration
  }

  /**
   * Z-Score based anomaly detection
   */
  private detectZScoreAnomalies(values: number[], sensitivity: AnomalySensitivity): number[] {
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);
    
    const thresholds = {
      LOW: 3.0,
      MEDIUM: 2.5,
      HIGH: 2.0
    };
    
    const threshold = thresholds[sensitivity];
    const anomalies: number[] = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs(value - mean) / stdDev;
      if (zScore > threshold) {
        anomalies.push(index);
      }
    });
    
    return anomalies;
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   */
  private detectIQRAnomalies(values: number[], sensitivity: AnomalySensitivity): number[] {
    const q1 = ss.quantile(values, 0.25);
    const q3 = ss.quantile(values, 0.75);
    const iqr = q3 - q1;
    
    const multipliers = {
      LOW: 2.0,
      MEDIUM: 1.5,
      HIGH: 1.0
    };
    
    const multiplier = multipliers[sensitivity];
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;
    
    const anomalies: number[] = [];
    
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        anomalies.push(index);
      }
    });
    
    return anomalies;
  }

  /**
   * Isolation-based anomaly detection (simplified statistical version)
   */
  private detectIsolationAnomalies(values: number[], sensitivity: AnomalySensitivity): number[] {
    const anomalies: number[] = [];
    
    // Calculate local density for each point
    const windowSize = Math.max(3, Math.floor(values.length * 0.1));
    
    values.forEach((value, index) => {
      const start = Math.max(0, index - windowSize);
      const end = Math.min(values.length, index + windowSize + 1);
      const localValues = values.slice(start, end);
      
      const localMean = ss.mean(localValues);
      const localStdDev = ss.standardDeviation(localValues);
      
      if (localStdDev > 0) {
        const localZScore = Math.abs(value - localMean) / localStdDev;
        
        const thresholds = {
          LOW: 2.5,
          MEDIUM: 2.0,
          HIGH: 1.5
        };
        
        if (localZScore > thresholds[sensitivity]) {
          anomalies.push(index);
        }
      }
    });
    
    return anomalies;
  }

  /**
   * Seasonal anomaly detection
   */
  private detectSeasonalAnomalies(values: number[], sensitivity: AnomalySensitivity): number[] {
    const anomalies: number[] = [];
    const seasonLength = 12; // Monthly seasonality
    
    if (values.length < seasonLength * 2) {
      return anomalies; // Not enough data for seasonal analysis
    }
    
    // Calculate seasonal baseline
    const seasonalBaseline = this.calculateSeasonalBaseline(values, seasonLength);
    
    values.forEach((value, index) => {
      const seasonIndex = index % seasonLength;
      const expectedValue = seasonalBaseline[seasonIndex];
      const seasonalStdDev = this.calculateSeasonalStdDev(values, seasonLength, seasonIndex);
      
      if (seasonalStdDev > 0) {
        const seasonalZScore = Math.abs(value - expectedValue) / seasonalStdDev;
        
        const thresholds = {
          LOW: 2.5,
          MEDIUM: 2.0,
          HIGH: 1.5
        };
        
        if (seasonalZScore > thresholds[sensitivity]) {
          anomalies.push(index);
        }
      }
    });
    
    return anomalies;
  }

  /**
   * Calculate seasonal baseline
   */
  private calculateSeasonalBaseline(values: number[], seasonLength: number): number[] {
    const baseline: number[] = new Array(seasonLength).fill(0);
    const counts: number[] = new Array(seasonLength).fill(0);
    
    values.forEach((value, index) => {
      const seasonIndex = index % seasonLength;
      baseline[seasonIndex] += value;
      counts[seasonIndex]++;
    });
    
    return baseline.map((sum, index) => counts[index] > 0 ? sum / counts[index] : 0);
  }

  /**
   * Calculate seasonal standard deviation
   */
  private calculateSeasonalStdDev(values: number[], seasonLength: number, seasonIndex: number): number {
    const seasonalValues: number[] = [];
    
    for (let i = seasonIndex; i < values.length; i += seasonLength) {
      seasonalValues.push(values[i]);
    }
    
    return seasonalValues.length > 1 ? ss.standardDeviation(seasonalValues) : 0;
  }

  /**
   * Combine anomalies from multiple methods
   */
  private combineAnomalies(
    anomalyLists: number[][],
    timestamps: Date[]
  ): AnomalyPoint[] {
    const anomalyMap = new Map<number, { count: number; methods: string[] }>();
    
    // Count occurrences across methods
    const methodNames = ['Z-Score', 'IQR', 'Isolation', 'Seasonal'];
    
    anomalyLists.forEach((anomalies, methodIndex) => {
      anomalies.forEach(index => {
        if (!anomalyMap.has(index)) {
          anomalyMap.set(index, { count: 0, methods: [] });
        }
        const entry = anomalyMap.get(index)!;
        entry.count++;
        entry.methods.push(methodNames[methodIndex]);
      });
    });
    
    // Convert to AnomalyPoint objects
    const combinedAnomalies: AnomalyPoint[] = [];
    
    anomalyMap.forEach((entry, index) => {
      if (index < timestamps.length) {
        const severity = this.determineSeverity(entry.count, anomalyLists.length);
        
        combinedAnomalies.push({
          timestamp: timestamps[index],
          value: 0, // Will be filled by caller
          expectedValue: 0, // Will be calculated
          severity,
          explanation: `Detected by ${entry.methods.join(', ')} method(s)`
        });
      }
    });
    
    return combinedAnomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Determine severity based on method consensus
   */
  private determineSeverity(detectionCount: number, totalMethods: number): AnomalySeverity {
    const consensus = detectionCount / totalMethods;
    
    if (consensus >= 0.75) return 'CRITICAL';
    if (consensus >= 0.5) return 'HIGH';
    if (consensus >= 0.25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Detect patterns in anomalies
   */
  private detectAnomalyPatterns(anomalies: AnomalyPoint[]): AnomalyPattern[] {
    const patterns: AnomalyPattern[] = [];
    
    // Detect clustering patterns
    const clusters = this.detectAnomalyClusters(anomalies);
    if (clusters.length > 0) {
      patterns.push({
        type: 'CLUSTERING',
        frequency: clusters.length,
        description: `${clusters.length} anomaly cluster(s) detected`
      });
    }
    
    // Detect periodic patterns
    const periodicPattern = this.detectPeriodicAnomalies(anomalies);
    if (periodicPattern) {
      patterns.push(periodicPattern);
    }
    
    return patterns;
  }

  /**
   * Detect anomaly clusters
   */
  private detectAnomalyClusters(anomalies: AnomalyPoint[]): AnomalyPoint[][] {
    const clusters: AnomalyPoint[][] = [];
    const maxGap = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    let currentCluster: AnomalyPoint[] = [];
    
    anomalies.forEach((anomaly, index) => {
      if (index === 0) {
        currentCluster.push(anomaly);
      } else {
        const timeDiff = anomaly.timestamp.getTime() - anomalies[index - 1].timestamp.getTime();
        
        if (timeDiff <= maxGap) {
          currentCluster.push(anomaly);
        } else {
          if (currentCluster.length >= 2) {
            clusters.push([...currentCluster]);
          }
          currentCluster = [anomaly];
        }
      }
    });
    
    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }
    
    return clusters;
  }

  /**
   * Detect periodic anomalies
   */
  private detectPeriodicAnomalies(anomalies: AnomalyPoint[]): AnomalyPattern | null {
    if (anomalies.length < 3) return null;
    
    // Calculate time differences between consecutive anomalies
    const timeDiffs: number[] = [];
    for (let i = 1; i < anomalies.length; i++) {
      const diff = anomalies[i].timestamp.getTime() - anomalies[i - 1].timestamp.getTime();
      timeDiffs.push(diff);
    }
    
    // Check for consistent patterns
    const avgDiff = ss.mean(timeDiffs);
    const stdDev = ss.standardDeviation(timeDiffs);
    const coefficient = stdDev / avgDiff;
    
    if (coefficient < 0.3) { // Low variability indicates periodicity
      const periodDays = Math.round(avgDiff / (24 * 60 * 60 * 1000));
      
      return {
        type: 'PERIODIC',
        frequency: periodDays,
        description: `Anomalies occur approximately every ${periodDays} day(s)`
      };
    }
    
    return null;
  }

  /**
   * Calculate anomaly severity distribution
   */
  private calculateAnomalySeverity(anomalies: AnomalyPoint[]): AnomalySeverity[] {
    return anomalies.map(anomaly => anomaly.severity);
  }

  /**
   * Generate recommendations based on anomalies and patterns
   */
  private generateAnomalyRecommendations(
    anomalies: AnomalyPoint[],
    patterns: AnomalyPattern[]
  ): string[] {
    const recommendations: string[] = [];
    
    // General recommendations based on anomaly count
    if (anomalies.length > 10) {
      recommendations.push('High number of anomalies detected - review data quality and business processes');
    }
    
    // Critical anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL');
    if (criticalAnomalies.length > 0) {
      recommendations.push(`${criticalAnomalies.length} critical anomalies require immediate attention`);
    }
    
    // Pattern-based recommendations
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'CLUSTERING':
          recommendations.push('Clustered anomalies suggest systematic issues - investigate root causes');
          break;
        case 'PERIODIC':
          recommendations.push(`Periodic anomalies every ${pattern.frequency} days - check for recurring events`);
          break;
      }
    });
    
    // Zambian business context recommendations
    recommendations.push('Consider seasonal factors specific to Zambian market conditions');
    recommendations.push('Monitor for mobile money transaction anomalies during peak periods');
    
    return recommendations;
  }

  /**
   * Validate analytics data
   */
  private validateAnalyticsData(data: AnalyticsData): void {
    if (!data.timeSeries) {
      throw new Error('Time series data is required for anomaly detection');
    }
    
    if (!data.timeSeries.values || data.timeSeries.values.length < 3) {
      throw new Error('Insufficient data points for anomaly detection');
    }
    
    if (data.timeSeries.values.some(v => isNaN(v))) {
      throw new Error('Invalid data values detected');
    }
  }
}
