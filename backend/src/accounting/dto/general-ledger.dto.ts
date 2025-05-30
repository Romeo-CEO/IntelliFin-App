import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from '@prisma/client';

export class GeneralLedgerQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by account ID' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by source type',
    enum: SourceType,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'Filter by source ID' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class GeneralLedgerEntryResponseDto {
  @ApiProperty({ description: 'Entry ID' })
  id: string;

  @ApiProperty({ description: 'Account ID' })
  accountId: string;

  @ApiProperty({ description: 'Journal entry ID' })
  journalEntryId: string;

  @ApiProperty({ description: 'Entry date' })
  entryDate: Date;

  @ApiProperty({ description: 'Debit amount' })
  debitAmount: number;

  @ApiProperty({ description: 'Credit amount' })
  creditAmount: number;

  @ApiProperty({ description: 'Running balance after this entry' })
  runningBalance: number;

  @ApiProperty({ description: 'Entry description' })
  description: string;

  @ApiPropertyOptional({ description: 'Entry reference' })
  reference?: string;

  @ApiPropertyOptional({ description: 'Source type', enum: SourceType })
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'Source ID' })
  sourceId?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Account details' })
  account: {
    accountCode: string;
    accountName: string;
    accountType: string;
    normalBalance: string;
  };

  @ApiProperty({ description: 'Journal entry details' })
  journalEntry: {
    entryNumber: string;
    entryType: string;
    isPosted: boolean;
  };
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: string;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type' })
  accountType: string;

  @ApiProperty({ description: 'Normal balance type' })
  normalBalance: string;

  @ApiProperty({ description: 'Total debit amount' })
  debitTotal: number;

  @ApiProperty({ description: 'Total credit amount' })
  creditTotal: number;

  @ApiProperty({ description: 'Account balance' })
  balance: number;

  @ApiProperty({ description: 'Running balance' })
  runningBalance: number;
}

export class TrialBalanceDto {
  @ApiProperty({ description: 'Account balances', type: [AccountBalanceDto] })
  accounts: AccountBalanceDto[];

  @ApiProperty({ description: 'Total debits' })
  totalDebits: number;

  @ApiProperty({ description: 'Total credits' })
  totalCredits: number;

  @ApiProperty({ description: 'Whether trial balance is balanced' })
  isBalanced: boolean;

  @ApiProperty({ description: 'As of date' })
  asOfDate: Date;
}

export class BalanceSheetDto {
  @ApiProperty({ description: 'Assets section' })
  assets: {
    currentAssets: AccountBalanceDto[];
    nonCurrentAssets: AccountBalanceDto[];
    totalAssets: number;
  };

  @ApiProperty({ description: 'Liabilities section' })
  liabilities: {
    currentLiabilities: AccountBalanceDto[];
    nonCurrentLiabilities: AccountBalanceDto[];
    totalLiabilities: number;
  };

  @ApiProperty({ description: 'Equity section' })
  equity: {
    equityAccounts: AccountBalanceDto[];
    totalEquity: number;
  };

  @ApiProperty({ description: 'Total liabilities and equity' })
  totalLiabilitiesAndEquity: number;

  @ApiProperty({ description: 'Whether balance sheet is balanced' })
  isBalanced: boolean;

  @ApiProperty({ description: 'As of date' })
  asOfDate: Date;
}

export class IncomeStatementDto {
  @ApiProperty({ description: 'Revenue section' })
  revenue: {
    operatingRevenue: AccountBalanceDto[];
    nonOperatingRevenue: AccountBalanceDto[];
    totalRevenue: number;
  };

  @ApiProperty({ description: 'Expenses section' })
  expenses: {
    costOfGoodsSold: AccountBalanceDto[];
    operatingExpenses: AccountBalanceDto[];
    nonOperatingExpenses: AccountBalanceDto[];
    totalExpenses: number;
  };

  @ApiProperty({ description: 'Gross profit' })
  grossProfit: number;

  @ApiProperty({ description: 'Operating income' })
  operatingIncome: number;

  @ApiProperty({ description: 'Net income' })
  netIncome: number;

  @ApiProperty({ description: 'Period from date' })
  periodFrom: Date;

  @ApiProperty({ description: 'Period to date' })
  periodTo: Date;
}

export class CashFlowDto {
  @ApiProperty({ description: 'Operating activities' })
  operatingActivities: AccountBalanceDto[];

  @ApiProperty({ description: 'Investing activities' })
  investingActivities: AccountBalanceDto[];

  @ApiProperty({ description: 'Financing activities' })
  financingActivities: AccountBalanceDto[];

  @ApiProperty({ description: 'Net cash flow' })
  netCashFlow: number;
}

export class GeneralLedgerIntegrityDto {
  @ApiProperty({ description: 'Whether general ledger is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Validation errors' })
  errors: string[];

  @ApiProperty({ description: 'Validation warnings' })
  warnings: string[];
}
