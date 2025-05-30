import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { expenseService } from '@/services/expense.service';
import {
  ExpenseQueryDto,
  ExpenseResponse,
  ExpenseListResponse,
  ExpenseStatsResponse,
  CreateExpenseDto,
  UpdateExpenseDto,
} from '@/types/expense';

// Hook for fetching expenses with filters and pagination
export function useExpenses(params?: ExpenseQueryDto) {
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await expenseService.getExpenses(params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses: data?.expenses || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch: fetchExpenses,
  };
}

// Hook for fetching a single expense
export function useExpense(expenseId: string | null) {
  const [expense, setExpense] = useState<ExpenseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await expenseService.getExpenseById(expenseId);
      setExpense(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expense');
      toast.error('Failed to load expense details');
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  return {
    expense,
    isLoading,
    error,
    refetch: fetchExpense,
  };
}

// Hook for expense statistics
export function useExpenseStats(dateFrom?: string, dateTo?: string) {
  const [stats, setStats] = useState<ExpenseStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await expenseService.getExpenseStats(dateFrom, dateTo);
      setStats(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expense statistics');
      toast.error('Failed to load expense statistics');
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

// Hook for expense operations (create, update, delete, etc.)
export function useExpenseOperations() {
  const [isLoading, setIsLoading] = useState(false);

  const createExpense = async (data: CreateExpenseDto): Promise<ExpenseResponse> => {
    setIsLoading(true);
    try {
      const response = await expenseService.createExpense(data);
      toast.success('Expense created successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create expense');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateExpense = async (id: string, data: UpdateExpenseDto): Promise<ExpenseResponse> => {
    setIsLoading(true);
    try {
      const response = await expenseService.updateExpense(id, data);
      toast.success('Expense updated successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update expense');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await expenseService.deleteExpense(id);
      toast.success('Expense deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const approveExpense = async (id: string): Promise<ExpenseResponse> => {
    setIsLoading(true);
    try {
      const response = await expenseService.approveExpense(id);
      toast.success('Expense approved successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve expense');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectExpense = async (id: string, notes?: string): Promise<ExpenseResponse> => {
    setIsLoading(true);
    try {
      const response = await expenseService.rejectExpense(id, notes);
      toast.success('Expense rejected successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject expense');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkApproveExpenses = async (expenseIds: string[]): Promise<void> => {
    setIsLoading(true);
    try {
      await expenseService.bulkApproveExpenses(expenseIds);
      toast.success(`${expenseIds.length} expenses approved successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve expenses');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkRejectExpenses = async (expenseIds: string[], notes?: string): Promise<void> => {
    setIsLoading(true);
    try {
      await expenseService.bulkRejectExpenses(expenseIds, notes);
      toast.success(`${expenseIds.length} expenses rejected successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject expenses');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDeleteExpenses = async (expenseIds: string[]): Promise<void> => {
    setIsLoading(true);
    try {
      await expenseService.bulkDeleteExpenses(expenseIds);
      toast.success(`${expenseIds.length} expenses deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expenses');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const exportExpenses = async (params?: ExpenseQueryDto): Promise<void> => {
    setIsLoading(true);
    try {
      const blob = await expenseService.exportExpenses(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Expenses exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export expenses');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    bulkApproveExpenses,
    bulkRejectExpenses,
    bulkDeleteExpenses,
    exportExpenses,
  };
}

// Hook for expense summary (dashboard)
export function useExpenseSummary(period: 'today' | 'week' | 'month' | 'year' = 'month') {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await expenseService.getExpenseSummary(period);
      setSummary(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expense summary');
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

// Hook for expense trends
export function useExpenseTrends(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await expenseService.getExpenseTrends(period, groupBy);
      setTrends(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expense trends');
    } finally {
      setIsLoading(false);
    }
  }, [period, groupBy]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    trends,
    isLoading,
    error,
    refetch: fetchTrends,
  };
}
