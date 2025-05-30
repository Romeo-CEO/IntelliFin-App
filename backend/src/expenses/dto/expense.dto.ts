import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  ExpenseStatus,
  PaymentMethod,
  RecurrencePattern,
} from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Category ID for the expense',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Transaction ID if linked to a transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Vendor or supplier name',
    example: 'Office Supplies Ltd',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  vendor?: string;

  @ApiProperty({
    description: 'Date of the expense',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Amount of the expense',
    example: 150.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'ZMW';

  @ApiProperty({
    description: 'Description of the expense',
    example: 'Office supplies for Q1',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Reference number or transaction ID',
    example: 'REF-2024-001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring expense',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean = false;

  @ApiPropertyOptional({
    description: 'Recurrence pattern if recurring',
    enum: RecurrencePattern,
    example: RecurrencePattern.MONTHLY,
  })
  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'End date for recurring expenses',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Whether this expense is tax deductible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isTaxDeductible?: boolean = true;

  @ApiPropertyOptional({
    description: 'VAT amount if applicable',
    example: 24.08,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  vatAmount?: number = 0;

  @ApiPropertyOptional({
    description: 'Withholding tax amount if applicable',
    example: 15.05,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  withholdingTax?: number = 0;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Approved by manager',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'Category ID for the expense',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID if linked to a transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Vendor or supplier name',
    example: 'Office Supplies Ltd',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Date of the expense',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Amount of the expense',
    example: 150.5,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Description of the expense',
    example: 'Office supplies for Q1',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Reference number or transaction ID',
    example: 'REF-2024-001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring expense',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern if recurring',
    enum: RecurrencePattern,
    example: RecurrencePattern.MONTHLY,
  })
  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'End date for recurring expenses',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Whether this expense is tax deductible',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isTaxDeductible?: boolean;

  @ApiPropertyOptional({
    description: 'VAT amount if applicable',
    example: 24.08,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  vatAmount?: number;

  @ApiPropertyOptional({
    description: 'Withholding tax amount if applicable',
    example: 15.05,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  withholdingTax?: number;

  @ApiPropertyOptional({
    description: 'Expense status',
    enum: ExpenseStatus,
    example: ExpenseStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Approved by manager',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExpenseQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by expense status',
    enum: ExpenseStatus,
    example: ExpenseStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by vendor name',
    example: 'Office Supplies',
  })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Filter by date from (inclusive)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to (inclusive)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum amount',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum amount',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @ApiPropertyOptional({
    description: 'Filter by recurring expenses',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by tax deductible expenses',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isTaxDeductible?: boolean;

  @ApiPropertyOptional({
    description: 'Search in description, vendor, reference, or notes',
    example: 'office supplies',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'date',
    enum: ['date', 'amount', 'vendor', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'date';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
