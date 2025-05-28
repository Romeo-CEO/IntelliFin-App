// OCR status enum
export enum OcrStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Expense info interface
export interface ExpenseInfo {
  id: string;
  organizationId: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
}

// OCR extracted data interface
export interface OcrData {
  vendor?: string;
  date?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  vatAmount?: number;
  currency?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  receiptNumber?: string;
  paymentMethod?: string;
}

// Main receipt interface
export interface Receipt {
  id: string;
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  ocrText?: string;
  ocrData?: OcrData;
  ocrStatus: OcrStatus;
  ocrProcessedAt?: string;
  createdAt: string;
  expense?: ExpenseInfo;
}

// Receipt query DTO
export interface ReceiptQueryDto {
  page?: number;
  limit?: number;
  expenseId?: string;
  ocrStatus?: OcrStatus;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface ReceiptResponse {
  id: string;
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  ocrText?: string;
  ocrData?: OcrData;
  ocrStatus: OcrStatus;
  ocrProcessedAt?: string;
  createdAt: string;
  expense?: ExpenseInfo;
}

export interface ReceiptListResponse {
  receipts: ReceiptResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReceiptStatsResponse {
  totalReceipts: number;
  totalFileSize: number;
  averageFileSize: number;
  receiptsByStatus: Record<OcrStatus, number>;
  receiptsByFileType: Record<string, number>;
}

export interface OcrDataResponse {
  ocrStatus: OcrStatus;
  ocrText?: string;
  ocrData?: OcrData;
  ocrProcessedAt?: string;
}

export interface ExpenseUpdateSuggestions {
  suggestions: {
    vendor?: string;
    amount?: number;
    date?: string;
    description?: string;
  };
  confidence: number;
}

// Upload related types
export interface ReceiptUploadOptions {
  expenseId: string;
  generateThumbnail?: boolean;
}

export interface ReceiptUploadResult {
  id: string;
  status: string;
  fileName: string;
  fileSize: number;
  ocrStatus: OcrStatus;
  thumbnailUrl?: string;
}

// Filter options
export interface ReceiptFilters {
  ocrStatus?: OcrStatus | 'ALL';
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Receipt summary for dashboard
export interface ReceiptSummary {
  totalReceipts: number;
  totalFileSize: number;
  pendingOcr: number;
  completedOcr: number;
  failedOcr: number;
  recentReceipts: ReceiptResponse[];
}

// File validation result
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

// Receipt processing status
export interface ReceiptProcessingStatus {
  status: OcrStatus;
  progress?: number;
  message?: string;
}

// Bulk upload result
export interface BulkUploadResult {
  successful: ReceiptResponse[];
  failed: Array<{
    fileName: string;
    error: string;
  }>;
  totalUploaded: number;
  totalFailed: number;
}

// Receipt analytics
export interface ReceiptAnalytics {
  uploadTrends: Array<{
    date: string;
    count: number;
    totalSize: number;
  }>;
  ocrSuccessRate: number;
  averageProcessingTime: number;
  topFileTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  storageUsage: {
    totalSize: number;
    averageSize: number;
    largestFile: {
      fileName: string;
      size: number;
    };
  };
}

// Receipt search result
export interface ReceiptSearchResult {
  receipt: ReceiptResponse;
  matchedFields: string[];
  relevanceScore: number;
}

// Receipt export options
export interface ReceiptExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeOcrData: boolean;
  includeImages: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: ReceiptFilters;
}

// Receipt backup options
export interface ReceiptBackupOptions {
  includeFiles: boolean;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  encryptBackup: boolean;
  backupLocation: 'local' | 'cloud';
}

// Receipt audit entry
export interface ReceiptAuditEntry {
  id: string;
  receiptId: string;
  action: 'UPLOADED' | 'VIEWED' | 'DOWNLOADED' | 'DELETED' | 'OCR_PROCESSED' | 'OCR_REPROCESSED';
  userId: string;
  userName: string;
  timestamp: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Receipt notification
export interface ReceiptNotification {
  id: string;
  receiptId: string;
  type: 'OCR_COMPLETED' | 'OCR_FAILED' | 'UPLOAD_SUCCESS' | 'UPLOAD_FAILED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Receipt sharing options
export interface ReceiptSharingOptions {
  shareType: 'view' | 'download';
  expiryDate?: string;
  password?: string;
  allowedEmails?: string[];
  maxDownloads?: number;
}

// Receipt sharing link
export interface ReceiptSharingLink {
  id: string;
  receiptId: string;
  shareUrl: string;
  shareType: 'view' | 'download';
  expiryDate?: string;
  isPasswordProtected: boolean;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}
