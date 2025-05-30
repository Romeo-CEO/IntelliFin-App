import { Test, TestingModule } from '@nestjs/testing';
import { StatisticalForecastingEngine } from '../statistical/statistical-forecasting.engine';
import {
  ForecastResult,
  ForecastingOptions,
  ModelValidation,
  TimeSeriesData,
} from '../../interfaces/analytics-engine.interface';

describe('StatisticalForecastingEngine', () => {
  let engine: StatisticalForecastingEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticalForecastingEngine],
    }).compile();

    engine = module.get<StatisticalForecastingEngine>(
      StatisticalForecastingEngine
    );
  });

  describe('Engine Properties', () => {
    it('should have correct engine properties', () => {
      expect(engine.engineType).toBe('STATISTICAL');
      expect(engine.version).toBe('2.0.0');
      expect(engine.capabilities).toContain('FORECASTING');
      expect(engine.capabilities).toContain('TREND_ANALYSIS');
    });
  });

  describe('generateForecast', () => {
    const mockTimeSeriesData: TimeSeriesData = {
      values: [100, 110, 105, 120, 115, 130, 125, 140, 135, 150, 145, 160],
      timestamps: Array.from({ length: 12 }, (_, i) => {
        const date = new Date('2024-01-01');
        date.setMonth(i);
        return date;
      }),
      metadata: {
        organizationId: 'test-org',
        dataType: 'REVENUE',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        quality: {
          completeness: 1.0,
          accuracy: 0.9,
          consistency: 0.8,
          timeliness: 1.0,
        },
      },
    };

    const defaultOptions: ForecastingOptions = {
      method: 'linear',
      periods: 6,
      confidence: 0.95,
      includeSeasonality: false,
      zambianContext: false,
    };

    it('should generate linear forecast successfully', async () => {
      const result = await engine.generateForecast(
        mockTimeSeriesData,
        defaultOptions
      );

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(6);
      expect(result.confidence).toHaveLength(6);
      expect(result.accuracy).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Validate prediction structure
      result.predictions.forEach(prediction => {
        expect(prediction.timestamp).toBeInstanceOf(Date);
        expect(typeof prediction.value).toBe('number');
        expect(prediction.value).toBeGreaterThanOrEqual(0);
        expect(typeof prediction.confidence).toBe('number');
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });

      // Validate accuracy metrics
      expect(typeof result.accuracy.mape).toBe('number');
      expect(typeof result.accuracy.rmse).toBe('number');
      expect(typeof result.accuracy.r2).toBe('number');
      expect(typeof result.accuracy.confidence).toBe('number');
    });

    it('should generate exponential smoothing forecast', async () => {
      const options: ForecastingOptions = {
        ...defaultOptions,
        method: 'exponential',
      };
      const result = await engine.generateForecast(mockTimeSeriesData, options);

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(6);
      expect(result.accuracy.confidence).toBeGreaterThan(0.3);
    });

    it('should generate seasonal forecast', async () => {
      const options: ForecastingOptions = {
        ...defaultOptions,
        method: 'seasonal',
        includeSeasonality: true,
      };
      const result = await engine.generateForecast(mockTimeSeriesData, options);

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(6);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should use adaptive method selection', async () => {
      const options: ForecastingOptions = { ...defaultOptions, method: 'ml' }; // Falls back to adaptive
      const result = await engine.generateForecast(mockTimeSeriesData, options);

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(6);
    });

    it('should include Zambian context when enabled', async () => {
      const options: ForecastingOptions = {
        ...defaultOptions,
        zambianContext: true,
      };
      const result = await engine.generateForecast(mockTimeSeriesData, options);

      expect(
        result.insights.some(
          insight =>
            insight.includes('agricultural') || insight.includes('mobile money')
        )
      ).toBe(true);
      expect(
        result.recommendations.some(
          rec => rec.includes('ZRA') || rec.includes('seasonal')
        )
      ).toBe(true);
    });

    it('should handle insufficient data gracefully', async () => {
      const insufficientData: TimeSeriesData = {
        ...mockTimeSeriesData,
        values: [100, 110],
        timestamps: [new Date('2024-01-01'), new Date('2024-02-01')],
      };

      await expect(
        engine.generateForecast(insufficientData, defaultOptions)
      ).rejects.toThrow('Insufficient data points for forecasting');
    });

    it('should handle invalid data values', async () => {
      const invalidData: TimeSeriesData = {
        ...mockTimeSeriesData,
        values: [100, NaN, -50, 120],
      };

      await expect(
        engine.generateForecast(invalidData, defaultOptions)
      ).rejects.toThrow('Invalid data values detected');
    });

    it('should achieve target accuracy for trending data', async () => {
      // Create strongly trending data
      const trendingData: TimeSeriesData = {
        values: [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155],
        timestamps: Array.from({ length: 12 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setMonth(i);
          return date;
        }),
        metadata: mockTimeSeriesData.metadata,
      };

      const result = await engine.generateForecast(
        trendingData,
        defaultOptions
      );

      // For strongly trending data, we should achieve high accuracy
      expect(result.accuracy.confidence).toBeGreaterThan(0.8);
      expect(result.accuracy.mape).toBeLessThan(20); // Less than 20% MAPE
    });
  });

  describe('validateModel', () => {
    const mockTimeSeriesData: TimeSeriesData = {
      values: [100, 110, 105, 120, 115, 130, 125, 140, 135, 150],
      timestamps: Array.from({ length: 10 }, (_, i) => {
        const date = new Date('2024-01-01');
        date.setMonth(i);
        return date;
      }),
      metadata: {
        organizationId: 'test-org',
        dataType: 'REVENUE',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-10-31'),
        },
        quality: {
          completeness: 1.0,
          accuracy: 0.9,
          consistency: 0.8,
          timeliness: 1.0,
        },
      },
    };

    it('should validate model successfully with good data', async () => {
      const validation = await engine.validateModel(mockTimeSeriesData);

      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation.metrics).toBeDefined();
      expect(typeof validation.metrics.crossValidationScore).toBe('number');
      expect(typeof validation.metrics.holdoutScore).toBe('number');
      expect(typeof validation.metrics.stabilityScore).toBe('number');
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    it('should provide recommendations for poor data quality', async () => {
      const poorData: TimeSeriesData = {
        values: [100, 50, 200, 30, 180, 40], // High volatility
        timestamps: Array.from({ length: 6 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setMonth(i);
          return date;
        }),
        metadata: mockTimeSeriesData.metadata,
      };

      const validation = await engine.validateModel(poorData);

      expect(validation.recommendations.length).toBeGreaterThan(0);
      if (!validation.isValid) {
        expect(
          validation.recommendations.some(
            rec => rec.includes('data quality') || rec.includes('volatility')
          )
        ).toBe(true);
      }
    });
  });

  describe('getModelMetrics', () => {
    it('should return model performance metrics', async () => {
      const metrics = await engine.getModelMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.accuracy).toBe('number');
      expect(typeof metrics.precision).toBe('number');
      expect(typeof metrics.recall).toBe('number');
      expect(typeof metrics.f1Score).toBe('number');
      expect(typeof metrics.mape).toBe('number');
      expect(typeof metrics.rmse).toBe('number');

      // Validate metric ranges
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
      expect(metrics.precision).toBeGreaterThanOrEqual(0);
      expect(metrics.precision).toBeLessThanOrEqual(1);
      expect(metrics.recall).toBeGreaterThanOrEqual(0);
      expect(metrics.recall).toBeLessThanOrEqual(1);
      expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
      expect(metrics.f1Score).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete forecast generation within 2 seconds', async () => {
      const largeDataset: TimeSeriesData = {
        values: Array.from(
          { length: 100 },
          (_, i) => 100 + Math.sin(i * 0.1) * 20 + i * 2
        ),
        timestamps: Array.from({ length: 100 }, (_, i) => {
          const date = new Date('2020-01-01');
          date.setMonth(i);
          return date;
        }),
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: {
            startDate: new Date('2020-01-01'),
            endDate: new Date('2028-04-30'),
          },
          quality: {
            completeness: 1.0,
            accuracy: 0.9,
            consistency: 0.8,
            timeliness: 1.0,
          },
        },
      };

      const options: ForecastingOptions = {
        method: 'seasonal',
        periods: 12,
        confidence: 0.95,
        includeSeasonality: true,
        zambianContext: true,
      };

      const startTime = Date.now();
      const result = await engine.generateForecast(largeDataset, options);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle multiple concurrent forecasts efficiently', async () => {
      const mockData: TimeSeriesData = {
        values: [100, 110, 105, 120, 115, 130, 125, 140],
        timestamps: Array.from({ length: 8 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setMonth(i);
          return date;
        }),
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-08-31'),
          },
          quality: {
            completeness: 1.0,
            accuracy: 0.9,
            consistency: 0.8,
            timeliness: 1.0,
          },
        },
      };

      const options: ForecastingOptions = {
        method: 'linear',
        periods: 6,
        confidence: 0.95,
        includeSeasonality: false,
        zambianContext: false,
      };

      const startTime = Date.now();

      // Run 5 concurrent forecasts
      const promises = Array.from({ length: 5 }, () =>
        engine.generateForecast(mockData, options)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalExecutionTime = endTime - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.predictions).toHaveLength(6);
      });

      // Should complete all 5 forecasts within reasonable time
      expect(totalExecutionTime).toBeLessThan(5000); // Less than 5 seconds for 5 concurrent
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed timestamps gracefully', async () => {
      const malformedData: TimeSeriesData = {
        values: [100, 110, 120],
        timestamps: [new Date('2024-01-01'), new Date('2024-02-01')], // Mismatched length
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
          },
          quality: {
            completeness: 1.0,
            accuracy: 0.9,
            consistency: 0.8,
            timeliness: 1.0,
          },
        },
      };

      const options: ForecastingOptions = {
        method: 'linear',
        periods: 3,
        confidence: 0.95,
        includeSeasonality: false,
        zambianContext: false,
      };

      await expect(
        engine.generateForecast(malformedData, options)
      ).rejects.toThrow(
        'Timestamps and values arrays must have the same length'
      );
    });

    it('should provide meaningful error messages', async () => {
      const emptyData: TimeSeriesData = {
        values: [],
        timestamps: [],
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
          },
          quality: {
            completeness: 0,
            accuracy: 0,
            consistency: 0,
            timeliness: 0,
          },
        },
      };

      const options: ForecastingOptions = {
        method: 'linear',
        periods: 6,
        confidence: 0.95,
        includeSeasonality: false,
        zambianContext: false,
      };

      await expect(engine.generateForecast(emptyData, options)).rejects.toThrow(
        'Insufficient data points for forecasting'
      );
    });
  });
});
