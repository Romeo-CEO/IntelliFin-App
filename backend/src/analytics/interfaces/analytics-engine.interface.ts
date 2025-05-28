/**
 * Analytics Engine Interface
 * 
 * Defines contracts for analytics engines to enable seamless transition
 * from statistical methods to AI/ML implementations
 */

export interface IAnalyticsEngine {
  readonly engineType: 'STATISTICAL' | 'ML' | 'HYBRID';
  readonly version: string;
  readonly capabilities: AnalyticsCapability[];
}

export interface IForecastingEngine extends IAnalyticsEngine {
  generateForecast(
    data: TimeSeriesData,
    options: ForecastingOptions
  ): Promise<ForecastResult>;
  
  validateModel(data: TimeSeriesData): Promise<ModelValidation>;
  getModelMetrics(): Promise<ModelMetrics>;
}

export interface IAnomalyDetectionEngine extends IAnalyticsEngine {
  detectAnomalies(
    data: AnalyticsData,
    sensitivity: AnomalySensitivity
  ): Promise<AnomalyResult>;
  
  trainModel(historicalData: AnalyticsData): Promise<void>;
  updateModel(newData: AnalyticsData): Promise<void>;
}

export interface IPredictiveEngine extends IAnalyticsEngine {
  predictCustomerBehavior(
    customerData: CustomerAnalyticsData
  ): Promise<CustomerPrediction>;
  
  predictCashFlow(
    financialData: FinancialData,
    horizon: number
  ): Promise<CashFlowPrediction>;
  
  predictRisk(
    businessData: BusinessData
  ): Promise<RiskAssessment>;
}

// Data Types
export interface TimeSeriesData {
  values: number[];
  timestamps: Date[];
  metadata?: Record<string, any>;
}

export interface AnalyticsData {
  timeSeries?: TimeSeriesData;
  categorical?: Record<string, any>[];
  numerical?: number[][];
  metadata: AnalyticsMetadata;
}

export interface AnalyticsMetadata {
  organizationId: string;
  dataType: string;
  dateRange: DateRange;
  quality: DataQuality;
}

export interface DataQuality {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
}

// Result Types
export interface ForecastResult {
  predictions: ForecastPoint[];
  confidence: ConfidenceInterval[];
  accuracy: ModelAccuracy;
  insights: string[];
  recommendations: string[];
}

export interface AnomalyResult {
  anomalies: AnomalyPoint[];
  severity: AnomalySeverity[];
  patterns: AnomalyPattern[];
  recommendations: string[];
}

export interface ModelValidation {
  isValid: boolean;
  metrics: ValidationMetrics;
  recommendations: string[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mape: number;
  rmse: number;
}

// Enums and Types
export type AnalyticsCapability = 
  | 'FORECASTING'
  | 'ANOMALY_DETECTION'
  | 'TREND_ANALYSIS'
  | 'PATTERN_RECOGNITION'
  | 'PREDICTIVE_MODELING'
  | 'RISK_ASSESSMENT';

export type AnomalySensitivity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ForecastPoint {
  timestamp: Date;
  value: number;
  confidence: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  probability: number;
}

export interface AnomalyPoint {
  timestamp: Date;
  value: number;
  expectedValue: number;
  severity: AnomalySeverity;
  explanation: string;
}

export interface AnomalyPattern {
  type: string;
  frequency: number;
  description: string;
}

export interface ModelAccuracy {
  mape: number;
  rmse: number;
  r2: number;
  confidence: number;
}

export interface ValidationMetrics {
  crossValidationScore: number;
  holdoutScore: number;
  stabilityScore: number;
}

// Future AI/ML Types
export interface CustomerPrediction {
  churnProbability: number;
  lifetimeValue: number;
  nextPurchaseDate: Date;
  recommendedActions: string[];
}

export interface CashFlowPrediction {
  projectedCashFlow: ForecastPoint[];
  riskFactors: RiskFactor[];
  optimizationSuggestions: string[];
}

export interface RiskAssessment {
  overallRisk: number;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  factor: string;
  impact: number;
  probability: number;
  description: string;
}

export interface CustomerAnalyticsData {
  transactionHistory: any[];
  paymentBehavior: any[];
  demographics: Record<string, any>;
  interactions: any[];
}

export interface FinancialData {
  revenue: TimeSeriesData;
  expenses: TimeSeriesData;
  cashFlow: TimeSeriesData;
  receivables: any[];
  payables: any[];
}

export interface BusinessData {
  financial: FinancialData;
  operational: Record<string, any>;
  market: Record<string, any>;
  competitive: Record<string, any>;
}

export interface ForecastingOptions {
  method: 'linear' | 'exponential' | 'seasonal' | 'ml';
  periods: number;
  confidence: number;
  includeSeasonality: boolean;
  zambianContext?: boolean;
}
