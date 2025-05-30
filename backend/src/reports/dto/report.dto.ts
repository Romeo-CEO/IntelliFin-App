import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  Type,
  ValidateNested,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  FINANCIAL_OVERVIEW = 'FINANCIAL_OVERVIEW',
  PROFIT_LOSS = 'PROFIT_LOSS',
  CASH_FLOW = 'CASH_FLOW',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  VAT_REPORT = 'VAT_REPORT',
  REVENUE_BREAKDOWN = 'REVENUE_BREAKDOWN',
  EXPENSE_BREAKDOWN = 'EXPENSE_BREAKDOWN',
  CUSTOMER_ANALYSIS = 'CUSTOMER_ANALYSIS',
}

export enum ReportPeriod {
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export class ReportQueryDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
    example: ReportType.FINANCIAL_OVERVIEW,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({
    description: 'Predefined period for the report',
    enum: ReportPeriod,
    example: ReportPeriod.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date (required if period is CUSTOM)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (required if period is CUSTOM)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include comparison with previous period',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeComparison?: boolean;

  @ApiPropertyOptional({
    description: 'Export format for the report',
    enum: ExportFormat,
    example: ExportFormat.PDF,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Period for dashboard metrics',
    enum: ReportPeriod,
    example: ReportPeriod.THIS_MONTH,
    default: ReportPeriod.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date for dashboard metrics',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date for dashboard metrics',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include comparison with previous period',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeComparison?: boolean;
}

export class FinancialMetricsDto {
  @ApiProperty({
    description: 'Total revenue for the period',
    example: 125000.0,
  })
  revenue: number;

  @ApiProperty({
    description: 'Total expenses for the period',
    example: 85000.0,
  })
  expenses: number;

  @ApiProperty({
    description: 'Net profit for the period',
    example: 40000.0,
  })
  profit: number;

  @ApiProperty({
    description: 'Current cash balance',
    example: 75000.0,
  })
  cashBalance: number;

  @ApiProperty({
    description: 'Total accounts receivable',
    example: 35000.0,
  })
  accountsReceivable: number;

  @ApiProperty({
    description: 'Total accounts payable',
    example: 15000.0,
  })
  accountsPayable: number;

  @ApiProperty({
    description: 'VAT liability amount',
    example: 8000.0,
  })
  vatLiability: number;

  @ApiPropertyOptional({
    description: 'Previous period revenue for comparison',
    example: 110000.0,
  })
  previousPeriodRevenue?: number;

  @ApiPropertyOptional({
    description: 'Previous period expenses for comparison',
    example: 80000.0,
  })
  previousPeriodExpenses?: number;

  @ApiPropertyOptional({
    description: 'Previous period profit for comparison',
    example: 30000.0,
  })
  previousPeriodProfit?: number;
}

export class PeriodComparisonDto {
  @ApiProperty({
    description: 'Current period metrics',
    type: FinancialMetricsDto,
  })
  current: FinancialMetricsDto;

  @ApiProperty({
    description: 'Previous period metrics',
    type: FinancialMetricsDto,
  })
  previous: FinancialMetricsDto;

  @ApiProperty({
    description: 'Changes between periods',
    type: 'object',
    properties: {
      revenue: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 15000.0 },
          percentage: { type: 'number', example: 13.64 },
        },
      },
      expenses: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 5000.0 },
          percentage: { type: 'number', example: 6.25 },
        },
      },
      profit: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 10000.0 },
          percentage: { type: 'number', example: 33.33 },
        },
      },
    },
  })
  changes: {
    revenue: { amount: number; percentage: number };
    expenses: { amount: number; percentage: number };
    profit: { amount: number; percentage: number };
    cashBalance: { amount: number; percentage: number };
    accountsReceivable: { amount: number; percentage: number };
    accountsPayable: { amount: number; percentage: number };
  };
}

