import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsPositive,
  Min,
  Max,
  Length,
  IsBoolean,
  ValidateNested,
  Type,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'Invoice ID to associate payment with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiProperty({
    description: 'Customer ID who made the payment',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from mobile money or bank',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({
    description: 'Payment amount in ZMW',
    example: 1500.00,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    description: 'Date when payment was made',
    example: '2024-01-15',
  })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference number',
    example: 'AIRTEL-123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'Partial payment for invoice INV-2024-001',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter payments from this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  paymentDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter payments to this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  paymentDateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimum payment amount',
    example: 100.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amountMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum payment amount',
    example: 10000.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amountMax?: number;

  @ApiPropertyOptional({
    description: 'Search in reference, notes, customer name, or invoice number',
    example: 'AIRTEL',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'paymentDate',
    enum: ['paymentDate', 'amount', 'customerName', 'paymentMethod', 'createdAt'],
    default: 'paymentDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Associated invoice ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  invoiceId?: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  customerId: string;

  @ApiPropertyOptional({
    description: 'Associated transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 1500.00,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'ZMW',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment date',
    example: '2024-01-15',
  })
  paymentDate: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference',
    example: 'AIRTEL-123456789',
  })
  reference?: string;

  @ApiPropertyOptional({
    description: 'Payment notes',
    example: 'Partial payment for invoice INV-2024-001',
  })
  notes?: string;

  @ApiProperty({
    description: 'Customer information',
  })
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional({
    description: 'Associated invoice information',
  })
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };

  @ApiPropertyOptional({
    description: 'Associated transaction information',
  })
  transaction?: {
    id: string;
    externalId: string;
    type: string;
    status: string;
  };

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}

export class PaymentListResponseDto {
  @ApiProperty({
    description: 'List of payments',
    type: [PaymentResponseDto],
  })
  payments: PaymentResponseDto[];

  @ApiProperty({
    description: 'Total number of payments',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class PaymentStatsDto {
  @ApiProperty({
    description: 'Total number of payments',
    example: 150,
  })
  totalPayments: number;

  @ApiProperty({
    description: 'Total payment amount',
    example: 125000.00,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Payment statistics by method',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: Object.values(PaymentMethod) },
        count: { type: 'number', example: 50 },
        amount: { type: 'number', example: 45000.00 },
      },
    },
  })
  byMethod: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
  }>;

  @ApiProperty({
    description: 'Number of payments in the last 30 days',
    example: 25,
  })
  recentPayments: number;
}

export class ReconcilePaymentDto {
  @ApiProperty({
    description: 'Transaction ID to link with payment',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Notes about the reconciliation',
    example: 'Automatically matched based on amount and date',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;
}

export class BulkReconcileDto {
  @ApiProperty({
    description: 'Array of payment-transaction mappings',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        paymentId: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ValidateNested({ each: true })
  @Type(() => ReconcileMapping)
  mappings: ReconcileMapping[];
}

class ReconcileMapping {
  @ApiProperty({
    description: 'Payment ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  transactionId: string;
}
