import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountSubType, AccountType, NormalBalance } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account code (4-digit number)',
    example: '1100',
  })
  @IsString()
  @Length(4, 4, { message: 'Account code must be exactly 4 digits' })
  accountCode: string;

  @ApiProperty({ description: 'Account name', example: 'Cash on Hand' })
  @IsString()
  @Length(1, 255)
  accountName: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional({
    description: 'Account sub-type',
    enum: AccountSubType,
  })
  @IsOptional()
  @IsEnum(AccountSubType)
  accountSubType?: AccountSubType;

  @ApiPropertyOptional({ description: 'Parent account ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentAccountId?: string;

  @ApiProperty({ description: 'Normal balance type', enum: NormalBalance })
  @IsEnum(NormalBalance)
  normalBalance: NormalBalance;

  @ApiPropertyOptional({
    description: 'Whether account is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether account is a system account',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Whether account is a bank account',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBankAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Whether account is a tax account',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTaxAccount?: boolean;

  @ApiPropertyOptional({ description: 'Current balance', default: 0 })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'ZMW' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (for bank accounts)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name (for bank accounts)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Tax code (for tax accounts)' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  taxCode?: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Account name' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  accountName?: string;

  @ApiPropertyOptional({ description: 'Account type', enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiPropertyOptional({
    description: 'Account sub-type',
    enum: AccountSubType,
  })
  @IsOptional()
  @IsEnum(AccountSubType)
  accountSubType?: AccountSubType;

  @ApiPropertyOptional({ description: 'Parent account ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentAccountId?: string;

  @ApiPropertyOptional({
    description: 'Normal balance type',
    enum: NormalBalance,
  })
  @IsOptional()
  @IsEnum(NormalBalance)
  normalBalance?: NormalBalance;

  @ApiPropertyOptional({ description: 'Whether account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether account is a bank account' })
  @IsOptional()
  @IsBoolean()
  isBankAccount?: boolean;

  @ApiPropertyOptional({ description: 'Whether account is a tax account' })
  @IsOptional()
  @IsBoolean()
  isTaxAccount?: boolean;

  @ApiPropertyOptional({ description: 'Current balance' })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (for bank accounts)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name (for bank accounts)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Tax code (for tax accounts)' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  taxCode?: string;
}

export class AccountQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by account type',
    enum: AccountType,
  })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiPropertyOptional({
    description: 'Filter by account sub-type',
    enum: AccountSubType,
  })
  @IsOptional()
  @IsEnum(AccountSubType)
  accountSubType?: AccountSubType;

  @ApiPropertyOptional({ description: 'Filter by parent account ID' })
  @IsOptional()
  @IsUUID()
  parentAccountId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by system account status' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Filter by bank account status' })
  @IsOptional()
  @IsBoolean()
  isBankAccount?: boolean;

  @ApiPropertyOptional({ description: 'Filter by tax account status' })
  @IsOptional()
  @IsBoolean()
  isTaxAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Search in account code, name, or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class InitializeChartOfAccountsDto {
  @ApiPropertyOptional({
    description: 'Include default Zambian accounts',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDefaultAccounts?: boolean;
}

export class AccountResponseDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  accountType: AccountType;

  @ApiPropertyOptional({
    description: 'Account sub-type',
    enum: AccountSubType,
  })
  accountSubType?: AccountSubType;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  parentAccountId?: string;

  @ApiProperty({ description: 'Normal balance type', enum: NormalBalance })
  normalBalance: NormalBalance;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether account is a system account' })
  isSystem: boolean;

  @ApiProperty({ description: 'Whether account is a bank account' })
  isBankAccount: boolean;

  @ApiProperty({ description: 'Whether account is a tax account' })
  isTaxAccount: boolean;

  @ApiProperty({ description: 'Current balance' })
  currentBalance: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Account description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  bankName?: string;

  @ApiPropertyOptional({ description: 'Tax code' })
  taxCode?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Parent account details' })
  parentAccount?: {
    id: string;
    accountCode: string;
    accountName: string;
  };

  @ApiPropertyOptional({ description: 'Child accounts' })
  childAccounts?: AccountResponseDto[];

  @ApiPropertyOptional({ description: 'Transaction counts' })
  _count?: {
    generalLedgerEntries: number;
    debitEntries: number;
    creditEntries: number;
  };
}