export class RevenueBreakdownDto {
  @ApiProperty({
    description: 'Revenue breakdown by customer',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        customerName: { type: 'string', example: 'ABC Company Ltd' },
        amount: { type: 'number', example: 25000.0 },
        percentage: { type: 'number', example: 20.0 },
      },
    },
  })
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    amount: number;
    percentage: number;
  }>;

  @ApiProperty({
    description: 'Revenue breakdown by month',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        amount: { type: 'number', example: 15000.0 },
      },
    },
  })
  byMonth: Array<{ month: string; amount: number }>;

  @ApiProperty({
    description: 'Revenue breakdown by payment method',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        method: { type: 'string', example: 'MOBILE_MONEY' },
        amount: { type: 'number', example: 75000.0 },
        percentage: { type: 'number', example: 60.0 },
      },
    },
  })
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export class ExpenseBreakdownDto {
  @ApiProperty({
    description: 'Expense breakdown by category',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
        categoryName: { type: 'string', example: 'Office Supplies' },
        amount: { type: 'number', example: 12000.0 },
        percentage: { type: 'number', example: 14.12 },
      },
    },
  })
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;

  @ApiProperty({
    description: 'Expense breakdown by month',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        amount: { type: 'number', example: 8500.0 },
      },
    },
  })
  byMonth: Array<{ month: string; amount: number }>;

  @ApiProperty({
    description: 'Expense breakdown by payment method',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        method: { type: 'string', example: 'CASH' },
        amount: { type: 'number', example: 25000.0 },
        percentage: { type: 'number', example: 29.41 },
      },
    },
  })
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export class AccountsReceivableAgingDto {
  @ApiProperty({
    description: 'Current receivables (0-30 days)',
    example: 15000.0,
  })
  current: number;

  @ApiProperty({
    description: 'Receivables 31-60 days old',
    example: 8000.0,
  })
  thirtyDays: number;

  @ApiProperty({
    description: 'Receivables 61-90 days old',
    example: 5000.0,
  })
  sixtyDays: number;

  @ApiProperty({
    description: 'Receivables over 90 days old',
    example: 2000.0,
  })
  ninetyDays: number;

  @ApiProperty({
    description: 'Total receivables',
    example: 30000.0,
  })
  total: number;

  @ApiProperty({
    description: 'Detailed breakdown of receivables',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        customerName: { type: 'string', example: 'ABC Company Ltd' },
        invoiceId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
        invoiceNumber: { type: 'string', example: 'INV-2024-001' },
        amount: { type: 'number', example: 5000.0 },
        daysOverdue: { type: 'number', example: 45 },
        category: { type: 'string', example: '30days' },
      },
    },
  })
  details: Array<{
    customerId: string;
    customerName: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    category: 'current' | '30days' | '60days' | '90days';
  }>;
}

export class VatReportDto {
  @ApiProperty({
    description: 'Report period',
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date', example: '2024-01-01' },
      endDate: { type: 'string', format: 'date', example: '2024-01-31' },
    },
  })
  period: { startDate: string; endDate: string };

  @ApiProperty({
    description: 'Sales VAT information',
    type: 'object',
    properties: {
      standardRated: { type: 'number', example: 100000.0 },
      zeroRated: { type: 'number', example: 5000.0 },
      exempt: { type: 'number', example: 2000.0 },
      totalSales: { type: 'number', example: 107000.0 },
      outputVat: { type: 'number', example: 16000.0 },
    },
  })
  sales: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    totalSales: number;
    outputVat: number;
  };

  @ApiProperty({
    description: 'Purchases VAT information',
    type: 'object',
    properties: {
      standardRated: { type: 'number', example: 60000.0 },
      zeroRated: { type: 'number', example: 1000.0 },
      exempt: { type: 'number', example: 500.0 },
      totalPurchases: { type: 'number', example: 61500.0 },
      inputVat: { type: 'number', example: 9600.0 },
    },
  })
  purchases: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    totalPurchases: number;
    inputVat: number;
  };

  @ApiProperty({
    description: 'VAT liability (amount owed to ZRA)',
    example: 6400.0,
  })
  vatLiability: number;

  @ApiProperty({
    description: 'VAT refund (amount owed by ZRA)',
    example: 0.0,
  })
  vatRefund: number;
}

export class CashFlowDataDto {
  @ApiProperty({
    description: 'Operating cash flow by month',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        inflow: { type: 'number', example: 25000.0 },
        outflow: { type: 'number', example: 18000.0 },
        net: { type: 'number', example: 7000.0 },
      },
    },
  })
  operatingCashFlow: Array<{
    month: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;

  @ApiProperty({
    description: 'Monthly cash balance',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        balance: { type: 'number', example: 75000.0 },
      },
    },
  })
  monthlyBalance: Array<{ month: string; balance: number }>;

  @ApiProperty({
    description: 'Projected cash flow',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-07' },
        projected: { type: 'number', example: 85000.0 },
      },
    },
  })
  projectedCashFlow: Array<{ month: string; projected: number }>;
}

export class DashboardMetricsDto {
  @ApiProperty({
    description: 'Financial metrics for the dashboard',
    type: FinancialMetricsDto,
  })
  financialMetrics: FinancialMetricsDto;

  @ApiPropertyOptional({
    description: 'Period comparison data',
    type: PeriodComparisonDto,
  })
  periodComparison?: PeriodComparisonDto;

  @ApiProperty({
    description: 'Revenue breakdown',
    type: RevenueBreakdownDto,
  })
  revenueBreakdown: RevenueBreakdownDto;

  @ApiProperty({
    description: 'Recent cash flow data',
    type: CashFlowDataDto,
  })
  cashFlow: CashFlowDataDto;

  @ApiProperty({
    description: 'Accounts receivable aging',
    type: AccountsReceivableAgingDto,
  })
  accountsReceivable: AccountsReceivableAgingDto;
}
