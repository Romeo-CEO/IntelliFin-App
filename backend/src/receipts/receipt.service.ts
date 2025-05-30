import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OcrStatus, Prisma, Receipt } from '@prisma/client';
import {
  ReceiptFilters,
  ReceiptRepository,
  ReceiptStats,
} from './receipt.repository';
import {
  ReceiptStorageService,
  UploadOptions,
} from '../storage/receipt-storage.service';
import { OcrService } from '../ocr/ocr.service';
import { ExpenseService } from '../expenses/expense.service';

export interface CreateReceiptDto {
  expenseId: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimetype: string;
  };
  generateThumbnail?: boolean;
}

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

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private readonly receiptRepository: ReceiptRepository,
    private readonly storageService: ReceiptStorageService,
    private readonly ocrService: OcrService,
    private readonly expenseService: ExpenseService
  ) {}

  /**
   * Upload and create a new receipt
   */
  async createReceipt(
    organizationId: string,
    userId: string,
    createReceiptDto: CreateReceiptDto
  ): Promise<Receipt> {
    try {
      // Validate expense exists and belongs to organization
      const expense = await this.expenseService.getExpenseById(
        createReceiptDto.expenseId,
        organizationId
      );

      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      // Upload file to storage
      const uploadOptions: UploadOptions = {
        organizationId,
        expenseId: createReceiptDto.expenseId,
        originalFileName: createReceiptDto.file.originalName,
        contentType: createReceiptDto.file.mimetype,
        generateThumbnail: createReceiptDto.generateThumbnail ?? true,
      };

      const uploadResult = await this.storageService.uploadReceipt(
        createReceiptDto.file.buffer,
        uploadOptions
      );

      // Create receipt record
      const receiptData: Prisma.ReceiptCreateInput = {
        expense: {
          connect: { id: createReceiptDto.expenseId },
        },
        fileName: uploadResult.fileName,
        fileType: uploadResult.contentType,
        fileSize: uploadResult.fileSize,
        storagePath: uploadResult.storagePath,
        thumbnailPath: uploadResult.thumbnailPath,
        ocrStatus: OcrStatus.PENDING,
      };

      const receipt = await this.receiptRepository.create(receiptData);

      // Queue OCR processing asynchronously
      this.processOcrAsync(
        receipt.id,
        createReceiptDto.file.buffer,
        uploadResult.contentType
      );

      this.logger.log(
        `Created receipt: ${receipt.id} for expense: ${createReceiptDto.expenseId}`
      );
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to create receipt: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(id: string, organizationId: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(id);

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    // Verify receipt belongs to organization
    if (receipt.expense.organizationId !== organizationId) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    return receipt;
  }

  /**
   * Get receipts for an expense
   */
  async getReceiptsByExpenseId(
    expenseId: string,
    organizationId: string
  ): Promise<Receipt[]> {
    // Verify expense belongs to organization
    await this.expenseService.getExpenseById(expenseId, organizationId);

    return await this.receiptRepository.findByExpenseId(expenseId);
  }

  /**
   * Get receipts with filters and pagination
   */
  async getReceipts(organizationId: string, query: ReceiptQueryDto) {
    try {
      const filters: ReceiptFilters = {
        organizationId,
        expenseId: query.expenseId,
        ocrStatus: query.ocrStatus,
        fileType: query.fileType,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        search: query.search,
      };

      // Build order by clause
      const orderBy: Prisma.ReceiptOrderByWithRelationInput = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      return await this.receiptRepository.findMany(
        filters,
        query.page || 1,
        query.limit || 20,
        orderBy
      );
    } catch (error) {
      this.logger.error(`Failed to get receipts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(id: string, organizationId: string): Promise<void> {
    try {
      // Get receipt and verify ownership
      const receipt = await this.getReceiptById(id, organizationId);

      // Delete from storage
      await this.storageService.deleteReceipt(
        receipt.storagePath,
        receipt.thumbnailPath
      );

      // Delete from database
      await this.receiptRepository.delete(id);

      this.logger.log(`Deleted receipt: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete receipt: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get receipt file URL
   */
  async getReceiptUrl(id: string, organizationId: string): Promise<string> {
    const receipt = await this.getReceiptById(id, organizationId);
    return await this.storageService.generateSecureUrl(receipt.storagePath);
  }

  /**
   * Get receipt thumbnail URL
   */
  async getReceiptThumbnailUrl(
    id: string,
    organizationId: string
  ): Promise<string | null> {
    const receipt = await this.getReceiptById(id, organizationId);

    if (!receipt.thumbnailPath) {
      return null;
    }

    return await this.storageService.generateSecureUrl(receipt.thumbnailPath);
  }

  /**
   * Download receipt file
   */
  async downloadReceipt(
    id: string,
    organizationId: string
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType: string;
  }> {
    const receipt = await this.getReceiptById(id, organizationId);
    const buffer = await this.storageService.downloadReceipt(
      receipt.storagePath
    );

    return {
      buffer,
      fileName: receipt.fileName,
      contentType: receipt.fileType,
    };
  }

  /**
   * Get receipt OCR data
   */
  async getReceiptOcrData(
    id: string,
    organizationId: string
  ): Promise<{
    ocrStatus: OcrStatus;
    ocrText?: string;
    ocrData?: any;
    ocrProcessedAt?: Date;
  }> {
    const receipt = await this.getReceiptById(id, organizationId);

    return {
      ocrStatus: receipt.ocrStatus,
      ocrText: receipt.ocrText,
      ocrData: receipt.ocrData,
      ocrProcessedAt: receipt.ocrProcessedAt,
    };
  }

  /**
   * Reprocess OCR for a receipt
   */
  async reprocessOcr(id: string, organizationId: string): Promise<Receipt> {
    try {
      const receipt = await this.getReceiptById(id, organizationId);

      // Download file from storage
      const fileBuffer = await this.storageService.downloadReceipt(
        receipt.storagePath
      );

      // Reset OCR status to pending
      await this.receiptRepository.updateOcrData(id, OcrStatus.PENDING);

      // Process OCR
      await this.processOcrAsync(id, fileBuffer, receipt.fileType);

      this.logger.log(`Reprocessing OCR for receipt: ${id}`);
      return await this.receiptRepository.findById(id);
    } catch (error) {
      this.logger.error(`Failed to reprocess OCR: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get receipt statistics
   */
  async getReceiptStats(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ReceiptStats> {
    try {
      const fromDate = dateFrom ? new Date(dateFrom) : undefined;
      const toDate = dateTo ? new Date(dateTo) : undefined;

      return await this.receiptRepository.getStats(
        organizationId,
        fromDate,
        toDate
      );
    } catch (error) {
      this.logger.error(`Failed to get receipt stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Process OCR asynchronously
   */
  private async processOcrAsync(
    receiptId: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    try {
      // Process OCR
      const ocrResult = await this.ocrService.processReceipt(
        fileBuffer,
        contentType,
        {
          extractStructuredData: true,
          language: 'en',
        }
      );

      // Validate OCR result
      if (!this.ocrService.validateOcrResult(ocrResult)) {
        await this.receiptRepository.updateOcrData(receiptId, OcrStatus.FAILED);
        this.logger.warn(`OCR validation failed for receipt: ${receiptId}`);
        return;
      }

      // Update receipt with OCR data
      await this.receiptRepository.updateOcrData(
        receiptId,
        OcrStatus.COMPLETED,
        ocrResult.text,
        ocrResult.extractedData
      );

      this.logger.log(`OCR processing completed for receipt: ${receiptId}`);
    } catch (error) {
      // Update receipt with failed status
      await this.receiptRepository.updateOcrData(receiptId, OcrStatus.FAILED);
      this.logger.error(
        `OCR processing failed for receipt ${receiptId}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Process pending OCR receipts (for background job)
   */
  async processPendingOcr(limit: number = 10): Promise<void> {
    try {
      const pendingReceipts =
        await this.receiptRepository.findPendingOcr(limit);

      for (const receipt of pendingReceipts) {
        try {
          // Download file from storage
          const fileBuffer = await this.storageService.downloadReceipt(
            receipt.storagePath
          );

          // Process OCR
          await this.processOcrAsync(receipt.id, fileBuffer, receipt.fileType);
        } catch (error) {
          this.logger.error(
            `Failed to process OCR for receipt ${receipt.id}: ${error.message}`,
            error
          );
        }
      }

      this.logger.log(
        `Processed ${pendingReceipts.length} pending OCR receipts`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process pending OCR receipts: ${error.message}`,
        error
      );
    }
  }

  /**
   * Suggest expense updates based on OCR data
   */
  async suggestExpenseUpdates(
    receiptId: string,
    organizationId: string
  ): Promise<{
    suggestions: {
      vendor?: string;
      amount?: number;
      date?: string;
      description?: string;
    };
    confidence: number;
  }> {
    try {
      const receipt = await this.getReceiptById(receiptId, organizationId);

      if (receipt.ocrStatus !== OcrStatus.COMPLETED || !receipt.ocrData) {
        throw new BadRequestException(
          'OCR data not available for this receipt'
        );
      }

      const ocrData = receipt.ocrData as any;
      const suggestions: any = {};
      let confidence = 0;

      // Suggest vendor if extracted
      if (ocrData.vendor) {
        suggestions.vendor = ocrData.vendor;
        confidence += 0.3;
      }

      // Suggest amount if extracted
      if (ocrData.total && ocrData.total > 0) {
        suggestions.amount = ocrData.total;
        confidence += 0.4;
      }

      // Suggest date if extracted
      if (ocrData.date) {
        suggestions.date = ocrData.date;
        confidence += 0.2;
      }

      // Generate description from vendor and items
      if (ocrData.vendor || (ocrData.items && ocrData.items.length > 0)) {
        let description = '';
        if (ocrData.vendor) {
          description += `Purchase from ${ocrData.vendor}`;
        }
        if (ocrData.items && ocrData.items.length > 0) {
          const itemDescriptions = ocrData.items
            .slice(0, 3)
            .map((item: any) => item.description);
          description += description
            ? ` - ${itemDescriptions.join(', ')}`
            : itemDescriptions.join(', ');
        }
        if (description) {
          suggestions.description = description;
          confidence += 0.1;
        }
      }

      return {
        suggestions,
        confidence: Math.min(confidence, 1.0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to suggest expense updates: ${error.message}`,
        error
      );
      throw error;
    }
  }
}
