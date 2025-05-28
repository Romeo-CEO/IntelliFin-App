import { apiClient } from '@/lib/api-client';
import { 
  CreateExpenseDto, 
  UpdateExpenseDto, 
  ExpenseQueryDto,
  ExpenseResponse,
  ExpenseListResponse,
  ExpenseStatsResponse,
} from '@/types/expense';

export class ExpenseService {
  private readonly baseUrl = '/expenses';

  /**
   * Create a new expense
   */
  async createExpense(data: CreateExpenseDto): Promise<ExpenseResponse> {
    const response = await apiClient.post<ExpenseResponse>(this.baseUrl, data);
    return response.data;
  }

  /**
   * Get expenses with filters and pagination
   */
  async getExpenses(params?: ExpenseQueryDto): Promise<ExpenseListResponse> {
    const response = await apiClient.get<ExpenseListResponse>(this.baseUrl, {
      params,
    });
    return response.data;
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string): Promise<ExpenseResponse> {
    const response = await apiClient.get<ExpenseResponse>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Update an expense
   */
  async updateExpense(id: string, data: UpdateExpenseDto): Promise<ExpenseResponse> {
    const response = await apiClient.put<ExpenseResponse>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(dateFrom?: string, dateTo?: string): Promise<ExpenseStatsResponse> {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const response = await apiClient.get<ExpenseStatsResponse>(`${this.baseUrl}/stats`, {
      params,
    });
    return response.data;
  }

  /**
   * Approve an expense
   */
  async approveExpense(id: string): Promise<ExpenseResponse> {
    const response = await apiClient.put<ExpenseResponse>(`${this.baseUrl}/${id}/approve`);
    return response.data;
  }

  /**
   * Reject an expense
   */
  async rejectExpense(id: string, notes?: string): Promise<ExpenseResponse> {
    const response = await apiClient.put<ExpenseResponse>(`${this.baseUrl}/${id}/reject`, {
      notes,
    });
    return response.data;
  }

  /**
   * Export expenses to CSV
   */
  async exportExpenses(params?: ExpenseQueryDto): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get expense categories for filtering
   */
  async getExpenseCategories(): Promise<any[]> {
    const response = await apiClient.get('/categories', {
      params: { type: 'EXPENSE' },
    });
    return response.data.categories || [];
  }

  /**
   * Bulk approve expenses
   */
  async bulkApproveExpenses(expenseIds: string[]): Promise<void> {
    await apiClient.post(`${this.baseUrl}/bulk-approve`, {
      expenseIds,
    });
  }

  /**
   * Bulk reject expenses
   */
  async bulkRejectExpenses(expenseIds: string[], notes?: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/bulk-reject`, {
      expenseIds,
      notes,
    });
  }

  /**
   * Bulk delete expenses
   */
  async bulkDeleteExpenses(expenseIds: string[]): Promise<void> {
    await apiClient.post(`${this.baseUrl}/bulk-delete`, {
      expenseIds,
    });
  }

  /**
   * Get expense summary for dashboard
   */
  async getExpenseSummary(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalAmount: number;
    totalCount: number;
    pendingAmount: number;
    pendingCount: number;
    approvedAmount: number;
    approvedCount: number;
    topCategories: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      count: number;
    }>;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/summary`, {
      params: { period },
    });
    return response.data;
  }

  /**
   * Get expense trends for analytics
   */
  async getExpenseTrends(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string;
    amount: number;
    count: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/trends`, {
      params: { period, groupBy },
    });
    return response.data;
  }

  /**
   * Get expense comparison between periods
   */
  async getExpenseComparison(
    currentPeriodStart: string,
    currentPeriodEnd: string,
    previousPeriodStart: string,
    previousPeriodEnd: string
  ): Promise<{
    current: {
      totalAmount: number;
      totalCount: number;
      averageAmount: number;
    };
    previous: {
      totalAmount: number;
      totalCount: number;
      averageAmount: number;
    };
    changes: {
      amountChange: number;
      amountChangePercent: number;
      countChange: number;
      countChangePercent: number;
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/comparison`, {
      params: {
        currentPeriodStart,
        currentPeriodEnd,
        previousPeriodStart,
        previousPeriodEnd,
      },
    });
    return response.data;
  }

  /**
   * Get recurring expenses
   */
  async getRecurringExpenses(): Promise<ExpenseListResponse> {
    const response = await apiClient.get<ExpenseListResponse>(`${this.baseUrl}/recurring`);
    return response.data;
  }

  /**
   * Create next occurrence of recurring expense
   */
  async createRecurringExpenseOccurrence(parentExpenseId: string): Promise<ExpenseResponse> {
    const response = await apiClient.post<ExpenseResponse>(
      `${this.baseUrl}/${parentExpenseId}/create-occurrence`
    );
    return response.data;
  }

  /**
   * Stop recurring expense
   */
  async stopRecurringExpense(expenseId: string): Promise<ExpenseResponse> {
    const response = await apiClient.put<ExpenseResponse>(
      `${this.baseUrl}/${expenseId}/stop-recurring`
    );
    return response.data;
  }

  /**
   * Get expense audit trail
   */
  async getExpenseAuditTrail(expenseId: string): Promise<Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    changes: Record<string, any>;
    notes?: string;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/${expenseId}/audit-trail`);
    return response.data;
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();
