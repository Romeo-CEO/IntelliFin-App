import { registerAs } from '@nestjs/config';

export interface AnalyticsConfig {
  // Engine Selection
  defaultEngine: 'STATISTICAL' | 'ML' | 'HYBRID';
  enableMLEngines: boolean;
  autoEngineSelection: boolean;

  // Performance Settings
  maxDataPoints: number;
  cacheEnabled: boolean;
  cacheTTL: number;

  // Forecasting Settings
  defaultForecastPeriods: number;
  maxForecastPeriods: number;
  defaultConfidence: number;
  enableSeasonality: boolean;

  // Anomaly Detection
  defaultSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  anomalyThreshold: number;

  // Zambian Context
  zambianMarketFactors: boolean;
  currencyAdjustments: boolean;
  seasonalPatterns: string[];

  // AI/ML Preparation
  mlModelPath: string;
  tensorflowEnabled: boolean;
  modelTrainingEnabled: boolean;

  // Data Quality
  minDataPointsForML: number;
  dataQualityThreshold: number;
  outlierDetection: boolean;

  // Performance Monitoring
  enableMetrics: boolean;
  performanceLogging: boolean;
  accuracyTracking: boolean;
}

export const analyticsConfig = registerAs(
  'analytics',
  (): AnalyticsConfig => ({
    // Engine Selection
    defaultEngine:
      process.env.ANALYTICS_DEFAULT_ENGINE === 'STATISTICAL' ||
      process.env.ANALYTICS_DEFAULT_ENGINE === 'ML' ||
      process.env.ANALYTICS_DEFAULT_ENGINE === 'HYBRID'
        ? process.env.ANALYTICS_DEFAULT_ENGINE
        : 'STATISTICAL',
    enableMLEngines: process.env.ANALYTICS_ENABLE_ML === 'true',
    autoEngineSelection:
      process.env.ANALYTICS_AUTO_ENGINE_SELECTION !== 'false',

    // Performance Settings
    maxDataPoints: parseInt(
      process.env.ANALYTICS_MAX_DATA_POINTS || '10000',
      10
    ),
    cacheEnabled: process.env.ANALYTICS_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.ANALYTICS_CACHE_TTL || '3600', 10), // 1 hour

    // Forecasting Settings
    defaultForecastPeriods: parseInt(
      process.env.ANALYTICS_DEFAULT_FORECAST_PERIODS || '6',
      10
    ),
    maxForecastPeriods: parseInt(
      process.env.ANALYTICS_MAX_FORECAST_PERIODS || '24',
      10
    ),
    defaultConfidence: parseFloat(
      process.env.ANALYTICS_DEFAULT_CONFIDENCE || '0.95'
    ),
    enableSeasonality: process.env.ANALYTICS_ENABLE_SEASONALITY !== 'false',

    // Anomaly Detection
    defaultSensitivity:
      process.env.ANALYTICS_DEFAULT_SENSITIVITY === 'LOW' ||
      process.env.ANALYTICS_DEFAULT_SENSITIVITY === 'MEDIUM' ||
      process.env.ANALYTICS_DEFAULT_SENSITIVITY === 'HIGH'
        ? process.env.ANALYTICS_DEFAULT_SENSITIVITY
        : 'MEDIUM',
    anomalyThreshold: parseFloat(
      process.env.ANALYTICS_ANOMALY_THRESHOLD || '2.5'
    ),

    // Zambian Context
    zambianMarketFactors: process.env.ANALYTICS_ZAMBIAN_FACTORS !== 'false',
    currencyAdjustments: process.env.ANALYTICS_CURRENCY_ADJUSTMENTS !== 'false',
    seasonalPatterns: (
      process.env.ANALYTICS_SEASONAL_PATTERNS || 'rainy,dry,harvest'
    ).split(','),

    // AI/ML Preparation
    mlModelPath: process.env.ANALYTICS_ML_MODEL_PATH || './models',
    tensorflowEnabled: process.env.ANALYTICS_TENSORFLOW_ENABLED === 'true',
    modelTrainingEnabled:
      process.env.ANALYTICS_MODEL_TRAINING_ENABLED === 'true',

    // Data Quality
    minDataPointsForML: parseInt(
      process.env.ANALYTICS_MIN_DATA_POINTS_ML || '100',
      10
    ),
    dataQualityThreshold: parseFloat(
      process.env.ANALYTICS_DATA_QUALITY_THRESHOLD || '0.8'
    ),
    outlierDetection: process.env.ANALYTICS_OUTLIER_DETECTION !== 'false',

    // Performance Monitoring
    enableMetrics: process.env.ANALYTICS_ENABLE_METRICS !== 'false',
    performanceLogging: process.env.ANALYTICS_PERFORMANCE_LOGGING === 'true',
    accuracyTracking: process.env.ANALYTICS_ACCURACY_TRACKING !== 'false',
  })
);

/**
 * Analytics Configuration Service
 *
 * Provides centralized configuration management for analytics engines
 * and prepares for future AI/ML integration
 */
export class AnalyticsConfigService {
  constructor(private readonly config: AnalyticsConfig) {}

