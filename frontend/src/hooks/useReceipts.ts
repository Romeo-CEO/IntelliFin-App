import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { receiptService } from '@/services/receipt.service';
import {
  ReceiptQueryDto,
  ReceiptResponse,
  ReceiptListResponse,
  ReceiptStatsResponse,
  OcrDataResponse,
  ExpenseUpdateSuggestions,
  ReceiptSummary,
} from '@/types/receipt';

// Hook for fetching receipts with filters and pagination
export function useReceipts(params?: ReceiptQueryDto) {
  const [data, setData] = useState<ReceiptListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceipts(params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipts');
      toast.error('Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts: data?.receipts || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch: fetchReceipts,
  };
}

// Hook for fetching a single receipt
export function useReceipt(receiptId: string | null) {
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    if (!receiptId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceiptById(receiptId);
      setReceipt(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipt');
      toast.error('Failed to load receipt details');
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  return {
    receipt,
    isLoading,
    error,
    refetch: fetchReceipt,
  };
}

// Hook for receipts by expense ID
export function useReceiptsByExpense(expenseId: string | null) {
  const [receipts, setReceipts] = useState<ReceiptResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!expenseId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceiptsByExpenseId(expenseId);
      setReceipts(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipts');
      toast.error('Failed to load expense receipts');
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    isLoading,
    error,
    refetch: fetchReceipts,
  };
}

// Hook for receipt statistics
export function useReceiptStats(dateFrom?: string, dateTo?: string) {
  const [stats, setStats] = useState<ReceiptStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceiptStats(dateFrom, dateTo);
      setStats(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipt statistics');
      toast.error('Failed to load receipt statistics');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

// Hook for receipt operations (upload, delete, etc.)
export function useReceiptOperations() {
  const [isLoading, setIsLoading] = useState(false);

  const uploadReceipt = async (
    expenseId: string,
    file: File,
    generateThumbnail: boolean = true,
  ): Promise<ReceiptResponse> => {
    setIsLoading(true);
    try {
      // Validate file before upload
      const validation = receiptService.validateReceiptFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await receiptService.uploadReceipt(expenseId, file, generateThumbnail);
      toast.success('Receipt uploaded successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReceipt = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await receiptService.deleteReceipt(id);
      toast.success('Receipt deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete receipt');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const reprocessOcr = async (id: string): Promise<ReceiptResponse> => {
    setIsLoading(true);
    try {
      const response = await receiptService.reprocessOcr(id);
      toast.success('OCR reprocessing started');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reprocess OCR');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReceipt = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await receiptService.downloadReceipt(id);
      toast.success('Receipt downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download receipt');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUploadReceipts = async (
    expenseId: string,
    files: File[],
    generateThumbnails: boolean = true,
  ): Promise<ReceiptResponse[]> => {
    setIsLoading(true);
    try {
      // Validate all files first
      const validationErrors: string[] = [];
      files.forEach((file, index) => {
        const validation = receiptService.validateReceiptFile(file);
        if (!validation.isValid) {
          validationErrors.push(`File ${index + 1} (${file.name}): ${validation.errors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      const responses = await receiptService.bulkUploadReceipts(expenseId, files, generateThumbnails);
      toast.success(`${responses.length} receipts uploaded successfully`);
      return responses;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipts');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const exportReceipts = async (
    format: 'csv' | 'excel' = 'csv',
    params?: ReceiptQueryDto,
  ): Promise<void> => {
    setIsLoading(true);
    try {
      await receiptService.exportReceipts(format, params);
      toast.success('Receipts exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export receipts');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    uploadReceipt,
    deleteReceipt,
    reprocessOcr,
    downloadReceipt,
    bulkUploadReceipts,
    exportReceipts,
  };
}

// Hook for receipt OCR data
export function useReceiptOcr(receiptId: string | null) {
  const [ocrData, setOcrData] = useState<OcrDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOcrData = useCallback(async () => {
    if (!receiptId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceiptOcrData(receiptId);
      setOcrData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch OCR data');
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchOcrData();
  }, [fetchOcrData]);

  return {
    ocrData,
    isLoading,
    error,
    refetch: fetchOcrData,
  };
}

// Hook for expense update suggestions
export function useExpenseUpdateSuggestions(receiptId: string | null) {
  const [suggestions, setSuggestions] = useState<ExpenseUpdateSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!receiptId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getExpenseUpdateSuggestions(receiptId);
      setSuggestions(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
  };
}

// Hook for receipt summary (dashboard)
export function useReceiptSummary(period: 'today' | 'week' | 'month' | 'year' = 'month') {
  const [summary, setSummary] = useState<ReceiptSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await receiptService.getReceiptSummary(period);
      setSummary(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipt summary');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}

// Hook for receipt search
export function useReceiptSearch() {
  const [isLoading, setIsLoading] = useState(false);

  const searchReceipts = async (
    searchText: string,
    params?: Omit<ReceiptQueryDto, 'search'>,
  ): Promise<ReceiptListResponse> => {
    setIsLoading(true);
    try {
      const response = await receiptService.searchReceiptsByText(searchText, params);
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to search receipts');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    searchReceipts,
  };
}
