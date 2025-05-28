import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod, RecurrencePattern } from '@prisma/client';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Office Supplies',
  })
  name: string;

  @ApiProperty({
    description: 'Category type',
    example: 'EXPENSE',
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Category color',
    example: '#FF5722',
  })
  color?: string;
}

export class ReceiptResponseDto {
  @ApiProperty({
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'receipt_001.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'File type',
    example: 'image/jpeg',
  })
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Storage path',
    example: '/receipts/2024/01/receipt_001.jpg',
  })
  storagePath: string;

  @ApiPropertyOptional({
    description: 'Thumbnail path',
    example: '/receipts/2024/01/thumbnails/receipt_001_thumb.jpg',
  })
  thumbnailPath?: string;

  @ApiPropertyOptional({
    description: 'OCR processing status',
    example: 'COMPLETED',
  })
  ocrStatus?: string;

  @ApiProperty({
    description: 'Upload date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class ExpenseTagResponseDto {
  @ApiProperty({
    description: 'Tag ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'Urgent',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Tag color',
    example: '#FF5722',
  })
  color?: string;
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 150.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction date',
    example: '2024-01-15T10:30:00Z',
  })
  transactionDate: Date;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Office supplies purchase',
  })
  description: string;
}

export class ExpenseResponseDto {
  @ApiProperty({
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Category information',
    type: CategoryResponseDto,
  })
  category: CategoryResponseDto;

  @ApiPropertyOptional({
    description: 'Linked transaction information',
    type: TransactionResponseDto,
  })
  transaction?: TransactionResponseDto;

  @ApiPropertyOptional({
    description: 'Vendor or supplier name',
    example: 'Office Supplies Ltd',
  })
  vendor?: string;

  @ApiProperty({
    description: 'Expense date',
    example: '2024-01-15',
  })
  date: Date;

  @ApiProperty({
    description: 'Expense amount',
    example: 150.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'ZMW',
  })
  currency: string;

  @ApiProperty({
    description: 'Expense description',
    example: 'Office supplies for Q1',
  })
  description: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Reference number',
    example: 'REF-2024-001',
  })
  reference?: string;

  @ApiProperty({
    description: 'Whether this is a recurring expense',
    example: false,
  })
  isRecurring: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern',
    enum: RecurrencePattern,
    example: RecurrencePattern.MONTHLY,
  })
  recurrencePattern?: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'Recurrence end date',
    example: '2024-12-31',
  })
  recurrenceEndDate?: Date;

  @ApiProperty({
    description: 'Whether this expense is tax deductible',
    example: true,
  })
  isTaxDeductible: boolean;

  @ApiProperty({
    description: 'VAT amount',
    example: 24.08,
  })
  vatAmount: number;

  @ApiProperty({
    description: 'Withholding tax amount',
    example: 15.05,
  })
  withholdingTax: number;

  @ApiProperty({
    description: 'Expense status',
    enum: ExpenseStatus,
    example: ExpenseStatus.APPROVED,
  })
  status: ExpenseStatus;

  @ApiProperty({
    description: 'User who created the expense',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy: string;

  @ApiPropertyOptional({
    description: 'User who approved the expense',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  approvedBy?: string;

  @ApiPropertyOptional({
    description: 'Approval date',
    example: '2024-01-16T10:30:00Z',
  })
  approvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Approved by manager',
  })
  notes?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Attached receipts',
    type: [ReceiptResponseDto],
  })
  receipts?: ReceiptResponseDto[];

  @ApiPropertyOptional({
    description: 'Expense tags',
    type: [ExpenseTagResponseDto],
  })
  tags?: ExpenseTagResponseDto[];
}

export class ExpenseListResponseDto {
  @ApiProperty({
    description: 'List of expenses',
    type: [ExpenseResponseDto],
  })
  expenses: ExpenseResponseDto[];

  @ApiProperty({
    description: 'Total number of expenses',
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

export class ExpenseStatsResponseDto {
  @ApiProperty({
    description: 'Total number of expenses',
    example: 150,
  })
  totalExpenses: number;

  @ApiProperty({
    description: 'Total amount of all expenses',
    example: 15750.50,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Average expense amount',
    example: 105.00,
  })
  averageAmount: number;

  @ApiProperty({
    description: 'Expenses grouped by status',
    example: {
      DRAFT: 5,
      PENDING_APPROVAL: 10,
      APPROVED: 120,
      REJECTED: 15,
    },
  })
  expensesByStatus: Record<ExpenseStatus, number>;

  @ApiProperty({
    description: 'Expenses grouped by payment method',
    example: {
      CASH: 30,
      MOBILE_MONEY: 80,
      BANK_TRANSFER: 25,
      CREDIT_CARD: 15,
    },
  })
  expensesByPaymentMethod: Record<PaymentMethod, number>;

  @ApiProperty({
    description: 'Expenses grouped by category',
    example: [
      {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        categoryName: 'Office Supplies',
        count: 45,
        totalAmount: 4500.00,
      },
    ],
  })
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    totalAmount: number;
  }>;
}
