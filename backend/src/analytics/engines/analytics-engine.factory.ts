import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyticsCapability,
  IAnomalyDetectionEngine,
  IForecastingEngine,
  IPredictiveEngine,
} from '../interfaces/analytics-engine.interface';

// Current Statistical Engines
import { StatisticalForecastingEngine } from './statistical/statistical-forecasting.engine';
import { StatisticalAnomalyEngine } from './statistical/statistical-anomaly.engine';

// Future ML Engines (interfaces ready)
// import { MLForecastingEngine } from './ml/ml-forecasting.engine';
// import { MLAnomalyEngine } from './ml/ml-anomaly.engine';
// import { MLPredictiveEngine } from './ml/ml-predictive.engine';

import { AnalyticsConfigService } from '../config/analytics.config';

/**
 * Analytics Engine Factory
 *
 * Provides centralized engine selection and management for seamless
 * transition from statistical to ML implementations
 */
@Injectable()
export class AnalyticsEngineFactory {
  private readonly logger = new Logger(AnalyticsEngineFactory.name);

  // Engine registry for future dynamic loading
  private readonly engineRegistry = new Map<string, any>();

  // Configuration properties (can be loaded from a config service)
  // private mlDataSizeThreshold = 100;
  // private mlAnomalySizeThreshold = 200;
  // private mlAnomalyDimensionThreshold = 5;

  constructor(private readonly analyticsConfigService: AnalyticsConfigService) {
    this.initializeEngines();
  }

  /**
   * Get forecasting engine based on configuration and data characteristics
   */
  getForecastingEngine(
    dataSize: number,
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' = 'SIMPLE',
    preferML: boolean = false
  ): IForecastingEngine {
    // Determine if ML is preferred and available for this data size
    const mlConfig = this.analyticsConfigService.getMLReadinessConfig();
    const useMLEngine =
      preferML && mlConfig.enabled && dataSize >= mlConfig.minDataPoints;

    if (useMLEngine) {
      // Future: Implement more sophisticated ML engine selection based on complexity
      // For now, attempt to get a generic ML forecasting engine if available
      const MLEngine = this.engineRegistry.get('ml-forecasting');
      if (MLEngine) {
        this.logger.log('Using ML Forecasting Engine (Placeholder)');
        // TODO: Instantiate ML engine with necessary dependencies
        // return new MLEngine();
      }
    }

    // Default or fallback to statistical engine
    this.logger.log('Using Statistical Forecasting Engine');
    const StatisticalEngine = this.engineRegistry.get(
      'statistical-forecasting'
    );
    if (!StatisticalEngine) {
      throw new Error('Statistical Forecasting Engine not registered');
    }
    return new StatisticalEngine();
  }

  /**
   * Get anomaly detection engine
   */
  getAnomalyDetectionEngine(
    dataCharacteristics: {
      size: number;
      dimensions: number;
      hasSeasonality: boolean;
    },
    preferML: boolean = false
  ): IAnomalyDetectionEngine {
    // Determine if ML is preferred and available for these data characteristics
    const mlConfig = this.analyticsConfigService.getMLReadinessConfig();
    const useMLEngine =
      preferML &&
      mlConfig.enabled &&
      dataCharacteristics.size >=
        this.analyticsConfigService.config.minDataPointsForML; // Using direct config access for now
    // TODO: Add dimension threshold from config when available
    // && dataCharacteristics.dimensions >= this.analyticsConfigService.config.mlAnomalyDimensionThreshold;

    if (useMLEngine) {
      // Future: Implement more sophisticated ML engine selection
      // For now, attempt to get a generic ML anomaly engine if available
      const MLEngine = this.engineRegistry.get('ml-anomaly');
      if (MLEngine) {
        this.logger.log('Using ML Anomaly Detection Engine (Placeholder)');
        // TODO: Instantiate ML engine with necessary dependencies
        // return new MLEngine();
      }
    }

    // Default or fallback to statistical engine
    this.logger.log('Using Statistical Anomaly Detection Engine');
    const StatisticalEngine = this.engineRegistry.get('statistical-anomaly');
    if (!StatisticalEngine) {
      throw new Error('Statistical Anomaly Detection Engine not registered');
    }
    return new StatisticalEngine();
  }

