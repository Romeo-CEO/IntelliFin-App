import { Injectable, Logger } from '@nestjs/common';
import { 
  IForecastingEngine, 
  IAnomalyDetectionEngine, 
  IPredictiveEngine,
  AnalyticsCapability 
} from '../interfaces/analytics-engine.interface';

// Current Statistical Engines
import { StatisticalForecastingEngine } from './statistical/statistical-forecasting.engine';
import { StatisticalAnomalyEngine } from './statistical/statistical-anomaly.engine';

// Future ML Engines (interfaces ready)
// import { MLForecastingEngine } from './ml/ml-forecasting.engine';
// import { MLAnomalyEngine } from './ml/ml-anomaly.engine';
// import { MLPredictiveEngine } from './ml/ml-predictive.engine';

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
  
  constructor() {
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
    
    // MVP: Use statistical engine
    if (!preferML || dataSize < 100) {
      this.logger.log('Using Statistical Forecasting Engine');
      return new StatisticalForecastingEngine();
    }
    
    // Future: ML engine selection logic
    // if (dataSize > 1000 && complexity === 'COMPLEX') {
    //   return new MLForecastingEngine();
    // }
    
    // Fallback to statistical
    this.logger.log('Falling back to Statistical Forecasting Engine');
    return new StatisticalForecastingEngine();
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
    
    // MVP: Use statistical engine
    if (!preferML || dataCharacteristics.size < 200) {
      this.logger.log('Using Statistical Anomaly Detection Engine');
      return new StatisticalAnomalyEngine();
    }
    
    // Future: ML engine for complex patterns
    // if (dataCharacteristics.dimensions > 5 || dataCharacteristics.hasSeasonality) {
    //   return new MLAnomalyEngine();
    // }
    
    this.logger.log('Falling back to Statistical Anomaly Detection Engine');
    return new StatisticalAnomalyEngine();
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
    return [
      'FORECASTING',
      'ANOMALY_DETECTION',
      'TREND_ANALYSIS',
      // Future capabilities will be added here
      // 'PATTERN_RECOGNITION',
      // 'PREDICTIVE_MODELING',
      // 'RISK_ASSESSMENT'
    ];
  }

  /**
   * Check if ML engines are available
   */
  isMLAvailable(): boolean {
    // Future: Check for ML dependencies and models
    return false;
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
    
    if (dataProfile.size < 50) {
      return {
        recommended: 'STATISTICAL',
        alternatives: [],
        reasoning: 'Insufficient data for ML approaches'
      };
    }
    
    if (dataProfile.accuracy_requirements > 0.9 && dataProfile.size > 500) {
      return {
        recommended: 'ML',
        alternatives: ['STATISTICAL'],
        reasoning: 'High accuracy requirements with sufficient data favor ML'
      };
    }
    
    return {
      recommended: 'STATISTICAL',
      alternatives: ['ML'],
      reasoning: 'Statistical methods provide good balance of speed and accuracy'
    };
  }

  /**
   * Initialize engine registry
   */
  private initializeEngines(): void {
    // Register current engines
    this.engineRegistry.set('statistical-forecasting', StatisticalForecastingEngine);
    this.engineRegistry.set('statistical-anomaly', StatisticalAnomalyEngine);
    
    // Future: Register ML engines
    // this.engineRegistry.set('ml-forecasting', MLForecastingEngine);
    // this.engineRegistry.set('ml-anomaly', MLAnomalyEngine);
    
    this.logger.log(`Initialized ${this.engineRegistry.size} analytics engines`);
  }

  /**
   * Health check for all engines
   */
  async healthCheck(): Promise<{
    statistical: boolean;
    ml: boolean;
    overall: boolean;
  }> {
    const statistical = true; // Always available
    const ml = this.isMLAvailable();
    
    return {
      statistical,
      ml,
      overall: statistical || ml
    };
  }
}
