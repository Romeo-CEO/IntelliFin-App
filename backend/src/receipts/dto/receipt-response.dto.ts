import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OcrStatus } from '@prisma/client';

export class ExpenseInfoDto {
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
    description: 'Expense description',
    example: 'Office supplies purchase',
  })
  description: string;

  @ApiProperty({
    description: 'Expense amount',
    example: 150.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Expense date',
    example: '2024-01-15',
  })
  date: Date;

  @ApiPropertyOptional({
    description: 'Vendor name',
    example: 'Office Supplies Ltd',
  })
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Expense category',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      color: { type: 'string' },
    },
  })
  category?: {
    id: string;
    name: string;
    color?: string;
  };
}

export class OcrDataDto {
  @ApiPropertyOptional({
    description: 'Extracted vendor name',
    example: 'Office Supplies Ltd',
  })
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Extracted date',
    example: '2024-01-15',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Extracted total amount',
    example: 150.50,
  })
  total?: number;

  @ApiPropertyOptional({
    description: 'Extracted subtotal',
    example: 130.00,
  })
  subtotal?: number;

  @ApiPropertyOptional({
    description: 'Extracted tax amount',
    example: 20.50,
  })
  tax?: number;

  @ApiPropertyOptional({
    description: 'Extracted VAT amount',
    example: 20.50,
  })
  vatAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Extracted line items',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        quantity: { type: 'number' },
        unitPrice: { type: 'number' },
        amount: { type: 'number' },
      },
    },
  })
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;

  @ApiPropertyOptional({
    description: 'Receipt number',
    example: 'REC-001234',
  })
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'Cash',
  })
  paymentMethod?: string;
}

export class ReceiptResponseDto {
  @ApiProperty({
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  expenseId: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'receipt_001.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'File type/MIME type',
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
    example: 'receipts/org123/2024/01/expense456/receipt_001.jpg',
  })
  storagePath: string;

  @ApiPropertyOptional({
    description: 'Thumbnail storage path',
    example: 'receipts/org123/2024/01/expense456/thumbnails/thumb_receipt_001.jpg',
  })
  thumbnailPath?: string;

  @ApiPropertyOptional({
    description: 'Raw OCR text',
    example: 'SHOPRITE ZAMBIA\n123 Cairo Road, Lusaka\nTotal: K101.50',
  })
  ocrText?: string;

  @ApiPropertyOptional({
    description: 'Structured OCR data',
    type: OcrDataDto,
  })
  ocrData?: OcrDataDto;

  @ApiProperty({
    description: 'OCR processing status',
    enum: OcrStatus,
    example: OcrStatus.COMPLETED,
  })
  ocrStatus: OcrStatus;

  @ApiPropertyOptional({
    description: 'OCR processing completion time',
    example: '2024-01-15T10:30:00Z',
  })
  ocrProcessedAt?: Date;

  @ApiProperty({
    description: 'Receipt creation time',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Associated expense information',
    type: ExpenseInfoDto,
  })
  expense?: ExpenseInfoDto;
}

export class ReceiptListResponseDto {
  @ApiProperty({
    description: 'List of receipts',
    type: [ReceiptResponseDto],
  })
  receipts: ReceiptResponseDto[];

  @ApiProperty({
    description: 'Total number of receipts',
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

export class ReceiptStatsResponseDto {
  @ApiProperty({
    description: 'Total number of receipts',
    example: 150,
  })
  totalReceipts: number;

  @ApiProperty({
    description: 'Total file size of all receipts in bytes',
    example: 157286400,
  })
  totalFileSize: number;

  @ApiProperty({
    description: 'Average file size in bytes',
    example: 1048576,
  })
  averageFileSize: number;

  @ApiProperty({
    description: 'Receipts grouped by OCR status',
    example: {
      PENDING: 5,
      COMPLETED: 120,
      FAILED: 25,
    },
  })
  receiptsByStatus: Record<OcrStatus, number>;

  @ApiProperty({
    description: 'Receipts grouped by file type',
    example: {
      'image/jpeg': 80,
      'image/png': 45,
      'application/pdf': 25,
    },
  })
  receiptsByFileType: Record<string, number>;
}

export class ReceiptQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  expenseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by OCR status',
    enum: OcrStatus,
    example: OcrStatus.COMPLETED,
  })
  ocrStatus?: OcrStatus;

  @ApiPropertyOptional({
    description: 'Filter by file type',
    example: 'image/jpeg',
  })
  fileType?: string;

  @ApiPropertyOptional({
    description: 'Filter by date from (inclusive)',
    example: '2024-01-01',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to (inclusive)',
    example: '2024-12-31',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Search in file name, OCR text, or expense description',
    example: 'office supplies',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'fileName', 'fileSize', 'ocrStatus'],
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ReceiptUploadResponseDto {
  @ApiProperty({
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Upload status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'File name',
    example: 'receipt_001.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiProperty({
    description: 'OCR processing status',
    enum: OcrStatus,
    example: OcrStatus.PENDING,
  })
  ocrStatus: OcrStatus;

  @ApiPropertyOptional({
    description: 'Thumbnail URL if generated',
    example: 'https://storage.example.com/thumbnails/thumb_receipt_001.jpg',
  })
  thumbnailUrl?: string;
}

export class ExpenseUpdateSuggestionsDto {
  @ApiProperty({
    description: 'Suggested expense updates',
    type: 'object',
    properties: {
      vendor: { type: 'string', description: 'Suggested vendor name' },
      amount: { type: 'number', description: 'Suggested amount' },
      date: { type: 'string', description: 'Suggested date' },
      description: { type: 'string', description: 'Suggested description' },
    },
  })
  suggestions: {
    vendor?: string;
    amount?: number;
    date?: string;
    description?: string;
  };

  @ApiProperty({
    description: 'Confidence score for suggestions (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;
}
