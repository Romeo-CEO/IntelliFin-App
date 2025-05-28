import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsEngineFactory } from '../analytics-engine.factory';
import { StatisticalForecastingEngine } from '../statistical/statistical-forecasting.engine';
import { StatisticalAnomalyEngine } from '../statistical/statistical-anomaly.engine';
import {
  IForecastingEngine,
  IAnomalyDetectionEngine,
  AnalyticsCapability
} from '../../interfaces/analytics-engine.interface';

describe('AnalyticsEngineFactory', () => {
  let factory: AnalyticsEngineFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsEngineFactory],
    }).compile();

    factory = module.get<AnalyticsEngineFactory>(AnalyticsEngineFactory);
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(factory).toBeDefined();
    });

    it('should initialize engine registry', () => {
      // Factory should initialize without errors
      expect(() => new AnalyticsEngineFactory()).not.toThrow();
    });
  });

  describe('getForecastingEngine', () => {
    it('should return statistical engine for small datasets', () => {
      const engine = factory.getForecastingEngine(50, 'SIMPLE', false);

      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
      expect(engine.engineType).toBe('STATISTICAL');
      expect(engine.capabilities).toContain('FORECASTING');
    });

    it('should return statistical engine for moderate complexity', () => {
      const engine = factory.getForecastingEngine(100, 'MODERATE', false);

      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
      expect(engine.engineType).toBe('STATISTICAL');
    });

    it('should return statistical engine for complex data when ML not preferred', () => {
      const engine = factory.getForecastingEngine(500, 'COMPLEX', false);

      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
      expect(engine.engineType).toBe('STATISTICAL');
    });

    it('should fallback to statistical engine when ML preferred but data insufficient', () => {
      const engine = factory.getForecastingEngine(50, 'SIMPLE', true);

      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
      expect(engine.engineType).toBe('STATISTICAL');
    });

    it('should return consistent engines for same parameters', () => {
      const engine1 = factory.getForecastingEngine(100, 'MODERATE', false);
      const engine2 = factory.getForecastingEngine(100, 'MODERATE', false);

      expect(engine1.engineType).toBe(engine2.engineType);
      expect(engine1.version).toBe(engine2.version);
    });

    it('should handle edge cases gracefully', () => {
      // Very small dataset
      const smallEngine = factory.getForecastingEngine(1, 'SIMPLE', false);
      expect(smallEngine).toBeInstanceOf(StatisticalForecastingEngine);

      // Very large dataset
      const largeEngine = factory.getForecastingEngine(10000, 'COMPLEX', false);
      expect(largeEngine).toBeInstanceOf(StatisticalForecastingEngine);
    });
  });

  describe('getAnomalyDetectionEngine', () => {
    it('should return statistical engine for small datasets', () => {
      const engine = factory.getAnomalyDetectionEngine({
        size: 50,
        dimensions: 1,
        hasSeasonality: false
      }, false);

      expect(engine).toBeInstanceOf(StatisticalAnomalyEngine);
      expect(engine.engineType).toBe('STATISTICAL');
      expect(engine.capabilities).toContain('ANOMALY_DETECTION');
    });

    it('should return statistical engine for multi-dimensional data', () => {
      const engine = factory.getAnomalyDetectionEngine({
        size: 200,
        dimensions: 5,
        hasSeasonality: true
      }, false);

      expect(engine).toBeInstanceOf(StatisticalAnomalyEngine);
      expect(engine.engineType).toBe('STATISTICAL');
    });

    it('should fallback to statistical engine when ML preferred but data insufficient', () => {
      const engine = factory.getAnomalyDetectionEngine({
        size: 100,
        dimensions: 2,
        hasSeasonality: false
      }, true);

      expect(engine).toBeInstanceOf(StatisticalAnomalyEngine);
      expect(engine.engineType).toBe('STATISTICAL');
    });

    it('should handle seasonal data appropriately', () => {
      const engine = factory.getAnomalyDetectionEngine({
        size: 300,
        dimensions: 1,
        hasSeasonality: true
      }, false);

      expect(engine).toBeInstanceOf(StatisticalAnomalyEngine);
      expect(engine.capabilities).toContain('PATTERN_RECOGNITION');
    });
  });

  describe('getPredictiveEngine', () => {
    it('should throw error for customer behavior prediction (not yet implemented)', () => {
      expect(() => {
        factory.getPredictiveEngine('CUSTOMER_BEHAVIOR');
      }).toThrow('Predictive engine for CUSTOMER_BEHAVIOR not yet implemented');
    });

    it('should throw error for cash flow prediction (not yet implemented)', () => {
      expect(() => {
        factory.getPredictiveEngine('CASH_FLOW');
      }).toThrow('Predictive engine for CASH_FLOW not yet implemented');
    });

    it('should throw error for risk assessment (not yet implemented)', () => {
      expect(() => {
        factory.getPredictiveEngine('RISK_ASSESSMENT');
      }).toThrow('Predictive engine for RISK_ASSESSMENT not yet implemented');
    });
  });

  describe('getAvailableCapabilities', () => {
    it('should return current available capabilities', () => {
      const capabilities = factory.getAvailableCapabilities();

      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities).toContain('FORECASTING');
      expect(capabilities).toContain('ANOMALY_DETECTION');
      expect(capabilities).toContain('TREND_ANALYSIS');

      // Future capabilities should not be available yet
      expect(capabilities).not.toContain('PREDICTIVE_MODELING');
      expect(capabilities).not.toContain('RISK_ASSESSMENT');
    });

    it('should return consistent capabilities across calls', () => {
      const capabilities1 = factory.getAvailableCapabilities();
      const capabilities2 = factory.getAvailableCapabilities();

      expect(capabilities1).toEqual(capabilities2);
    });
  });

  describe('isMLAvailable', () => {
    it('should return false for current implementation', () => {
      const isAvailable = factory.isMLAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('getEngineRecommendations', () => {
    it('should recommend statistical for insufficient data', () => {
      const recommendations = factory.getEngineRecommendations({
        size: 30,
        complexity: 0.5,
        accuracy_requirements: 0.8,
        performance_requirements: 0.9
      });

      expect(recommendations.recommended).toBe('STATISTICAL');
      expect(recommendations.reasoning).toContain('Insufficient data');
      expect(Array.isArray(recommendations.alternatives)).toBe(true);
    });

    it('should recommend ML for high accuracy requirements with sufficient data', () => {
      const recommendations = factory.getEngineRecommendations({
        size: 1000,
        complexity: 0.8,
        accuracy_requirements: 0.95,
        performance_requirements: 0.8
      });

      expect(recommendations.recommended).toBe('ML');
      expect(recommendations.alternatives).toContain('STATISTICAL');
      expect(recommendations.reasoning).toContain('High accuracy requirements');
    });

    it('should recommend statistical for balanced requirements', () => {
      const recommendations = factory.getEngineRecommendations({
        size: 200,
        complexity: 0.5,
        accuracy_requirements: 0.8,
        performance_requirements: 0.9
      });

      expect(recommendations.recommended).toBe('STATISTICAL');
      expect(recommendations.reasoning).toContain('good balance');
    });

    it('should provide meaningful reasoning for all recommendations', () => {
      const testCases = [
        { size: 10, complexity: 0.2, accuracy_requirements: 0.7, performance_requirements: 0.9 },
        { size: 100, complexity: 0.6, accuracy_requirements: 0.85, performance_requirements: 0.8 },
        { size: 1000, complexity: 0.9, accuracy_requirements: 0.95, performance_requirements: 0.7 }
      ];

      testCases.forEach(testCase => {
        const recommendations = factory.getEngineRecommendations(testCase);

        expect(typeof recommendations.recommended).toBe('string');
        expect(Array.isArray(recommendations.alternatives)).toBe(true);
        expect(typeof recommendations.reasoning).toBe('string');
        expect(recommendations.reasoning.length).toBeGreaterThan(10);
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all engines', async () => {
      const health = await factory.healthCheck();

      expect(health).toBeDefined();
      expect(typeof health.statistical).toBe('boolean');
      expect(typeof health.ml).toBe('boolean');
      expect(typeof health.overall).toBe('boolean');

      // Statistical should always be available
      expect(health.statistical).toBe(true);

      // ML should not be available in current implementation
      expect(health.ml).toBe(false);

      // Overall should be true if statistical is available
      expect(health.overall).toBe(true);
    });

    it('should complete health check quickly', async () => {
      const startTime = Date.now();
      const health = await factory.healthCheck();
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(health).toBeDefined();
      expect(executionTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Engine Selection Logic', () => {
    it('should select appropriate engines based on data characteristics', () => {
      const testCases = [
        {
          description: 'Small simple dataset',
          dataSize: 20,
          complexity: 'SIMPLE' as const,
          expectedEngine: 'STATISTICAL'
        },
        {
          description: 'Medium complex dataset',
          dataSize: 150,
          complexity: 'MODERATE' as const,
          expectedEngine: 'STATISTICAL'
        },
        {
          description: 'Large complex dataset',
          dataSize: 1000,
          complexity: 'COMPLEX' as const,
          expectedEngine: 'STATISTICAL' // Falls back to statistical in current implementation
        }
      ];

      testCases.forEach(testCase => {
        const engine = factory.getForecastingEngine(
          testCase.dataSize,
          testCase.complexity,
          false
        );

        expect(engine.engineType).toBe(testCase.expectedEngine);
      });
    });

    it('should handle concurrent engine requests efficiently', () => {
      const startTime = Date.now();

      // Request multiple engines concurrently
      const engines = Array.from({ length: 10 }, (_, i) =>
        factory.getForecastingEngine(100 + i * 10, 'MODERATE', false)
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(engines).toHaveLength(10);
      engines.forEach(engine => {
        expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
      });

      // Should be very fast for engine creation
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Future ML Integration Preparation', () => {
    it('should have interface ready for ML engines', () => {
      // Test that the factory can handle ML preference
      const engine = factory.getForecastingEngine(1000, 'COMPLEX', true);

      // Should fallback gracefully to statistical
      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
    });

    it('should provide ML readiness indicators', () => {
      const isMLAvailable = factory.isMLAvailable();
      const capabilities = factory.getAvailableCapabilities();

      expect(typeof isMLAvailable).toBe('boolean');
      expect(Array.isArray(capabilities)).toBe(true);

      // Current state should indicate ML not available
      expect(isMLAvailable).toBe(false);
    });

    it('should handle ML engine requests gracefully', () => {
      // Test anomaly detection with ML preference
      const anomalyEngine = factory.getAnomalyDetectionEngine({
        size: 1000,
        dimensions: 10,
        hasSeasonality: true
      }, true);

      // Should fallback to statistical
      expect(anomalyEngine).toBeInstanceOf(StatisticalAnomalyEngine);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle zero data size gracefully', () => {
      const engine = factory.getForecastingEngine(0, 'SIMPLE', false);
      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
    });

    it('should handle negative data size gracefully', () => {
      const engine = factory.getForecastingEngine(-10, 'SIMPLE', false);
      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
    });

    it('should handle extreme data sizes', () => {
      const largeEngine = factory.getForecastingEngine(1000000, 'COMPLEX', false);
      expect(largeEngine).toBeInstanceOf(StatisticalForecastingEngine);
    });

    it('should handle invalid complexity levels gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const engine = factory.getForecastingEngine(100, 'INVALID' as any, false);
      expect(engine).toBeInstanceOf(StatisticalForecastingEngine);
    });
  });
});
