/**
 * Analytics Data Interfaces
 * 
 * Defines data structures for analytics processing in IntelliFin.
 * Optimized for Zambian SME requirements with proper typing and validation.
 */

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsDataSource {
  customers: CustomerAnalyticsData[];
  invoices: InvoiceAnalyticsData[];
  payments: PaymentAnalyticsData[];
  expenses: ExpenseAnalyticsData[];
  taxes: TaxAnalyticsData;
  accounts: AccountAnalyticsData[];
  dateRange: DateRange;
  organizationId: string;
  aggregatedAt: Date;
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  totalPayments: number;
  accountsReceivable: number;
  profitMargin: number;
  period: DateRange;
  currency: string;
}

// ============================================================================
// CUSTOMER ANALYTICS
// ============================================================================

export interface CustomerAnalyticsData {
  id: string;
  name: string;
  totalRevenue: number;
  totalPayments: number;
  invoiceCount: number;
  paymentCount: number;
  averageInvoiceValue: number;
  paymentTerms: number;
  isActive: boolean;
}

export interface CustomerProfitability {
  customerId: string;
  customerName: string;
  revenue: number;
  directCosts: number;
  allocatedCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  ranking: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// INVOICE ANALYTICS
// ============================================================================

export interface InvoiceAnalyticsData {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  itemCount: number;
  paymentCount: number;
  daysOverdue: number;
}

export interface InvoiceTrend {
  period: string;
  invoiceCount: number;
  totalValue: number;
  averageValue: number;
  paidPercentage: number;
  overduePercentage: number;
}

// ============================================================================
// PAYMENT ANALYTICS
// ============================================================================

export interface PaymentAnalyticsData {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId: string | null;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  status: string;
  withholdingTaxAmount: number;
  grossAmount: number;
}

export interface PaymentTrend {
  period: string;
  paymentCount: number;
  totalAmount: number;
  averageAmount: number;
  methodBreakdown: Record<string, number>;
}

// ============================================================================
// EXPENSE ANALYTICS
// ============================================================================

export interface ExpenseAnalyticsData {
  id: string;
  description: string;
  amount: number;
  expenseDate: Date;
  categoryId: string;
  categoryName: string;
  status: string;
  isRecurring: boolean;
  tags: string[];
  vatAmount: number;
  isTaxDeductible: boolean;
}

export interface ExpensePattern {
  category: string;
  pattern: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  changeRate: number;
  confidence: number;
  recommendations: string[];
  seasonalityDetected: boolean;
}

export interface ExpenseAnomaly {
  expenseId: string;
  description: string;
  amount: number;
  expectedAmount: number;
  variance: number;
  anomalyScore: number;
  category: string;
  date: Date;
  reason: string;
}

// ============================================================================
// TAX ANALYTICS
// ============================================================================

export interface TaxAnalyticsData {
  obligations: TaxObligationData[];
  periods: TaxPeriodData[];
}

export interface TaxObligationData {
  id: string;
  taxType: string;
  amount: number;
  dueDate: Date;
  status: string;
  penaltyAmount: number;
}

export interface TaxPeriodData {
  id: string;
  taxType: string;
  periodStart: Date;
  periodEnd: Date;
  filingDeadline: Date;
  paymentDeadline: Date;
  status: string;
}

export interface TaxOptimization {
  currentLiability: number;
  optimizedLiability: number;
  potentialSavings: number;
  strategies: TaxStrategy[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  complianceScore: number;
}

export interface TaxStrategy {
  strategy: string;
  description: string;
  potentialSaving: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline?: Date;
}

// ============================================================================
// ACCOUNT ANALYTICS
// ============================================================================

export interface AccountAnalyticsData {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  transactionCount: number;
  totalDebits: number;
  totalCredits: number;
}

// ============================================================================
// FORECASTING
// ============================================================================

export interface ForecastResult {
  period: string;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidence: number;
  factors: ForecastFactor[];
}

export interface ForecastFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ForecastModel {
  type: 'LINEAR' | 'SEASONAL' | 'ARIMA' | 'EXPONENTIAL';
  parameters: Record<string, any>;
  accuracy: number;
  lastTrained: Date;
  isActive: boolean;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  period: string;
}

// ============================================================================
// FINANCIAL RATIOS
// ============================================================================

export interface FinancialRatios {
  liquidity: LiquidityRatios;
  profitability: ProfitabilityRatios;
  efficiency: EfficiencyRatios;
  leverage: LeverageRatios;
  industryComparison: IndustryBenchmark;
  period: DateRange;
  calculatedAt: Date;
}

export interface LiquidityRatios {
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
}

export interface ProfitabilityRatios {
  grossMargin: number;
  netMargin: number;
  operatingMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
}

export interface EfficiencyRatios {
  inventoryTurnover: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  assetTurnover: number;
  daysSalesOutstanding: number;
}

export interface LeverageRatios {
  debtToEquity: number;
  debtToAssets: number;
  equityRatio: number;
  debtServiceCoverage: number;
}

export interface IndustryBenchmark {
  industry: string;
  benchmarkRatios: Partial<FinancialRatios>;
  percentileRanking: number;
  comparison: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
}

// ============================================================================
// ANALYTICS INSIGHTS
// ============================================================================

export interface AnalyticsInsight {
  id: string;
  type: 'REVENUE_FORECAST' | 'EXPENSE_ANOMALY' | 'PROFITABILITY_ALERT' | 'TAX_OPTIMIZATION' | 'CASH_FLOW_WARNING';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>;
  expiresAt?: Date;
  createdAt: Date;
}

// ============================================================================
// SEASONALITY AND TRENDS
// ============================================================================

export interface SeasonalPattern {
  pattern: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  strength: number;
  peaks: string[];
  troughs: string[];
  description: string;
}

export interface TrendAnalysis {
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  strength: number;
  changeRate: number;
  confidence: number;
  seasonality?: SeasonalPattern;
}

// ============================================================================
// ANALYTICS CONFIGURATION
// ============================================================================

export interface AnalyticsConfiguration {
  organizationId: string;
  type: 'FORECASTING' | 'TRENDS' | 'RATIOS' | 'TAX_ANALYTICS' | 'PROFITABILITY';
  settings: Record<string, any>;
  isActive: boolean;
  lastUpdated: Date;
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

export interface AnalyticsQuery {
  organizationId: string;
  dateRange: DateRange;
  metrics?: string[];
  groupBy?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  filters?: Record<string, any>;
  includeForecasts?: boolean;
  includeBenchmarks?: boolean;
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
