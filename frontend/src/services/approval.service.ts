import { apiClient } from '@/lib/api-client';
import {
  ApprovalRequest,
  ApprovalRequestListResponse,
  ApprovalStats,
  ApprovalDecisionDto,
  BulkApprovalDto,
  CreateApprovalRequestDto,
  ApprovalRequestQuery,
  PendingApprovalsResponse,
  ApprovalRule,
  CreateApprovalRuleDto,
  UpdateApprovalRuleDto,
} from '@/types/approval';

class ApprovalService {
  private readonly baseUrl = '/approval';

  // ============================================================================
  // APPROVAL REQUESTS
  // ============================================================================

  /**
   * Submit expense for approval
   */
  async submitForApproval(data: CreateApprovalRequestDto): Promise<ApprovalRequest> {
    const response = await apiClient.post(`${this.baseUrl}/requests`, data);
    return response.data.data;
  }

  /**
   * Get approval requests with filters
   */
  async getApprovalRequests(params?: ApprovalRequestQuery): Promise<ApprovalRequestListResponse> {
    const response = await apiClient.get(`${this.baseUrl}/requests`, { params });
    return response.data.data;
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequestById(id: string): Promise<ApprovalRequest> {
    const response = await apiClient.get(`${this.baseUrl}/requests/${id}`);
    return response.data.data;
  }

  /**
   * Cancel approval request
   */
  async cancelApprovalRequest(id: string, reason?: string): Promise<ApprovalRequest> {
    const response = await apiClient.put(`${this.baseUrl}/requests/${id}/cancel`, { reason });
    return response.data.data;
  }

  // ============================================================================
  // APPROVAL DECISIONS
  // ============================================================================

  /**
   * Make approval decision
   */
  async makeApprovalDecision(data: ApprovalDecisionDto): Promise<void> {
    const response = await apiClient.post(`${this.baseUrl}/decisions`, data);
    return response.data.data;
  }

  /**
   * Make bulk approval decisions
   */
  async makeBulkApprovalDecision(data: BulkApprovalDto): Promise<void> {
    const response = await apiClient.post(`${this.baseUrl}/decisions/bulk`, data);
    return response.data.data;
  }

  // ============================================================================
  // PENDING APPROVALS
  // ============================================================================

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(page: number = 1, limit: number = 20): Promise<PendingApprovalsResponse> {
    const response = await apiClient.get(`${this.baseUrl}/pending`, {
      params: { page, limit },
    });
    return response.data.data;
  }

  // ============================================================================
  // APPROVAL STATISTICS
  // ============================================================================

  /**
   * Get approval statistics
   */
  async getApprovalStats(dateFrom?: string, dateTo?: string): Promise<ApprovalStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`, {
      params: { dateFrom, dateTo },
    });
    return response.data.data;
  }

  // ============================================================================
  // APPROVAL RULES
  // ============================================================================

  /**
   * Create approval rule
   */
  async createApprovalRule(data: CreateApprovalRuleDto): Promise<ApprovalRule> {
    const response = await apiClient.post(`${this.baseUrl}/rules`, data);
    return response.data.data;
  }

  /**
   * Get approval rules
   */
  async getApprovalRules(includeInactive: boolean = false): Promise<ApprovalRule[]> {
    const response = await apiClient.get(`${this.baseUrl}/rules`, {
      params: { includeInactive },
    });
    return response.data.data;
  }

  /**
   * Update approval rule
   */
  async updateApprovalRule(id: string, data: UpdateApprovalRuleDto): Promise<ApprovalRule> {
    const response = await apiClient.put(`${this.baseUrl}/rules/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete approval rule
   */
  async deleteApprovalRule(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/rules/${id}`);
  }

  /**
   * Get default approval rules template
   */
  async getDefaultRules(): Promise<CreateApprovalRuleDto[]> {
    const response = await apiClient.get(`${this.baseUrl}/rules/default`);
    return response.data.data;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get approval status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'APPROVED':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'EXPIRED':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'NORMAL':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'URGENT':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get decision color
   */
  getDecisionColor(decision: string): string {
    switch (decision) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'RETURNED':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Format approval time
   */
  formatApprovalTime(submittedAt: string, completedAt?: string): string {
    const submitted = new Date(submittedAt);
    const completed = completedAt ? new Date(completedAt) : new Date();
    
    const diffMs = completed.getTime() - submitted.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Check if approval is overdue
   */
  isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  /**
   * Get time until due
   */
  getTimeUntilDue(dueDate?: string): string | null {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
    }
  }

  /**
   * Validate approval rule conditions
   */
  validateRuleConditions(conditions: any[]): string[] {
    const errors: string[] = [];
    
    conditions.forEach((condition, index) => {
      if (!condition.field) {
        errors.push(`Condition ${index + 1}: Field is required`);
      }
      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`);
      }
      if (condition.value === undefined || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });
    
    return errors;
  }

  /**
   * Validate approval rule actions
   */
  validateRuleActions(actions: any[]): string[] {
    const errors: string[] = [];
    
    actions.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index + 1}: Type is required`);
      }
      
      if (action.type === 'require_approval') {
        if ((!action.approverRoles || action.approverRoles.length === 0) &&
            (!action.approverUsers || action.approverUsers.length === 0)) {
          errors.push(`Action ${index + 1}: At least one approver role or user is required`);
        }
      }
    });
    
    return errors;
  }

  /**
   * Get approval workflow status text
   */
  getWorkflowStatusText(request: ApprovalRequest): string {
    const pendingTasks = request.approvalTasks.filter(task => task.status === 'PENDING');
    const completedTasks = request.approvalTasks.filter(task => task.status === 'COMPLETED');
    
    if (request.status === 'PENDING') {
      return `${completedTasks.length}/${request.approvalTasks.length} approvals completed`;
    }
    
    return request.status.toLowerCase().replace('_', ' ');
  }

  /**
   * Get next approver information
   */
  getNextApprover(request: ApprovalRequest): string | null {
    const pendingTask = request.approvalTasks
      .filter(task => task.status === 'PENDING')
      .sort((a, b) => a.sequence - b.sequence)[0];
    
    if (pendingTask) {
      return `${pendingTask.approver.firstName} ${pendingTask.approver.lastName}`;
    }
    
    return null;
  }
}

export const approvalService = new ApprovalService();
