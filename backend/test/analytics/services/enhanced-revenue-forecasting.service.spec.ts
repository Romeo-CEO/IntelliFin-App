import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedRevenueForecastingService } from '../../../src/analytics/services/enhanced-revenue-forecasting.service';
import { AnalyticsEngineFactory } from '../../../src/analytics/engines/analytics-engine.factory';
import { BaseAnalyticsService } from '../../../src/analytics/services/base-analytics.service';
import { AnalyticsAggregationService } from '../../../src/analytics/services/analytics-aggregation.service';
import { StatisticalForecastingEngine } from '../../../src/analytics/engines/statistical/statistical-forecasting.engine';
import {
  ForecastResult,
  ForecastingOptions,
  TimeSeriesData,
} from '../../../src/analytics/interfaces/analytics-engine.interface';

describe('EnhancedRevenueForecastingService', () => {
  let service: EnhancedRevenueForecastingService;
  let engineFactory: AnalyticsEngineFactory;
  let baseAnalyticsService: BaseAnalyticsService;
  let aggregationService: AnalyticsAggregationService;
  let mockForecastingEngine: jest.Mocked<StatisticalForecastingEngine>;

  const mockFinancialData = {
    invoices: [
      {
        id: 'inv-1',
        organizationId: 'org-1',
        status: 'PAID',
        issueDate: '2024-01-15',
        totalAmount: 1000,
        paidAmount: 1000,
      },
      {
        id: 'inv-2',
        organizationId: 'org-1',
        status: 'PAID',
        issueDate: '2024-02-15',
        totalAmount: 1200,
        paidAmount: 1200,
      },
      {
        id: 'inv-3',
        organizationId: 'org-1',
        status: 'PARTIALLY_PAID',
        issueDate: '2024-03-15',
        totalAmount: 1500,
        paidAmount: 1000,
      },
    ],
    payments: [],
    expenses: [],
  };

  const mockForecastResult: ForecastResult = {
    predictions: [
      {
        timestamp: new Date('2024-04-01'),
        value: 1100,
        confidence: 0.85,
      },
      {
        timestamp: new Date('2024-05-01'),
        value: 1150,
        confidence: 0.82,
      },
    ],
    confidence: [
      { lower: 950, upper: 1250, probability: 0.95 },
      { lower: 1000, upper: 1300, probability: 0.95 },
    ],
    accuracy: {
      mape: 12.5,
      rmse: 85.2,
      r2: 0.87,
      confidence: 0.85,
    },
    insights: ['Strong upward trend detected'],
    recommendations: ['Consider scaling operations'],
  };

  beforeEach(async () => {
    // Create mock forecasting engine
    mockForecastingEngine = {
      engineType: 'STATISTICAL',
      version: '2.0.0',
      capabilities: ['FORECASTING', 'TREND_ANALYSIS'],
      generateForecast: jest.fn().mockResolvedValue(mockForecastResult),
      validateModel: jest.fn().mockResolvedValue({
        isValid: true,
        metrics: {
          crossValidationScore: 0.85,
          holdoutScore: 0.82,
          stabilityScore: 0.88,
        },
        recommendations: [],
      }),
      getModelMetrics: jest.fn().mockResolvedValue({
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.88,
        f1Score: 0.85,
        mape: 12.5,
        rmse: 85.2,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedRevenueForecastingService,
        {
          provide: AnalyticsEngineFactory,
          useValue: {
            getForecastingEngine: jest
              .fn()
              .mockReturnValue(mockForecastingEngine),
            getEngineRecommendations: jest.fn().mockReturnValue({
              recommended: 'STATISTICAL',
              alternatives: ['ML'],
              reasoning: 'Good balance of speed and accuracy',
            }),
            healthCheck: jest.fn().mockResolvedValue({
              status: 'healthy',
              engines: { statistical: true, ml: false, overall: true },
              capabilities: ['FORECASTING', 'ANOMALY_DETECTION'],
            }),
          },
        },
        {
          provide: BaseAnalyticsService,
          useValue: {
            // Mock base analytics methods if needed
          },
        },
        {
          provide: AnalyticsAggregationService,
          useValue: {
            aggregateFinancialData: jest
              .fn()
              .mockResolvedValue(mockFinancialData),
          },
        },
      ],
    }).compile();

    service = module.get<EnhancedRevenueForecastingService>(
      EnhancedRevenueForecastingService
    );
    engineFactory = module.get<AnalyticsEngineFactory>(AnalyticsEngineFactory);
    baseAnalyticsService =
      module.get<BaseAnalyticsService>(BaseAnalyticsService);
    aggregationService = module.get<AnalyticsAggregationService>(
      AnalyticsAggregationService
    );
  });

  describe('generateEnhancedForecast', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      organizationId: 'org-1',
    };

    it('should generate enhanced forecast successfully', async () => {
      const result = await service.generateEnhancedForecast('org-1', dateRange);

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(2);
      expect(result.accuracy.mape).toBe(12.5);
      expect(result.insights).toContain('Strong upward trend detected');

      // Verify engine factory was called with correct parameters
      expect(engineFactory.getForecastingEngine).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        false
      );

      // Verify aggregation service was called
      expect(aggregationService.aggregateFinancialData).toHaveBeenCalledWith(
        'org-1',
        dateRange
      );

      // Verify forecasting engine was called
      expect(mockForecastingEngine.generateForecast).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.any(Array),
          timestamps: expect.any(Array),
        }),
        expect.objectContaining({
          method: 'seasonal',
          periods: 6,
          confidence: 0.95,
          includeSeasonality: true,
          zambianContext: true,
        })
      );
    });

    it('should apply Zambian business context when enabled', async () => {
      const options: ForecastingOptions = {
        method: 'linear',
        periods: 6,
        confidence: 0.95,
        includeSeasonality: false,
        zambianContext: true,
      };

      const result = await service.generateEnhancedForecast(
        'org-1',
        dateRange,
        options
      );

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

    it('should not apply Zambian context when disabled', async () => {
      const options: ForecastingOptions = {
        method: 'linear',
        periods: 6,
        confidence: 0.95,
        includeSeasonality: false,
        zambianContext: false,
      };

      const result = await service.generateEnhancedForecast(
        'org-1',
        dateRange,
        options
      );

      // Should return original insights without Zambian context
      expect(result.insights).toEqual(mockForecastResult.insights);
      expect(result.recommendations).toEqual(
        mockForecastResult.recommendations
      );
    });

    it('should handle insufficient data gracefully', async () => {
      // Mock aggregation service to return insufficient data
      jest
        .spyOn(aggregationService, 'aggregateFinancialData')
        .mockResolvedValueOnce({
          invoices: [
            {
              id: 'inv-1',
              organizationId: 'org-1',
              status: 'PAID',
              issueDate: '2024-01-15',
              totalAmount: 1000,
              paidAmount: 1000,
            },
          ],
          payments: [],
          expenses: [],
        });

      await expect(
        service.generateEnhancedForecast('org-1', dateRange)
      ).rejects.toThrow('Insufficient data points for forecasting');
    });

    it('should validate model and handle validation failures', async () => {
      // Mock model validation to fail
      mockForecastingEngine.validateModel.mockResolvedValueOnce({
        isValid: false,
        metrics: {
          crossValidationScore: 0.4,
          holdoutScore: 0.3,
          stabilityScore: 0.5,
        },
        recommendations: ['Increase data quality'],
      });

      const result = await service.generateEnhancedForecast('org-1', dateRange);

      // Should still return forecast but log warning
      expect(result).toBeDefined();
      expect(mockForecastingEngine.validateModel).toHaveBeenCalled();
    });

    it('should convert financial data to time series correctly', async () => {
      await service.generateEnhancedForecast('org-1', dateRange);

      // Verify the time series data passed to the engine
      const callArgs = mockForecastingEngine.generateForecast.mock.calls[0];
      const timeSeriesData = callArgs[0] as TimeSeriesData;

      expect(timeSeriesData.values).toBeDefined();
      expect(timeSeriesData.timestamps).toBeDefined();
      expect(timeSeriesData.values.length).toBe(
        timeSeriesData.timestamps.length
      );
      expect(timeSeriesData.metadata).toBeDefined();
      expect(timeSeriesData.metadata.organizationId).toBe('org-1');
      expect(timeSeriesData.metadata.dataType).toBe('REVENUE');
    });
  });

  describe('getEngineRecommendations', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      organizationId: 'org-1',
    };

    it('should provide engine recommendations based on data characteristics', async () => {
      const recommendations = await service.getEngineRecommendations(
        'org-1',
        dateRange
      );

      expect(recommendations).toBeDefined();
      expect(typeof recommendations.recommended).toBe('string');
      expect(Array.isArray(recommendations.alternatives)).toBe(true);
      expect(typeof recommendations.reasoning).toBe('string');
      expect(recommendations.dataProfile).toBeDefined();

      // Verify data profile contains expected fields
      expect(typeof recommendations.dataProfile.size).toBe('number');
      expect(typeof recommendations.dataProfile.complexity).toBe('number');
      expect(typeof recommendations.dataProfile.quality).toBe('object');
      expect(typeof recommendations.dataProfile.seasonality).toBe('boolean');
    });

    it('should handle errors gracefully', async () => {
      // Mock aggregation service to throw error
      jest
        .spyOn(aggregationService, 'aggregateFinancialData')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.getEngineRecommendations('org-1', dateRange)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('healthCheck', () => {
    it('should return health status for analytics engines', async () => {
      const health = await service.healthCheck();

      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.engines).toBeDefined();
      expect(Array.isArray(health.capabilities)).toBe(true);

      // Verify engine factory health check was called
      expect(engineFactory.healthCheck).toHaveBeenCalled();
    });

    it('should handle health check failures gracefully', async () => {
      // Mock engine factory to throw error
      jest
        .spyOn(engineFactory, 'healthCheck')
        .mockRejectedValueOnce(new Error('Engine factory error'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.engines.statistical).toBe(false);
      expect(health.engines.ml).toBe(false);
      expect(health.engines.overall).toBe(false);
      expect(health.capabilities).toEqual([]);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete forecast generation within 2 seconds', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      const startTime = Date.now();
      const result = await service.generateEnhancedForecast('org-1', dateRange);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle concurrent forecast requests efficiently', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      const startTime = Date.now();

      // Run 3 concurrent forecasts
      const promises = Array.from({ length: 3 }, () =>
        service.generateEnhancedForecast('org-1', dateRange)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalExecutionTime = endTime - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.predictions.length).toBeGreaterThan(0);
      });

      // Should complete all 3 forecasts within reasonable time
      expect(totalExecutionTime).toBeLessThan(4000); // Less than 4 seconds for 3 concurrent
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess data complexity correctly', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      await service.generateEnhancedForecast('org-1', dateRange);

      // Verify engine factory was called with assessed complexity
      expect(engineFactory.getForecastingEngine).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringMatching(/SIMPLE|MODERATE|COMPLEX/),
        false
      );
    });

    it('should handle data quality validation', async () => {
      // Mock data with quality issues
      jest
        .spyOn(aggregationService, 'aggregateFinancialData')
        .mockResolvedValueOnce({
          invoices: [
            {
              id: 'inv-1',
              organizationId: 'org-1',
              status: 'PAID',
              issueDate: '2024-01-15',
              totalAmount: NaN, // Invalid data
              paidAmount: 1000,
            },
          ],
          payments: [],
          expenses: [],
        });

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      await expect(
        service.generateEnhancedForecast('org-1', dateRange)
      ).rejects.toThrow('Invalid data values detected');
    });
  });

  describe('Integration with Existing Infrastructure', () => {
    it('should maintain backward compatibility with existing APIs', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      // Should work with minimal parameters (backward compatibility)
      const result = await service.generateEnhancedForecast('org-1', dateRange);

      expect(result).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should integrate properly with aggregation service', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        organizationId: 'org-1',
      };

      await service.generateEnhancedForecast('org-1', dateRange);

      // Verify proper integration
      expect(aggregationService.aggregateFinancialData).toHaveBeenCalledWith(
        'org-1',
        dateRange
      );
    });
  });
});
