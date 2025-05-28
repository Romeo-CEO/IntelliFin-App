import { apiClient } from '@/lib/api-client';
import {
  ReceiptResponse,
  ReceiptListResponse,
  ReceiptStatsResponse,
  ReceiptQueryDto,
  OcrDataResponse,
  ExpenseUpdateSuggestions,
} from '@/types/receipt';

export class ReceiptService {
  private readonly baseUrl = '/receipts';

  /**
   * Upload receipt for an expense
   */
  async uploadReceipt(
    expenseId: string,
    file: File,
    generateThumbnail: boolean = true,
  ): Promise<ReceiptResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('generateThumbnail', generateThumbnail.toString());

    const response = await apiClient.post<ReceiptResponse>(
      `${this.baseUrl}/upload/${expenseId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  }

  /**
   * Get receipts with filters and pagination
   */
  async getReceipts(params?: ReceiptQueryDto): Promise<ReceiptListResponse> {
    const response = await apiClient.get<ReceiptListResponse>(this.baseUrl, {
      params,
    });
    return response.data;
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(id: string): Promise<ReceiptResponse> {
    const response = await apiClient.get<ReceiptResponse>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Get receipts for a specific expense
   */
  async getReceiptsByExpenseId(expenseId: string): Promise<ReceiptResponse[]> {
    const response = await apiClient.get<ReceiptResponse[]>(`${this.baseUrl}/expense/${expenseId}`);
    return response.data;
  }

  /**
   * Delete a receipt
   */
  async deleteReceipt(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get receipt file URL
   */
  async getReceiptUrl(id: string): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>(`${this.baseUrl}/${id}/url`);
    return response.data;
  }

  /**
   * Get receipt thumbnail URL
   */
  async getReceiptThumbnailUrl(id: string): Promise<{ thumbnailUrl: string | null }> {
    const response = await apiClient.get<{ thumbnailUrl: string | null }>(
      `${this.baseUrl}/${id}/thumbnail`,
    );
    return response.data;
  }

  /**
   * Download receipt file
   */
  async downloadReceipt(id: string): Promise<void> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    
    // Try to get filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'receipt';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get receipt OCR data
   */
  async getReceiptOcrData(id: string): Promise<OcrDataResponse> {
    const response = await apiClient.get<OcrDataResponse>(`${this.baseUrl}/${id}/ocr`);
    return response.data;
  }

  /**
   * Reprocess OCR for a receipt
   */
  async reprocessOcr(id: string): Promise<ReceiptResponse> {
    const response = await apiClient.post<ReceiptResponse>(`${this.baseUrl}/${id}/reprocess-ocr`);
    return response.data;
  }

  /**
   * Get expense update suggestions based on OCR data
   */
  async getExpenseUpdateSuggestions(id: string): Promise<ExpenseUpdateSuggestions> {
    const response = await apiClient.get<ExpenseUpdateSuggestions>(`${this.baseUrl}/${id}/suggestions`);
    return response.data;
  }

  /**
   * Get receipt statistics
   */
  async getReceiptStats(dateFrom?: string, dateTo?: string): Promise<ReceiptStatsResponse> {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const response = await apiClient.get<ReceiptStatsResponse>(`${this.baseUrl}/stats`, {
      params,
    });
    return response.data;
  }

  /**
   * Bulk upload receipts
   */
  async bulkUploadReceipts(
    expenseId: string,
    files: File[],
    generateThumbnails: boolean = true,
  ): Promise<ReceiptResponse[]> {
    const uploadPromises = files.map(file =>
      this.uploadReceipt(expenseId, file, generateThumbnails)
    );

    return await Promise.all(uploadPromises);
  }

  /**
   * Get receipt summary for dashboard
   */
  async getReceiptSummary(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalReceipts: number;
    totalFileSize: number;
    pendingOcr: number;
    completedOcr: number;
    failedOcr: number;
    recentReceipts: ReceiptResponse[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/summary`, {
      params: { period },
    });
    return response.data;
  }

  /**
   * Search receipts by OCR text
   */
  async searchReceiptsByText(
    searchText: string,
    params?: Omit<ReceiptQueryDto, 'search'>,
  ): Promise<ReceiptListResponse> {
    const searchParams = {
      ...params,
      search: searchText,
    };

    return await this.getReceipts(searchParams);
  }

  /**
   * Get receipts by OCR status
   */
  async getReceiptsByOcrStatus(
    status: 'PENDING' | 'COMPLETED' | 'FAILED',
    params?: Omit<ReceiptQueryDto, 'ocrStatus'>,
  ): Promise<ReceiptListResponse> {
    const searchParams = {
      ...params,
      ocrStatus: status,
    };

    return await this.getReceipts(searchParams);
  }

  /**
   * Get receipts by file type
   */
  async getReceiptsByFileType(
    fileType: string,
    params?: Omit<ReceiptQueryDto, 'fileType'>,
  ): Promise<ReceiptListResponse> {
    const searchParams = {
      ...params,
      fileType,
    };

    return await this.getReceipts(searchParams);
  }

  /**
   * Validate receipt file before upload
   */
  validateReceiptFile(file: File): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed. Allowed types: images and PDFs`);
    }

    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      errors.push('File must have a valid name');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get receipt processing status
   */
  async getReceiptProcessingStatus(id: string): Promise<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    progress?: number;
    message?: string;
  }> {
    const receipt = await this.getReceiptById(id);
    
    return {
      status: receipt.ocrStatus,
      message: receipt.ocrStatus === 'FAILED' ? 'OCR processing failed' : undefined,
    };
  }

  /**
   * Export receipts data
   */
  async exportReceipts(
    format: 'csv' | 'excel' = 'csv',
    params?: ReceiptQueryDto,
  ): Promise<void> {
    const response = await apiClient.get(`${this.baseUrl}/export`, {
      params: {
        ...params,
        format,
      },
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipts-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const receiptService = new ReceiptService();
