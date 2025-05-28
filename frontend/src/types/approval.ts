// Approval status enums
export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalTaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
}

export enum ApprovalPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ApprovalAction {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  ESCALATED = 'ESCALATED',
  DELEGATED = 'DELEGATED',
  EXPIRED = 'EXPIRED',
}

// User role enum (for approval rules)
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

// Expense info interface for approval context
export interface ExpenseInfo {
  id: string;
  description: string;
  amount: number;
  currency: string;
  vendor?: string;
  date: string;
  category: {
    id: string;
    name: string;
    color?: string;
  };
}

// User info interface
export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

// Approval task interface
export interface ApprovalTask {
  id: string;
  approvalRequestId: string;
  approverId: string;
  status: ApprovalTaskStatus;
  decision?: ApprovalDecision;
  comments?: string;
  decidedAt?: string;
  sequence: number;
  isRequired: boolean;
  delegatedFrom?: string;
  escalatedFrom?: string;
  createdAt: string;
  updatedAt: string;
  approver: UserInfo;
}

// Approval history interface
export interface ApprovalHistory {
  id: string;
  approvalRequestId: string;
  userId: string;
  action: ApprovalAction;
  fromStatus?: ApprovalRequestStatus;
  toStatus?: ApprovalRequestStatus;
  comments?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user: UserInfo;
}

// Approval request interface
export interface ApprovalRequest {
  id: string;
  organizationId: string;
  expenseId: string;
  requesterId: string;
  status: ApprovalRequestStatus;
  priority: ApprovalPriority;
  dueDate?: string;
  submittedAt: string;
  completedAt?: string;
  totalAmount: number;
  currency: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  expense: ExpenseInfo;
  requester: UserInfo;
  approvalTasks: ApprovalTask[];
  approvalHistory: ApprovalHistory[];
}

// Approval request query DTO
export interface ApprovalRequestQuery {
  page?: number;
  limit?: number;
  requesterId?: string;
  approverId?: string;
  status?: ApprovalRequestStatus;
  priority?: ApprovalPriority;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Approval request list response
export interface ApprovalRequestListResponse {
  approvalRequests: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Approval statistics
export interface ApprovalStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageApprovalTime: number;
  requestsByStatus: Record<ApprovalRequestStatus, number>;
  requestsByPriority: Record<ApprovalPriority, number>;
}

// Approval decision DTO
export interface ApprovalDecisionDto {
  taskId: string;
  decision: ApprovalDecision;
  comments?: string;
}

// Bulk approval DTO
export interface BulkApprovalDto {
  taskIds: string[];
  decision: ApprovalDecision;
  comments?: string;
}

// Create approval request DTO
export interface CreateApprovalRequestDto {
  expenseId: string;
  reason?: string;
  priority?: ApprovalPriority;
}

// Approval rule condition
export interface ApprovalCondition {
  field: 'amount' | 'category' | 'submitter_role' | 'date' | 'vendor' | 'payment_method';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
}

// Approval rule action
export interface ApprovalRuleAction {
  type: 'require_approval' | 'auto_approve' | 'notify' | 'escalate';
  approverRoles?: UserRole[];
  approverUsers?: string[];
  escalationTimeHours?: number;
  notificationTemplate?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// Approval rule
export interface ApprovalRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: ApprovalCondition[];
  actions: ApprovalRuleAction[];
  matchCount: number;
  lastMatchedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Create approval rule DTO
export interface CreateApprovalRuleDto {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  conditions: ApprovalCondition[];
  actions: ApprovalRuleAction[];
}

// Update approval rule DTO
export interface UpdateApprovalRuleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  conditions?: ApprovalCondition[];
  actions?: ApprovalRuleAction[];
}

// Pending approval task with details
export interface PendingApprovalTask extends ApprovalTask {
  approvalRequest: {
    id: string;
    expenseId: string;
    status: ApprovalRequestStatus;
    priority: ApprovalPriority;
    totalAmount: number;
    currency: string;
    submittedAt: string;
    expense: ExpenseInfo;
    requester: UserInfo;
  };
}

// Pending approvals response
export interface PendingApprovalsResponse {
  tasks: PendingApprovalTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Approval notification
export interface ApprovalNotification {
  id: string;
  type: 'APPROVAL_REQUEST' | 'APPROVAL_DECISION' | 'APPROVAL_REMINDER' | 'APPROVAL_ESCALATION';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    approvalRequestId?: string;
    expenseId?: string;
    decision?: ApprovalDecision;
  };
}

// Approval workflow configuration
export interface ApprovalWorkflowConfig {
  isEnabled: boolean;
  defaultApprovers: UserInfo[];
  escalationTimeHours: number;
  reminderIntervalHours: number;
  autoApprovalThreshold: number;
  requireReceiptForApproval: boolean;
  allowBulkApproval: boolean;
  allowDelegation: boolean;
}

// Approval delegate
export interface ApprovalDelegate {
  id: string;
  organizationId: string;
  delegatorId: string;
  delegateId: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  reason?: string;
  amountLimit?: number;
  categoryIds?: string[];
  createdAt: string;
  updatedAt: string;
  delegator: UserInfo;
  delegate: UserInfo;
}

// Approval filters for UI
export interface ApprovalFilters {
  status?: ApprovalRequestStatus | 'ALL';
  priority?: ApprovalPriority | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  approverId?: string;
  requesterId?: string;
}

// Approval summary for dashboard
export interface ApprovalSummary {
  pendingCount: number;
  overdueCount: number;
  todayCount: number;
  weekCount: number;
  averageApprovalTime: number;
  recentApprovals: ApprovalRequest[];
}

// Approval metrics for analytics
export interface ApprovalMetrics {
  approvalRate: number;
  rejectionRate: number;
  averageDecisionTime: number;
  bottleneckApprovers: Array<{
    approver: UserInfo;
    pendingCount: number;
    averageTime: number;
  }>;
  escalationRate: number;
  timeToApproval: Array<{
    date: string;
    averageHours: number;
  }>;
}
