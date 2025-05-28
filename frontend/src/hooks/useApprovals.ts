import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { approvalService } from '@/services/approval.service';
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
  ApprovalDecision,
} from '@/types/approval';

// Hook for fetching approval requests
export function useApprovalRequests(params?: ApprovalRequestQuery) {
  const [data, setData] = useState<ApprovalRequestListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await approvalService.getApprovalRequests(params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approval requests');
      toast.error('Failed to load approval requests');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchApprovalRequests();
  }, [fetchApprovalRequests]);

  return {
    approvalRequests: data?.approvalRequests || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch: fetchApprovalRequests,
  };
}

// Hook for fetching a single approval request
export function useApprovalRequest(id: string | null) {
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalRequest = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await approvalService.getApprovalRequestById(id);
      setApprovalRequest(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approval request');
      toast.error('Failed to load approval request details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApprovalRequest();
  }, [fetchApprovalRequest]);

  return {
    approvalRequest,
    isLoading,
    error,
    refetch: fetchApprovalRequest,
  };
}

// Hook for pending approvals
export function usePendingApprovals(page: number = 1, limit: number = 20) {
  const [data, setData] = useState<PendingApprovalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await approvalService.getPendingApprovals(page, limit);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending approvals');
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  return {
    tasks: data?.tasks || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch: fetchPendingApprovals,
  };
}

// Hook for approval statistics
export function useApprovalStats(dateFrom?: string, dateTo?: string) {
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await approvalService.getApprovalStats(dateFrom, dateTo);
      setStats(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approval statistics');
      toast.error('Failed to load approval statistics');
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

// Hook for approval operations
export function useApprovalOperations() {
  const [isLoading, setIsLoading] = useState(false);

  const submitForApproval = async (data: CreateApprovalRequestDto): Promise<ApprovalRequest> => {
    setIsLoading(true);
    try {
      const response = await approvalService.submitForApproval(data);
      toast.success('Expense submitted for approval successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit expense for approval');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const makeApprovalDecision = async (data: ApprovalDecisionDto): Promise<void> => {
    setIsLoading(true);
    try {
      await approvalService.makeApprovalDecision(data);
      const decisionText = data.decision === ApprovalDecision.APPROVED ? 'approved' : 
                          data.decision === ApprovalDecision.REJECTED ? 'rejected' : 'returned';
      toast.success(`Expense ${decisionText} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process approval decision');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const makeBulkApprovalDecision = async (data: BulkApprovalDto): Promise<void> => {
    setIsLoading(true);
    try {
      await approvalService.makeBulkApprovalDecision(data);
      const decisionText = data.decision === ApprovalDecision.APPROVED ? 'approved' : 
                          data.decision === ApprovalDecision.REJECTED ? 'rejected' : 'returned';
      toast.success(`${data.taskIds.length} expenses ${decisionText} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process bulk approval decisions');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelApprovalRequest = async (id: string, reason?: string): Promise<ApprovalRequest> => {
    setIsLoading(true);
    try {
      const response = await approvalService.cancelApprovalRequest(id, reason);
      toast.success('Approval request cancelled successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel approval request');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    submitForApproval,
    makeApprovalDecision,
    makeBulkApprovalDecision,
    cancelApprovalRequest,
  };
}

// Hook for approval rules
export function useApprovalRules(includeInactive: boolean = false) {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await approvalService.getApprovalRules(includeInactive);
      setRules(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approval rules');
      toast.error('Failed to load approval rules');
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    isLoading,
    error,
    refetch: fetchRules,
  };
}

// Hook for approval rule operations
export function useApprovalRuleOperations() {
  const [isLoading, setIsLoading] = useState(false);

  const createRule = async (data: CreateApprovalRuleDto): Promise<ApprovalRule> => {
    setIsLoading(true);
    try {
      const response = await approvalService.createApprovalRule(data);
      toast.success('Approval rule created successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create approval rule');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRule = async (id: string, data: UpdateApprovalRuleDto): Promise<ApprovalRule> => {
    setIsLoading(true);
    try {
      const response = await approvalService.updateApprovalRule(id, data);
      toast.success('Approval rule updated successfully');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update approval rule');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRule = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await approvalService.deleteApprovalRule(id);
      toast.success('Approval rule deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete approval rule');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultRules = async (): Promise<CreateApprovalRuleDto[]> => {
    setIsLoading(true);
    try {
      const response = await approvalService.getDefaultRules();
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Failed to get default rules');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    getDefaultRules,
  };
}

// Hook for approval workflow status
export function useApprovalWorkflow() {
  const getStatusBadgeProps = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    const colorClasses = approvalService.getStatusColor(status);
    return `${baseClasses} ${colorClasses}`;
  };

  const getPriorityBadgeProps = (priority: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    const colorClasses = approvalService.getPriorityColor(priority);
    return `${baseClasses} ${colorClasses}`;
  };

  const getDecisionBadgeProps = (decision: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    const colorClasses = approvalService.getDecisionColor(decision);
    return `${baseClasses} ${colorClasses}`;
  };

  const formatApprovalTime = (submittedAt: string, completedAt?: string) => {
    return approvalService.formatApprovalTime(submittedAt, completedAt);
  };

  const isOverdue = (dueDate?: string) => {
    return approvalService.isOverdue(dueDate);
  };

  const getTimeUntilDue = (dueDate?: string) => {
    return approvalService.getTimeUntilDue(dueDate);
  };

  const getWorkflowStatusText = (request: ApprovalRequest) => {
    return approvalService.getWorkflowStatusText(request);
  };

  const getNextApprover = (request: ApprovalRequest) => {
    return approvalService.getNextApprover(request);
  };

  return {
    getStatusBadgeProps,
    getPriorityBadgeProps,
    getDecisionBadgeProps,
    formatApprovalTime,
    isOverdue,
    getTimeUntilDue,
    getWorkflowStatusText,
    getNextApprover,
  };
}
