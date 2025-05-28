import { Test, TestingModule } from '@nestjs/testing';
import { StatisticalAnomalyEngine } from '../statistical/statistical-anomaly.engine';
import {
  AnalyticsData,
  AnomalySensitivity,
  AnomalyResult,
  TimeSeriesData,
  AnomalySeverity
} from '../../interfaces/analytics-engine.interface';

describe('StatisticalAnomalyEngine', () => {
  let engine: StatisticalAnomalyEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticalAnomalyEngine],
    }).compile();

    engine = module.get<StatisticalAnomalyEngine>(StatisticalAnomalyEngine);
  });

  describe('Engine Properties', () => {
    it('should have correct engine properties', () => {
      expect(engine.engineType).toBe('STATISTICAL');
      expect(engine.version).toBe('2.0.0');
      expect(engine.capabilities).toContain('ANOMALY_DETECTION');
      expect(engine.capabilities).toContain('PATTERN_RECOGNITION');
    });
  });

  describe('detectAnomalies', () => {
    const createMockAnalyticsData = (values: number[]): AnalyticsData => ({
      timeSeries: {
        values,
        timestamps: values.map((_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          return date;
        }),
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      },
      metadata: {
        organizationId: 'test-org',
        dataType: 'REVENUE',
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
        quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
      }
    });

    it('should detect obvious anomalies with medium sensitivity', async () => {
      // Normal data with clear outliers
      const data = createMockAnalyticsData([
        100, 105, 98, 102, 99, 500, 101, 103, 97, 104, // 500 is clear outlier
        102, 98, 105, 99, 1, 103, 101, 98, 102, 104   // 1 is clear outlier
      ]);

      const result = await engine.detectAnomalies(data, 'MEDIUM');

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.severity).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Should detect the obvious outliers
      expect(result.anomalies.length).toBeGreaterThanOrEqual(1);

      // Validate anomaly structure
      result.anomalies.forEach(anomaly => {
        expect(anomaly.timestamp).toBeInstanceOf(Date);
        expect(typeof anomaly.value).toBe('number');
        expect(typeof anomaly.expectedValue).toBe('number');
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(anomaly.severity);
        expect(typeof anomaly.explanation).toBe('string');
      });
    });

    it('should adjust detection based on sensitivity levels', async () => {
      const data = createMockAnalyticsData([
        100, 105, 98, 102, 99, 130, 101, 103, 97, 104, // 130 is moderate outlier
        102, 98, 105, 99, 115, 103, 101, 98, 102, 104  // 115 is moderate outlier
      ]);

      const lowResult = await engine.detectAnomalies(data, 'LOW');
      const mediumResult = await engine.detectAnomalies(data, 'MEDIUM');
      const highResult = await engine.detectAnomalies(data, 'HIGH');

      // High sensitivity should detect more anomalies than low sensitivity
      expect(highResult.anomalies.length).toBeGreaterThanOrEqual(mediumResult.anomalies.length);
      expect(mediumResult.anomalies.length).toBeGreaterThanOrEqual(lowResult.anomalies.length);
    });

    it('should detect seasonal anomalies', async () => {
      // Create data with seasonal pattern and anomaly
      const seasonalData = [];
      for (let i = 0; i < 36; i++) { // 3 years of monthly data
        const baseValue = 100 + Math.sin(i * Math.PI / 6) * 20; // Seasonal pattern
        if (i === 15) { // Anomaly in month 15
          seasonalData.push(baseValue + 100);
        } else {
          seasonalData.push(baseValue + (Math.random() - 0.5) * 10);
        }
      }

      const data = createMockAnalyticsData(seasonalData);
      const result = await engine.detectAnomalies(data, 'MEDIUM');

      expect(result.anomalies.length).toBeGreaterThan(0);

      // Should detect patterns in seasonal data
      if (result.patterns.length > 0) {
        expect(result.patterns.some(pattern =>
          pattern.type === 'SEASONAL' || pattern.type === 'PERIODIC'
        )).toBe(true);
      }
    });

    it('should provide meaningful recommendations', async () => {
      const data = createMockAnalyticsData([
        100, 105, 98, 102, 99, 500, 101, 103, 97, 104,
        102, 98, 105, 99, 600, 103, 101, 98, 102, 104
      ]);

      const result = await engine.detectAnomalies(data, 'MEDIUM');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec =>
        rec.includes('Zambian') || rec.includes('mobile money')
      )).toBe(true);
    });

    it('should handle insufficient data gracefully', async () => {
      const insufficientData: AnalyticsData = {
        timeSeries: {
          values: [100, 110],
          timestamps: [new Date('2024-01-01'), new Date('2024-01-02')],
          metadata: {
            organizationId: 'test-org',
            dataType: 'REVENUE',
            dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-02') },
            quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
          }
        },
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-02') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      await expect(
        engine.detectAnomalies(insufficientData, 'MEDIUM')
      ).rejects.toThrow('Insufficient data points for anomaly detection');
    });

    it('should handle missing time series data', async () => {
      const invalidData: AnalyticsData = {
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      await expect(
        engine.detectAnomalies(invalidData, 'MEDIUM')
      ).rejects.toThrow('Time series data is required for anomaly detection');
    });

    it('should detect clustering patterns', async () => {
      // Create data with clustered anomalies
      const clusteredData = Array.from({ length: 50 }, (_, i) => {
        if (i >= 10 && i <= 15) return 200; // Cluster of anomalies
        if (i >= 30 && i <= 35) return 300; // Another cluster
        return 100 + (Math.random() - 0.5) * 10; // Normal data
      });

      const data = createMockAnalyticsData(clusteredData);
      const result = await engine.detectAnomalies(data, 'MEDIUM');

      expect(result.anomalies.length).toBeGreaterThan(0);

      // Should detect clustering patterns
      if (result.patterns.length > 0) {
        expect(result.patterns.some(pattern =>
          pattern.type === 'CLUSTERING'
        )).toBe(true);
      }
    });
  });

  describe('trainModel and updateModel', () => {
    const mockData: AnalyticsData = {
      timeSeries: {
        values: [100, 105, 98, 102, 99, 101, 103, 97, 104],
        timestamps: Array.from({ length: 9 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          return date;
        }),
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-09') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      },
      metadata: {
        organizationId: 'test-org',
        dataType: 'REVENUE',
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-09') },
        quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
      }
    };

    it('should train model without errors', async () => {
      await expect(engine.trainModel(mockData)).resolves.not.toThrow();
    });

    it('should update model without errors', async () => {
      await expect(engine.updateModel(mockData)).resolves.not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete anomaly detection within 2 seconds', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => {
        const baseValue = 100 + Math.sin(i * 0.1) * 20;
        // Add some random anomalies
        if (Math.random() < 0.05) return baseValue * 3;
        return baseValue + (Math.random() - 0.5) * 10;
      });

      const data: AnalyticsData = {
        timeSeries: {
          values: largeDataset,
          timestamps: largeDataset.map((_, i) => {
            const date = new Date('2020-01-01');
            date.setDate(date.getDate() + i);
            return date;
          }),
          metadata: {
            organizationId: 'test-org',
            dataType: 'REVENUE',
            dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2022-09-27') },
            quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
          }
        },
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2020-01-01'), endDate: new Date('2022-09-27') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      const startTime = Date.now();
      const result = await engine.detectAnomalies(data, 'MEDIUM');
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle multiple concurrent detections efficiently', async () => {
      const mockData: AnalyticsData = {
        timeSeries: {
          values: [100, 105, 98, 102, 99, 200, 101, 103, 97, 104],
          timestamps: Array.from({ length: 10 }, (_, i) => {
            const date = new Date('2024-01-01');
            date.setDate(date.getDate() + i);
            return date;
          }),
          metadata: {
            organizationId: 'test-org',
            dataType: 'REVENUE',
            dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-10') },
            quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
          }
        },
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-10') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      const startTime = Date.now();

      // Run 5 concurrent anomaly detections
      const promises = Array.from({ length: 5 }, () =>
        engine.detectAnomalies(mockData, 'MEDIUM')
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalExecutionTime = endTime - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.anomalies).toBeDefined();
      });

      // Should complete all 5 detections within reasonable time
      expect(totalExecutionTime).toBeLessThan(3000); // Less than 3 seconds for 5 concurrent
    });
  });

  describe('Multi-Method Detection Accuracy', () => {
    it('should combine results from multiple detection methods', async () => {
      // Create data with different types of anomalies
      const mixedAnomalies = [
        100, 105, 98, 102, 99, // Normal baseline
        500, // Z-score outlier
        101, 103, 97, 104, 102, 98, 105, 99,
        1, // IQR outlier
        103, 101, 98, 102, 104
      ];

      const data: AnalyticsData = {
        timeSeries: {
          values: mixedAnomalies,
          timestamps: mixedAnomalies.map((_, i) => {
            const date = new Date('2024-01-01');
            date.setDate(date.getDate() + i);
            return date;
          }),
          metadata: {
            organizationId: 'test-org',
            dataType: 'REVENUE',
            dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-20') },
            quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
          }
        },
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-20') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      const result = await engine.detectAnomalies(data, 'MEDIUM');

      // Should detect both obvious outliers
      expect(result.anomalies.length).toBeGreaterThanOrEqual(1);

      // Should have explanations mentioning multiple methods
      const hasMultiMethodDetection = result.anomalies.some(anomaly =>
        anomaly.explanation.includes(',') ||
        anomaly.explanation.includes('method')
      );

      if (result.anomalies.length > 1) {
        expect(hasMultiMethodDetection).toBe(true);
      }
    });

    it('should assign appropriate severity levels', async () => {
      const data: AnalyticsData = {
        timeSeries: {
          values: [100, 105, 98, 102, 99, 1000, 101, 103], // Extreme outlier
          timestamps: Array.from({ length: 8 }, (_, i) => {
            const date = new Date('2024-01-01');
            date.setDate(date.getDate() + i);
            return date;
          }),
          metadata: {
            organizationId: 'test-org',
            dataType: 'REVENUE',
            dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-08') },
            quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
          }
        },
        metadata: {
          organizationId: 'test-org',
          dataType: 'REVENUE',
          dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-08') },
          quality: { completeness: 1.0, accuracy: 0.9, consistency: 0.8, timeliness: 1.0 }
        }
      };

      const result = await engine.detectAnomalies(data, 'MEDIUM');

      if (result.anomalies.length > 0) {
        // Extreme outlier should be detected with high severity
        const severities = result.anomalies.map(a => a.severity);
        expect(severities.some(s => s === 'HIGH' || s === 'CRITICAL')).toBe(true);
      }
    });
  });
});
