import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { InvoiceStatus, ZraSubmissionStatus } from '@prisma/client';

export class CreateInvoiceItemDto {
  @ApiProperty({
    description: 'Item description',
    example: 'Web Development Service',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1, { message: 'Item description is required' })
  @MaxLength(255, { message: 'Item description cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    description: 'Quantity',
    example: 10,
    minimum: 0.001,
    maximum: 999999.999,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Type(() => Number)
  @Min(0.001, { message: 'Quantity must be greater than 0' })
  @Max(999999.999, { message: 'Quantity cannot exceed 999,999.999' })
  quantity: number;

  @ApiProperty({
    description: 'Unit price in ZMW',
    example: 1000.0,
    minimum: 0,
    maximum: 9999999999.99,
  })
  @IsNumber({}, { message: 'Unit price must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Unit price cannot be negative' })
  @Max(9999999999.99, { message: 'Unit price is too large' })
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'VAT rate percentage',
    example: 16,
    minimum: 0,
    maximum: 100,
    default: 16,
  })
  @IsOptional()
  @IsNumber({}, { message: 'VAT rate must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'VAT rate cannot be negative' })
  @Max(100, { message: 'VAT rate cannot exceed 100%' })
  vatRate?: number;

  @ApiPropertyOptional({
    description: 'Discount rate percentage',
    example: 5,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Discount rate must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Discount rate cannot be negative' })
  @Max(100, { message: 'Discount rate cannot exceed 100%' })
  discountRate?: number;

  @ApiPropertyOptional({
    description: 'Fixed discount amount in ZMW',
    example: 50.0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Discount amount cannot be negative' })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Sort order cannot be negative' })
  sortOrder?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  customerId: string;

  @ApiPropertyOptional({
    description: 'Invoice reference/PO number',
    example: 'PO-12345',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Reference cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  reference?: string;

  @ApiProperty({
    description: 'Invoice issue date',
    example: '2024-01-15',
  })
  @IsDateString({}, { message: 'Issue date must be a valid date' })
  issueDate: string;

  @ApiProperty({
    description: 'Invoice due date',
    example: '2024-02-14',
  })
  @IsDateString({}, { message: 'Due date must be a valid date' })
  dueDate: string;

  @ApiPropertyOptional({
    description: 'Invoice-level discount amount in ZMW',
    example: 100.0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Discount amount cannot be negative' })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
    default: 'ZMW',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Currency code cannot exceed 3 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  currency?: string;

  @ApiPropertyOptional({
    description: 'Invoice status',
    example: 'DRAFT',
    enum: InvoiceStatus,
    default: 'DRAFT',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus, { message: 'Invalid invoice status' })
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Invoice notes',
    example: 'Thank you for your business',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'Payment due within 30 days',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Terms cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  terms?: string;

  @ApiPropertyOptional({
    description: 'Payment instructions',
    example: 'Please pay to Airtel Money: 0971234567',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Payment instructions cannot exceed 1000 characters',
  })
  @Transform(({ value }) => value?.trim())
  paymentInstructions?: string;

  @ApiProperty({
    description: 'Invoice items',
    type: [CreateInvoiceItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @ApiPropertyOptional({
    description: 'Paid amount in ZMW',
    example: 500.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Paid amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Paid amount cannot be negative' })
  paidAmount?: number;

  @ApiPropertyOptional({
    description: 'ZRA submission status',
    example: 'PENDING',
    enum: ZraSubmissionStatus,
  })
  @IsOptional()
  @IsEnum(ZraSubmissionStatus, { message: 'Invalid ZRA submission status' })
  zraSubmissionStatus?: ZraSubmissionStatus;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({
    description: 'Customer ID filter',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Invoice status filter',
    example: 'SENT',
    enum: InvoiceStatus,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus, { message: 'Invalid invoice status' })
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'ZRA submission status filter',
    example: 'ACCEPTED',
    enum: ZraSubmissionStatus,
  })
  @IsOptional()
  @IsEnum(ZraSubmissionStatus, { message: 'Invalid ZRA submission status' })
  zraSubmissionStatus?: ZraSubmissionStatus;

  @ApiPropertyOptional({
    description: 'Issue date from (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Issue date from must be a valid date' })
  issueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Issue date to (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Issue date to must be a valid date' })
  issueDateTo?: string;

  @ApiPropertyOptional({
    description: 'Due date from (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date from must be a valid date' })
  dueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Due date to (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date to must be a valid date' })
  dueDateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimum amount filter',
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Amount minimum must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Amount minimum cannot be negative' })
  amountMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum amount filter',
    example: 10000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Amount maximum must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Amount maximum cannot be negative' })
  amountMax?: number;

  @ApiPropertyOptional({
    description: 'Search term for invoice number, reference, or customer name',
    example: 'INV-2024',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter overdue invoices only',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOverdue?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Type(() => Number)
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Type(() => Number)
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'issueDate',
    enum: [
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'totalAmount',
      'status',
      'customerName',
    ],
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

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Invoice ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Invoice number' })
  invoiceNumber: string;

  @ApiPropertyOptional({ description: 'Reference/PO number' })
  reference?: string;

  @ApiProperty({ description: 'Issue date' })
  issueDate: Date;

  @ApiProperty({ description: 'Due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'VAT amount' })
  vatAmount: number;

  @ApiProperty({ description: 'Discount amount' })
  discountAmount: number;

  @ApiProperty({ description: 'Total amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Paid amount' })
  paidAmount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Invoice status', enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Terms' })
  terms?: string;

  @ApiPropertyOptional({ description: 'Payment instructions' })
  paymentInstructions?: string;

  @ApiPropertyOptional({
    description: 'ZRA submission status',
    enum: ZraSubmissionStatus,
  })
  zraSubmissionStatus?: ZraSubmissionStatus;

  @ApiPropertyOptional({ description: 'ZRA submission ID' })
  zraSubmissionId?: string;

  @ApiPropertyOptional({ description: 'ZRA submission date' })
  zraSubmissionDate?: Date;

  @ApiPropertyOptional({ description: 'ZRA receipt number' })
  zraReceiptNumber?: string;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Customer information' })
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    zraTin?: string;
  };

  @ApiProperty({ description: 'Invoice items', type: [Object] })
  items: any[];
}

export class InvoiceStatsDto {
  @ApiProperty({ description: 'Total number of invoices' })
  total: number;

  @ApiProperty({ description: 'Number of draft invoices' })
  draft: number;

  @ApiProperty({ description: 'Number of sent invoices' })
  sent: number;

  @ApiProperty({ description: 'Number of paid invoices' })
  paid: number;

  @ApiProperty({ description: 'Number of overdue invoices' })
  overdue: number;

  @ApiProperty({ description: 'Total invoice amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Total paid amount' })
  paidAmount: number;

  @ApiProperty({ description: 'Outstanding amount' })
  outstandingAmount: number;
}

export class InvoiceListResponseDto {
  @ApiProperty({ description: 'List of invoices', type: [InvoiceResponseDto] })
  invoices: InvoiceResponseDto[];

  @ApiProperty({ description: 'Total number of invoices matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
