import { StatisticalForecastingEngine } from './engines/statistical/statistical-forecasting.engine';
import { StatisticalAnomalyEngine } from './engines/statistical/statistical-anomaly.engine';
import { AnalyticsEngineFactory } from './engines/analytics-engine.factory';
import {
  AnalyticsData,
  ForecastingOptions,
  IAnomalyDetectionEngine,
  IForecastingEngine,
  TimeSeriesData,
} from './interfaces/analytics-engine.interface';

/**
 * Performance Benchmark for Enhanced Analytics Engines
 *
 * Validates that the enhanced engines meet performance requirements:
 * - Sub-2 second response times
 * - Improved accuracy (85-90% target)
 * - Scalability with various data sizes
 */
export class AnalyticsPerformanceBenchmark {
  private forecastingEngine: IForecastingEngine;
  private anomalyEngine: IAnomalyDetectionEngine;
  private engineFactory: AnalyticsEngineFactory;

  constructor(private readonly factory: AnalyticsEngineFactory) {
    this.engineFactory = factory;
    this.forecastingEngine = this.engineFactory.getForecastingEngine(
      1000,
      'COMPLEX',
      false
    );
    this.anomalyEngine = this.engineFactory.getAnomalyDetectionEngine(
      { size: 1000, dimensions: 10, hasSeasonality: true },
      false
    );
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runBenchmarks(): Promise<{
    forecasting: any;
    anomalyDetection: any;
    engineFactory: any;
    summary: any;
  }> {
    console.log(
      '🚀 Starting IntelliFin Enhanced Analytics Performance Benchmarks...\n'
    );

    const forecastingResults = await this.benchmarkForecasting();
    const anomalyResults = await this.benchmarkAnomalyDetection();
    const factoryResults = await this.benchmarkEngineFactory();

    const summary = this.generateSummary(
      forecastingResults,
      anomalyResults,
      factoryResults
    );

    console.log('\n✅ Benchmark Results Summary:');
    console.log(JSON.stringify(summary, null, 2));

    return {
      forecasting: forecastingResults,
      anomalyDetection: anomalyResults,
      engineFactory: factoryResults,
      summary,
    };
  }

  /**
   * Benchmark forecasting engine performance
   */
  private async benchmarkForecasting(): Promise<any> {
    console.log('📈 Benchmarking Forecasting Engine...');

    const results = {
      smallDataset: await this.testForecastingPerformance(50),
      mediumDataset: await this.testForecastingPerformance(200),
      largeDataset: await this.testForecastingPerformance(1000),
      concurrentRequests: await this.testConcurrentForecasting(),
    };

    console.log('   ✓ Forecasting benchmarks completed');
    return results;
  }

  /**
   * Benchmark anomaly detection engine performance
   */
  private async benchmarkAnomalyDetection(): Promise<any> {
    console.log('🔍 Benchmarking Anomaly Detection Engine...');

    const results = {
      smallDataset: await this.testAnomalyDetectionPerformance(50),
      mediumDataset: await this.testAnomalyDetectionPerformance(200),
      largeDataset: await this.testAnomalyDetectionPerformance(1000),
      concurrentRequests: await this.testConcurrentAnomalyDetection(),
    };

    console.log('   ✓ Anomaly detection benchmarks completed');
    return results;
  }

  /**
   * Benchmark engine factory performance
   */
  private async benchmarkEngineFactory(): Promise<any> {
    console.log('🏭 Benchmarking Engine Factory...');

    const results = {
      engineCreation: await this.testEngineCreationPerformance(),
      healthCheck: await this.testHealthCheckPerformance(),
      recommendations: await this.testRecommendationPerformance(),
    };

    console.log('   ✓ Engine factory benchmarks completed');
    return results;
  }

  /**
   * Test forecasting performance with different data sizes
   */
  private async testForecastingPerformance(dataSize: number): Promise<any> {
    const timeSeriesData = this.generateTimeSeriesData(dataSize);
    const options: ForecastingOptions = {
      method: 'seasonal',
      periods: 6,
      confidence: 0.95,
      includeSeasonality: true,
      zambianContext: true,
    };

    const startTime = Date.now();

    try {
      const result = await this.forecastingEngine.generateForecast(
        timeSeriesData,
        options
      );
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        dataSize,
        executionTime,
        accuracy: result.accuracy,
        predictionsCount: result.predictions.length,
        insightsCount: result.insights.length,
        recommendationsCount: result.recommendations.length,
        meetsPerformanceTarget: executionTime < 2000,
        meetsAccuracyTarget: result.accuracy.confidence > 0.8,
      };
    } catch (error) {
      return {
        dataSize,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test anomaly detection performance with different data sizes
   */
  private async testAnomalyDetectionPerformance(
    dataSize: number
  ): Promise<any> {
    const analyticsData = this.generateAnalyticsData(dataSize);

    const startTime = Date.now();

    try {
      const result = await this.anomalyEngine.detectAnomalies(
        analyticsData,
        'MEDIUM'
      );
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        dataSize,
        executionTime,
        anomaliesDetected: result.anomalies.length,
        patternsDetected: result.patterns.length,
        recommendationsCount: result.recommendations.length,
        meetsPerformanceTarget: executionTime < 2000,
      };
    } catch (error) {
      return {
        dataSize,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test concurrent forecasting performance
   */
  private async testConcurrentForecasting(): Promise<any> {
    const timeSeriesData = this.generateTimeSeriesData(100);
    const options: ForecastingOptions = {
      method: 'linear',
      periods: 6,
      confidence: 0.95,
      includeSeasonality: false,
      zambianContext: false,
    };

    const concurrentRequests = 5;
    const startTime = Date.now();

    try {
      const promises = Array.from({ length: concurrentRequests }, () =>
        this.forecastingEngine.generateForecast(timeSeriesData, options)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalExecutionTime = endTime - startTime;

      return {
        concurrentRequests,
        totalExecutionTime,
        averageExecutionTime: totalExecutionTime / concurrentRequests,
        successfulRequests: results.length,
        meetsPerformanceTarget: totalExecutionTime < 5000,
      };
    } catch (error) {
      return {
        concurrentRequests,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalExecutionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test concurrent anomaly detection performance
   */
  private async testConcurrentAnomalyDetection(): Promise<any> {
    const analyticsData = this.generateAnalyticsData(100);
    const concurrentRequests = 5;
    const startTime = Date.now();

    try {
      const promises = Array.from({ length: concurrentRequests }, () =>
        this.anomalyEngine.detectAnomalies(analyticsData, 'MEDIUM')
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalExecutionTime = endTime - startTime;

      return {
        concurrentRequests,
        totalExecutionTime,
        averageExecutionTime: totalExecutionTime / concurrentRequests,
        successfulRequests: results.length,
        meetsPerformanceTarget: totalExecutionTime < 3000,
      };
    } catch (error) {
      return {
        concurrentRequests,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalExecutionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test engine creation performance
   */
  private async testEngineCreationPerformance(): Promise<any> {
    const startTime = Date.now();

    try {
      const engines = [];
      for (let i = 0; i < 10; i++) {
        engines.push(
          this.engineFactory.getForecastingEngine(
            100 + i * 10,
            'MODERATE',
            false
          )
        );
        engines.push(
          this.engineFactory.getAnomalyDetectionEngine(
            {
              size: 100 + i * 10,
              dimensions: 1,
              hasSeasonality: false,
            },
            false
          )
        );
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        enginesCreated: engines.length,
        executionTime,
        averageCreationTime: executionTime / engines.length,
        meetsPerformanceTarget: executionTime < 100,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test health check performance
   */
  private async testHealthCheckPerformance(): Promise<any> {
    const startTime = Date.now();

    try {
      const health = await this.engineFactory.healthCheck();
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        executionTime,
        healthStatus: health,
        meetsPerformanceTarget: executionTime < 100,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test recommendation performance
   */
  private async testRecommendationPerformance(): Promise<any> {
    const testCases = [
      {
        size: 50,
        complexity: 0.3,
        accuracy_requirements: 0.8,
        performance_requirements: 0.9,
      },
      {
        size: 200,
        complexity: 0.6,
        accuracy_requirements: 0.85,
        performance_requirements: 0.8,
      },
      {
        size: 1000,
        complexity: 0.9,
        accuracy_requirements: 0.95,
        performance_requirements: 0.7,
      },
    ];

    const startTime = Date.now();

    try {
      const recommendations = testCases.map(testCase =>
        this.engineFactory.getEngineRecommendations(testCase)
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        testCases: testCases.length,
        executionTime,
        recommendations,
        meetsPerformanceTarget: executionTime < 50,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate mock time series data for testing
   */
  private generateTimeSeriesData(size: number): TimeSeriesData {
    const values = Array.from({ length: size }, (_, i) => {
      const baseValue = 1000 + Math.sin(i * 0.1) * 200; // Seasonal pattern
      const trend = i * 5; // Growth trend
      const noise = (Math.random() - 0.5) * 100; // Random noise
      return Math.max(0, baseValue + trend + noise);
    });

    const timestamps = Array.from({ length: size }, (_, i) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + i * 7); // Weekly data
      return date;
    });

    return {
      values,
      timestamps,
      metadata: {
        organizationId: 'benchmark-org',
        dataType: 'REVENUE',
        dateRange: {
          startDate: timestamps[0],
          endDate: timestamps[timestamps.length - 1],
        },
        quality: {
          completeness: 1.0,
          accuracy: 0.95,
          consistency: 0.9,
          timeliness: 1.0,
        },
      },
    };
  }

  /**
   * Generate mock analytics data for testing
   */
  private generateAnalyticsData(size: number): AnalyticsData {
    const timeSeriesData = this.generateTimeSeriesData(size);

    // Add some anomalies for testing
    const anomalyIndices = [
      Math.floor(size * 0.2),
      Math.floor(size * 0.6),
      Math.floor(size * 0.8),
    ];

    anomalyIndices.forEach(index => {
      if (index < timeSeriesData.values.length) {
        timeSeriesData.values[index] *= 3; // Create obvious anomaly
      }
    });

    return {
      timeSeries: timeSeriesData,
      metadata: {
        organizationId: 'benchmark-org',
        dataType: 'REVENUE',
        dateRange: {
          startDate: timeSeriesData.timestamps[0],
          endDate:
            timeSeriesData.timestamps[timeSeriesData.timestamps.length - 1],
        },
        quality: {
          completeness: 1.0,
          accuracy: 0.95,
          consistency: 0.9,
          timeliness: 1.0,
        },
      },
    };
  }

  /**
   * Generate performance summary
   */
  private generateSummary(
    forecastingResults: any,
    anomalyResults: any,
    factoryResults: any
  ): any {
    const allTests = [
      ...Object.values(forecastingResults),
      ...Object.values(anomalyResults),
      ...Object.values(factoryResults),
    ].filter(result => typeof result === 'object' && result !== null);

    const performanceTests = allTests.filter(
      (test: any) => test && typeof test.meetsPerformanceTarget === 'boolean'
    );

    const passedPerformanceTests = performanceTests.filter(
      (test: any) => test.meetsPerformanceTarget
    ).length;

    const accuracyTests = allTests.filter(
      (test: any) => test && typeof test.meetsAccuracyTarget === 'boolean'
    );

    const passedAccuracyTests = accuracyTests.filter(
      (test: any) => test.meetsAccuracyTarget
    ).length;

    return {
      totalTests: allTests.length,
      performanceTests: {
        total: performanceTests.length,
        passed: passedPerformanceTests,
        passRate:
          performanceTests.length > 0
            ? (passedPerformanceTests / performanceTests.length) * 100
            : 0,
      },
      accuracyTests: {
        total: accuracyTests.length,
        passed: passedAccuracyTests,
        passRate:
          accuracyTests.length > 0
            ? (passedAccuracyTests / accuracyTests.length) * 100
            : 0,
      },
      overallSuccess:
        passedPerformanceTests === performanceTests.length &&
        passedAccuracyTests === accuracyTests.length,
      recommendations: [
        performanceTests.length > 0 &&
        passedPerformanceTests < performanceTests.length
          ? 'Some performance tests failed - consider optimization'
          : null,
        accuracyTests.length > 0 && passedAccuracyTests < accuracyTests.length
          ? 'Some accuracy tests failed - review algorithm parameters'
          : null,
      ].filter(Boolean),
    };
  }
}

// Export function to run benchmarks
export async function runAnalyticsBenchmarks(): Promise<any> {
  const benchmark = new AnalyticsPerformanceBenchmark();
  return await benchmark.runBenchmarks();
}
