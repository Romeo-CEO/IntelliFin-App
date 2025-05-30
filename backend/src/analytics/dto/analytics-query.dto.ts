import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Analytics Query DTOs
 *
 * Data Transfer Objects for analytics API requests and responses.
 * Provides validation and documentation for analytics endpoints.
 */

// ============================================================================
// BASE QUERY DTOs
// ============================================================================

export class DateRangeDto {
  @ApiProperty({
    description: 'Start date for the analytics period',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the analytics period',
    example: '2024-12-31',
  })
  @IsDateString()
  endDate: string;
}

export class AnalyticsQueryDto {
  @ApiProperty({
    description: 'Date range for analytics data',
  })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Specific metrics to include in the response',
    example: ['revenue', 'expenses', 'profit'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Group results by time period',
    enum: ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'],
    example: 'MONTH',
  })
  @IsOptional()
  @IsEnum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'])
  groupBy?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

  @ApiPropertyOptional({
    description: 'Additional filters for the query',
    example: { customerId: 'customer-123', status: 'PAID' },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Include forecast data in the response',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeForecasts?: boolean;

  @ApiPropertyOptional({
    description: 'Include industry benchmarks in the response',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeBenchmarks?: boolean;

  @ApiPropertyOptional({
    description: 'Anomaly detection sensitivity level',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'MEDIUM',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  sensitivityLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// FORECASTING DTOs
// ============================================================================

export class ForecastingQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of periods to forecast',
    example: 6,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  forecastPeriods?: number;

  @ApiPropertyOptional({
    description: 'Forecasting model type to use',
    enum: ['LINEAR', 'SEASONAL', 'ARIMA', 'EXPONENTIAL'],
    example: 'SEASONAL',
  })
  @IsOptional()
  @IsEnum(['LINEAR', 'SEASONAL', 'ARIMA', 'EXPONENTIAL'])
  modelType?: 'LINEAR' | 'SEASONAL' | 'ARIMA' | 'EXPONENTIAL';

  @ApiPropertyOptional({
    description: 'Confidence level for forecast intervals',
    example: 0.95,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  confidenceLevel?: number;
}

export class ForecastResultDto {
  @ApiProperty({
    description: 'Period identifier',
    example: '2024-07',
  })
  period: string;

  @ApiProperty({
    description: 'Predicted value for the period',
    example: 125000.5,
  })
  predictedValue: number;

  @ApiProperty({
    description: 'Confidence interval for the prediction',
  })
  confidenceInterval: {
    lower: number;
    upper: number;
  };

  @ApiProperty({
    description: 'Confidence level (0-1)',
    example: 0.85,
  })
  confidence: number;

  @ApiProperty({
    description: 'Factors influencing the forecast',
  })
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

// ============================================================================
// PROFITABILITY DTOs
// ============================================================================

export class ProfitabilityQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Analysis type for profitability',
    enum: ['CUSTOMER', 'PRODUCT', 'SEGMENT', 'OVERALL'],
    example: 'CUSTOMER',
  })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'PRODUCT', 'SEGMENT', 'OVERALL'])
  analysisType?: 'CUSTOMER' | 'PRODUCT' | 'SEGMENT' | 'OVERALL';

  @ApiPropertyOptional({
    description: 'Minimum profit threshold for inclusion',
    example: 1000,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  minProfitThreshold?: number;

  @ApiPropertyOptional({
    description: 'Include cost allocation details',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCostAllocation?: boolean;
}

export class CustomerProfitabilityDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'customer-123',
  })
  customerId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'ABC Trading Ltd',
  })
  customerName: string;

  @ApiProperty({
    description: 'Total revenue from customer',
    example: 150000.0,
  })
  revenue: number;

  @ApiProperty({
    description: 'Direct costs associated with customer',
    example: 90000.0,
  })
  directCosts: number;

  @ApiProperty({
    description: 'Allocated overhead costs',
    example: 15000.0,
  })
  allocatedCosts: number;

  @ApiProperty({
    description: 'Gross profit (revenue - direct costs)',
    example: 60000.0,
  })
  grossProfit: number;

  @ApiProperty({
    description: 'Net profit (gross profit - allocated costs)',
    example: 45000.0,
  })
  netProfit: number;

  @ApiProperty({
    description: 'Profit margin percentage',
    example: 30.0,
  })
  profitMargin: number;

  @ApiProperty({
    description: 'Customer ranking by profitability',
    example: 1,
  })
  ranking: number;

  @ApiProperty({
    description: 'Risk level assessment',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'LOW',
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// TAX ANALYTICS DTOs
// ============================================================================

export class TaxAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Specific tax types to analyze',
    example: ['VAT', 'WITHHOLDING_TAX', 'INCOME_TAX'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taxTypes?: string[];

  @ApiPropertyOptional({
    description: 'Include optimization recommendations',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeOptimization?: boolean;

  @ApiPropertyOptional({
    description: 'Include compliance scoring',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCompliance?: boolean;
}

export class TaxOptimizationDto {
  @ApiProperty({
    description: 'Current tax liability',
    example: 25000.0,
  })
  currentLiability: number;

  @ApiProperty({
    description: 'Optimized tax liability',
    example: 22000.0,
  })
  optimizedLiability: number;

  @ApiProperty({
    description: 'Potential tax savings',
    example: 3000.0,
  })
  potentialSavings: number;

  @ApiProperty({
    description: 'Tax optimization strategies',
  })
  strategies: Array<{
    strategy: string;
    description: string;
    potentialSaving: number;
    implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    deadline?: string;
  }>;

  @ApiProperty({
    description: 'Overall risk level of optimization',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'LOW',
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    description: 'Tax compliance score (0-100)',
    example: 95,
  })
  complianceScore: number;
}

// ============================================================================
// FINANCIAL RATIOS DTOs
// ============================================================================

export class FinancialRatiosQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Specific ratio categories to calculate',
    example: ['LIQUIDITY', 'PROFITABILITY', 'EFFICIENCY'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ratioCategories?: string[];

  @ApiPropertyOptional({
    description: 'Include industry benchmarking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeBenchmarking?: boolean;

  @ApiPropertyOptional({
    description: 'Include historical comparison',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;
}

export class FinancialRatiosDto {
  @ApiProperty({
    description: 'Liquidity ratios',
  })
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };

  @ApiProperty({
    description: 'Profitability ratios',
  })
  profitability: {
    grossMargin: number;
    netMargin: number;
    operatingMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };

  @ApiProperty({
    description: 'Efficiency ratios',
  })
  efficiency: {
    inventoryTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    assetTurnover: number;
    daysSalesOutstanding: number;
  };

  @ApiProperty({
    description: 'Leverage ratios',
  })
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    equityRatio: number;
    debtServiceCoverage: number;
  };

  @ApiPropertyOptional({
    description: 'Industry benchmark comparison',
  })
  industryComparison?: {
    industry: string;
    percentileRanking: number;
    comparison: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  };

  @ApiProperty({
    description: 'Period for which ratios were calculated',
  })
  period: DateRangeDto;

  @ApiProperty({
    description: 'When the ratios were calculated',
    example: '2024-01-15T10:30:00Z',
  })
  calculatedAt: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class AnalyticsResponseDto<T = any> {
  @ApiProperty({
    description: 'Analytics data',
  })
  data: T;

  @ApiProperty({
    description: 'Response metadata',
  })
  metadata: {
    organizationId: string;
    dateRange: DateRangeDto;
    generatedAt: string;
    cacheKey?: string;
    expiresAt?: string;
  };

  @ApiPropertyOptional({
    description: 'Analytics insights and recommendations',
  })
  insights?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    actionable: boolean;
    recommendations: string[];
  }>;
}

// ============================================================================
// ERROR DTOs
// ============================================================================

export class AnalyticsErrorDto {
  @ApiProperty({
    description: 'Error code',
    example: 'INSUFFICIENT_DATA',
  })
  code: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Insufficient data for reliable analytics',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
  })
  details?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Suggestions to resolve the error',
  })
  suggestions?: string[];
}
