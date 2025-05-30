// Types for analytics interfaces

export interface TimeSeriesDataPoint {
  period: string;
  value: number;
  date: Date;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: number; // 0-1 scale
  seasonality: {
    detected: boolean;
    pattern?: 'monthly' | 'quarterly' | 'yearly';
    strength?: number;
  };
  anomalies: Array<{
    period: string;
    value: number;
    expectedValue: number;
    severity: 'low' | 'medium' | 'high';
    date: Date;
  }>;
}

export interface ExpensePattern {
  category: string;
  pattern: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  changeRate: number;
  confidence: number;
  recommendations: string[];
  seasonalityDetected: boolean;
}

export interface ExpenseTrendAnalysis {
  overall: TrendAnalysis;
  byCategory: Array<{
    category: string;
    trend: TrendAnalysis;
    totalAmount: number;
    percentageOfTotal: number;
    monthlyAverage: number;
  }>;
  insights: {
    fastestGrowingCategory: string;
    largestCategory: string;
    volatileCategories: string[];
    seasonalCategories: string[];
    recommendations: string[];
  };
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
}

export interface ExpenseAnomaly {
  id: string;
  expenseId?: string;
  transactionDate: Date;
  amount: number;
  description: string;
  category?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  detectedAt: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  recommendations: string[];
}

export interface ExpenseAnomalyDetection {
  anomalies: ExpenseAnomaly[];
  patterns: Array<{
    pattern: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendations: string[];
  }>;
  alerts: Array<{
    alert: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  summary: {
    totalAnomalies: number;
    highSeverity: number;
    potentialSavings: number;
  };
}

export interface DateRange {
  startDate: string | Date;
  endDate: string | Date;
}

export interface AnalyticsInsight {
  id: string;
  type:
    | 'REVENUE_FORECAST'
    | 'EXPENSE_ANOMALY'
    | 'PROFITABILITY_ALERT'
    | 'TAX_OPTIMIZATION'
    | 'CASH_FLOW_WARNING';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>; // Consider a more specific type if possible
  expiresAt?: Date;
  createdAt: Date;
}

export interface CustomerProfitability {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  averageOrderValue: number;
  lifetimeValue: number;
  riskScore: number; // 0-100 scale
}

export interface AnalyticsResponse<T = any> {
  data: T;
  metadata: {
    organizationId: string;
    dateRange: DateRange;
    generatedAt: Date;
    cacheKey?: string;
    expiresAt?: Date;
  };
  insights?: AnalyticsInsight[];
}

export interface ProfitabilityTrendPeriod {
  period: string; // YYYY-MM or other period format
  startDate: string | Date;
  endDate: string | Date;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  changeFromPreviousNetProfit: number; // Percentage change from the previous period
  zambianSeason?: string; // Optional, based on implementation
}

export interface ProfitabilityTrendSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  averageGrossMargin: number;
  averageNetMargin: number;
  overallNetProfitGrowthRate: number; // Percentage change over the entire period
  periodsAnalyzed: number;
}

export interface ProfitabilityTrendsResult {
  trends: ProfitabilityTrendPeriod[];
  summary: ProfitabilityTrendSummary;
  forecasts: NewForecastResult[];
}

export interface TaxTrendAnalysis {
  period: string;
  taxLiability: number;
  taxPaid: number;
  complianceScore: number;
  filingRate: number;
  paymentRate: number;
}

export interface CompliancePrediction {
  nextPeriod: {
    period: string;
    predictedScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
  };
  factors: {
    historicalTrend: number;
    seasonalAdjustment: number;
    currentPerformance: number;
    upcomingDeadlines: number;
  };
  confidence: number;
}

export interface TaxEfficiencyMetrics {
  effectiveTaxRate: number;
  taxBurdenRatio: number;
  complianceCost: number;
  penaltyRatio: number;
  timeToFile: number;
  automationRate: number;
}

export interface SeasonalAnalysis {
  month: number;
  monthName: string;
  averageTaxLiability: number;
  averageComplianceScore: number;
  filingVolume: number;
  seasonalityIndex: number;
}

export interface TaxRiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: Array<{
    factor: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    probability: number;
    mitigation: string;
  }>;
  riskScore: number;
  recommendations: string[];
}