  /**
   * Get predictive engine (Future implementation)
   */
  getPredictiveEngine(
    useCase: 'CUSTOMER_BEHAVIOR' | 'CASH_FLOW' | 'RISK_ASSESSMENT'
  ): IPredictiveEngine {
    // Future: ML-based predictive engines
    // switch (useCase) {
    //   case 'CUSTOMER_BEHAVIOR':
    //     return new CustomerBehaviorPredictiveEngine();
    //   case 'CASH_FLOW':
    //     return new CashFlowPredictiveEngine();
    //   case 'RISK_ASSESSMENT':
    //     return new RiskAssessmentPredictiveEngine();
    // }

    throw new Error(`Predictive engine for ${useCase} not yet implemented`);
  }

  /**
   * Get available capabilities for current configuration
   */
  getAvailableCapabilities(): AnalyticsCapability[] {
    // Capabilities based on registered engines
    const capabilities: AnalyticsCapability[] = [];
    if (
      this.engineRegistry.has('statistical-forecasting') ||
      (this.engineRegistry.has('ml-forecasting') && this.isMLAvailable())
    )
      capabilities.push('FORECASTING');
    if (
      this.engineRegistry.has('statistical-anomaly') ||
      (this.engineRegistry.has('ml-anomaly') && this.isMLAvailable())
    )
      capabilities.push('ANOMALY_DETECTION');
    // Add other capabilities as corresponding engines are added
    // if (this.engineRegistry.has('statistical-trend') || (this.engineRegistry.has('ml-trend') && this.isMLAvailable())) capabilities.push('TREND_ANALYSIS');
    // if (this.engineRegistry.has('ml-pattern-recognition') && this.isMLAvailable()) capabilities.push('PATTERN_RECOGNITION');
    // if (this.engineRegistry.has('ml-predictive') && this.isMLAvailable()) capabilities.push('PREDICTIVE_MODELING');
    // if (this.engineRegistry.has('ml-risk') && this.isMLAvailable()) capabilities.push('RISK_ASSESSMENT');

    return capabilities;
  }

  /**
   * Check if ML engines are available based on configuration
   */
  isMLAvailable(): boolean {
    const mlConfig = this.analyticsConfigService.getMLReadinessConfig();
    return mlConfig.enabled; // Rely on the configuration flag
  }

  /**
   * Get engine recommendations based on data characteristics
   */
  getEngineRecommendations(dataProfile: {
    size: number;
    complexity: number;
    accuracy_requirements: number;
    performance_requirements: number;
  }): {
    recommended: string;
    alternatives: string[];
    reasoning: string;
  } {
    const mlConfig = this.analyticsConfigService.getMLReadinessConfig();
    const mlDataSizeThreshold = mlConfig.minDataPoints; // Use configured threshold

    if (dataProfile.size < mlDataSizeThreshold) {
      return {
        recommended: 'STATISTICAL',
        alternatives: [],
        reasoning: `Insufficient data (${dataProfile.size} < ${mlDataSizeThreshold}) for ML approaches`,
      };
    }

    if (dataProfile.accuracy_requirements > 0.8 && this.isMLAvailable()) {
      // Assuming >0.8 accuracy requirement favors ML if available
      return {
        recommended: 'ML',
        alternatives: ['STATISTICAL'],
        reasoning: 'High accuracy requirements favor ML where available',
      };
    }

    // Default recommendation
    return {
      recommended: 'STATISTICAL',
      alternatives: this.isMLAvailable() ? ['ML'] : [],
      reasoning:
        'Statistical methods provide a good balance of speed and accuracy for typical data',
    };
  }

  /**
   * Initialize engine registry
   */
  private initializeEngines(): void {
    // Register current engines
    this.engineRegistry.set(
      'statistical-forecasting',
      StatisticalForecastingEngine
    );
    this.engineRegistry.set('statistical-anomaly', StatisticalAnomalyEngine);

    // Future: Register ML engines (commented out as not yet fully implemented)
    // this.engineRegistry.set('ml-forecasting', MLForecastingEngine);
    // this.engineRegistry.set('ml-anomaly', MLAnomalyEngine);
    // this.engineRegistry.set('ml-predictive', MLPredictiveEngine);

    this.logger.log(
      `Initialized ${this.engineRegistry.size} analytics engines`
    );
  }

  /**
   * Health check for all engines
   */
  async healthCheck(): Promise<{
    statistical: boolean;
    ml: boolean;
    overall: boolean;
  }> {
    const statisticalAvailable =
      this.engineRegistry.has('statistical-forecasting') &&
      this.engineRegistry.has('statistical-anomaly');
    const mlAvailable = this.isMLAvailable(); // Relies on isMLAvailable logic

    return {
      statistical: statisticalAvailable,
      ml: mlAvailable,
      overall: statisticalAvailable || mlAvailable,
    };
  }
}