  /**
   * Get engine selection criteria
   */
  getEngineSelectionCriteria(): {
    dataThreshold: number;
    complexityThreshold: number;
    accuracyRequirement: number;
  } {
    return {
      dataThreshold: this.config.minDataPointsForML,
      complexityThreshold: 0.7,
      accuracyRequirement: 0.85,
    };
  }

  /**
   * Get forecasting configuration
   */
  getForecastingConfig(): {
    defaultPeriods: number;
    maxPeriods: number;
    confidence: number;
    seasonality: boolean;
  } {
    return {
      defaultPeriods: this.config.defaultForecastPeriods,
      maxPeriods: this.config.maxForecastPeriods,
      confidence: this.config.defaultConfidence,
      seasonality: this.config.enableSeasonality,
    };
  }

  /**
   * Get Zambian market configuration
   */
  getZambianMarketConfig(): {
    enabled: boolean;
    seasonalPatterns: string[];
    currencyAdjustments: boolean;
  } {
    return {
      enabled: this.config.zambianMarketFactors,
      seasonalPatterns: this.config.seasonalPatterns,
      currencyAdjustments: this.config.currencyAdjustments,
    };
  }

  /**
   * Get ML readiness configuration
   */
  getMLReadinessConfig(): {
    enabled: boolean;
    modelPath: string;
    trainingEnabled: boolean;
    minDataPoints: number;
  } {
    return {
      enabled: this.config.enableMLEngines,
      modelPath: this.config.mlModelPath,
      trainingEnabled: this.config.modelTrainingEnabled,
      minDataPoints: this.config.minDataPointsForML,
    };
  }

  /**
   * Check if ML engines should be used
   */
  shouldUseMLEngine(dataSize: number, complexity: number): boolean {
    if (!this.config.enableMLEngines) return false;
    if (dataSize < this.config.minDataPointsForML) return false;
    if (!this.config.autoEngineSelection) return false;

    return complexity > 0.7 && dataSize > this.config.minDataPointsForML;
  }

  /**
   * Get performance monitoring configuration
   */
  getPerformanceConfig(): {
    metricsEnabled: boolean;
    loggingEnabled: boolean;
    accuracyTracking: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  } {
    return {
      metricsEnabled: this.config.enableMetrics,
      loggingEnabled: this.config.performanceLogging,
      accuracyTracking: this.config.accuracyTracking,
      cacheEnabled: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL,
    };
  }

  /**
   * Get data quality requirements
   */
  getDataQualityConfig(): {
    threshold: number;
    outlierDetection: boolean;
    minDataPoints: number;
  } {
    return {
      threshold: this.config.dataQualityThreshold,
      outlierDetection: this.config.outlierDetection,
      minDataPoints: this.config.minDataPointsForML,
    };
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic settings
    if (
      this.config.defaultConfidence < 0.5 ||
      this.config.defaultConfidence > 0.99
    ) {
      errors.push('Default confidence must be between 0.5 and 0.99');
    }

    if (this.config.defaultForecastPeriods > this.config.maxForecastPeriods) {
      errors.push('Default forecast periods cannot exceed maximum');
    }

    if (this.config.minDataPointsForML < 50) {
      warnings.push(
        'Minimum data points for ML is quite low - consider increasing'
      );
    }

    // Validate ML settings
    if (this.config.enableMLEngines && !this.config.tensorflowEnabled) {
      warnings.push('ML engines enabled but TensorFlow is disabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Default environment configuration for development
 */
export const defaultAnalyticsEnvConfig = {
  // Engine Selection
  ANALYTICS_DEFAULT_ENGINE: 'STATISTICAL',
  ANALYTICS_ENABLE_ML: 'false',
  ANALYTICS_AUTO_ENGINE_SELECTION: 'true',

  // Performance
  ANALYTICS_MAX_DATA_POINTS: '10000',
  ANALYTICS_CACHE_ENABLED: 'true',
  ANALYTICS_CACHE_TTL: '3600',

  // Forecasting
  ANALYTICS_DEFAULT_FORECAST_PERIODS: '6',
  ANALYTICS_MAX_FORECAST_PERIODS: '24',
  ANALYTICS_DEFAULT_CONFIDENCE: '0.95',
  ANALYTICS_ENABLE_SEASONALITY: 'true',

  // Zambian Context
  ANALYTICS_ZAMBIAN_FACTORS: 'true',
  ANALYTICS_CURRENCY_ADJUSTMENTS: 'true',
  ANALYTICS_SEASONAL_PATTERNS: 'rainy,dry,harvest',

  // AI/ML Preparation (disabled for MVP)
  ANALYTICS_TENSORFLOW_ENABLED: 'false',
  ANALYTICS_MODEL_TRAINING_ENABLED: 'false',
  ANALYTICS_MIN_DATA_POINTS_ML: '100',

  // Monitoring
  ANALYTICS_ENABLE_METRICS: 'true',
  ANALYTICS_PERFORMANCE_LOGGING: 'false',
  ANALYTICS_ACCURACY_TRACKING: 'true',
};