export interface TaxAnalyticsDashboard {
  overview: {
    currentComplianceScore: number;
    predictedScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    effectiveTaxRate: number;
  };
  trends: {
    complianceTrend: Array<{
      period: string;
      score: number;
    }>;
    taxLiabilityTrend: Array<{
      period: string;
      amount: number;
    }>;
  };
  prediction: CompliancePrediction;
  metrics: TaxEfficiencyMetrics;
  seasonalInsights: {
    peakMonth: SeasonalAnalysis;
    lowMonth: SeasonalAnalysis;
    seasonalVariation: number;
  };
  riskAssessment: TaxRiskAssessment;
  recommendations: string[];
  lastUpdated: Date;
}

export interface TaxStrategy {
  strategy: string;
  description: string;
  potentialSaving: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline?: string | Date;
}

export interface TaxOptimizationInsights {
  vatOptimization: {
    currentLiability: number;
    potentialSavings: number;
    recommendations: string[];
    complianceRisk: 'low' | 'medium' | 'high';
  };
  incomeTaxOptimization: {
    currentEstimate: number;
    deductionOpportunities: Array<{
      category: string;
      currentAmount: number;
      potentialAmount: number;
      savings: number;
      description: string;
    }>;
    recommendations: string[];
  };
  cashFlowOptimization: {
    vatPaymentSchedule: Array<{
      dueDate: Date;
      amount: number;
      type: 'VAT' | 'Income Tax' | 'PAYE';
    }>;
    recommendedReserves: number;
    cashFlowImpact: string[];
  };
}

export interface ZraComplianceAnalysis {
  complianceScore: number; // 0-100
  riskAreas: Array<{
    area: string;
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  }>;
  filingStatus: {
    vatReturns: { current: boolean; overdue: number };
    incomeTaxReturns: { current: boolean; overdue: number };
    payeReturns: { current: boolean; overdue: number };
  };
  auditReadiness: {
    score: number;
    missingDocuments: string[];
    recommendations: string[];
  };
}

export interface BusinessHealthScore {
  overallScore: number; // 0-100 scale
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  components: {
    cashFlow: { score: number; weight: number };
    profitability: { score: number; weight: number };
    growth: { score: number; weight: number };
    efficiency: { score: number; weight: number };
    stability: { score: number; weight: number };
  };
  trends: {
    improving: boolean;
    deteriorating: boolean;
    stable: boolean;
  };
  recommendations: string[];
  benchmarks: {
    industry: number;
    smeAverage: number;
    topPerformers: number;
  };
}

export interface FinancialRatios {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  profitability: {
    grossProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  efficiency: {
    assetTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    inventoryTurnover: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
  };
}

export interface ProfitabilityTrends {
  customerTrends: Array<{
    customerId: string;
    customerName: string;
    monthlyProfitability: Array<{
      month: string;
      revenue: number;
      profit: number;
      margin: number;
    }>;
    trend: 'improving' | 'declining' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  productTrends: Array<{
    productName: string;
    monthlyProfitability: Array<{
      month: string;
      revenue: number;
      profit: number;
      margin: number;
      unitsSold: number;
    }>;
    trend: 'improving' | 'declining' | 'stable';
    lifecycle: 'growth' | 'maturity' | 'decline';
  }>;
}

export interface ProductProfitability {
  productId?: string;
  productName: string;
  category: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  unitsSold: number;
  averagePrice: number;
  costPerUnit: number;
}

export interface CashFlowData {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeBalance: number;
}

export interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  currentBalance: number;
}

export interface RevenueExpensesData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface RevenueExpensesSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  averageProfitMargin: number;
}

export interface KpiMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashBalance: number;
  accountsReceivable: number;
  averageInvoiceValue: number;
  paymentCycleTime: number;
  customerCount: number;
  invoiceCount: number;
  // Trend indicators (vs previous period)
  revenueTrend: number;
  expensesTrend: number;
  profitTrend: number;
  receivablesTrend: number;
}

export interface ReceivablesAgingDetail {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  category: 'current' | '30days' | '60days' | '90days' | '90plus';
}

export interface ReceivablesAgingData {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinety: number;
  total: number;
  details: ReceivablesAgingDetail[];
}

export interface ReceivablesAgingInsights {
  riskLevel: 'low' | 'medium' | 'high';
  overduePercentage: number;
  averageDaysOverdue: number;
  recommendations: string[];
} 