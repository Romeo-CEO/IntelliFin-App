import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalDecision,
  ApprovalPriority,
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalTask,
  ApprovalTaskStatus,
  ExpenseStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ApprovalRequirement,
  ApprovalRulesEngine,
  ExpenseContext,
} from './approval-rules.engine';
import {
  ApprovalRequestRepository,
  ApprovalRequestWithDetails,
} from './approval-request.repository';
import { ApprovalTaskRepository } from './approval-task.repository';
import { NotificationService } from '../notifications/notification.service';

export interface CreateApprovalRequestDto {
  expenseId: string;
  organizationId: string;
  requesterId: string;
  reason?: string;
  priority?: ApprovalPriority;
}

export interface ApprovalDecisionDto {
  taskId: string;
  decision: ApprovalDecision;
  comments?: string;
  approverId: string;
}

export interface BulkApprovalDto {
  taskIds: string[];
  decision: ApprovalDecision;
  comments?: string;
  approverId: string;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: ApprovalRulesEngine,
    private readonly approvalRequestRepo: ApprovalRequestRepository,
    private readonly approvalTaskRepo: ApprovalTaskRepository,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Submit an expense for approval
   */
  async submitExpenseForApproval(
    dto: CreateApprovalRequestDto
  ): Promise<ApprovalRequest> {
    try {
      // Get expense details
      const expense = await this.getExpenseWithDetails(dto.expenseId);
      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft expenses can be submitted for approval'
        );
      }

      // Check if approval request already exists
      const existingRequest = await this.approvalRequestRepo.findByExpenseId(
        dto.expenseId
      );
      if (existingRequest) {
        throw new BadRequestException(
          'Approval request already exists for this expense'
        );
      }

      // Build expense context for rule evaluation
      const expenseContext: ExpenseContext = {
        id: expense.id,
        organizationId: expense.organizationId,
        amount: expense.amount.toNumber(),
        currency: expense.currency,
        categoryId: expense.categoryId,
        categoryName: expense.category.name,
        submitterId: dto.requesterId,
        submitterRole: await this.getUserRole(dto.requesterId),
        vendor: expense.vendor,
        paymentMethod: expense.paymentMethod,
        date: expense.date,
        description: expense.description,
      };

      // Evaluate approval rules
      const requirements =
        await this.rulesEngine.evaluateExpense(expenseContext);

      if (requirements.length === 0) {
        // No approval required, auto-approve
        await this.autoApproveExpense(expense.id);
        return null;
      }

      // Create approval request
      const approvalRequest = await this.createApprovalRequest(
        dto,
        expense,
        requirements
      );

      // Create approval tasks
      await this.createApprovalTasks(approvalRequest.id, requirements);

      // Update expense status
      await this.updateExpenseStatus(
        expense.id,
        ExpenseStatus.PENDING_APPROVAL
      );

      // Send notifications
      await this.sendApprovalNotifications(approvalRequest.id);

      // Log approval history
      await this.logApprovalAction(
        approvalRequest.id,
        dto.requesterId,
        ApprovalAction.SUBMITTED,
        null,
        ApprovalRequestStatus.PENDING,
        'Expense submitted for approval'
      );

      this.logger.log(
        `Submitted expense ${dto.expenseId} for approval: ${approvalRequest.id}`
      );
      return approvalRequest;
    } catch (error) {
      this.logger.error(
        `Failed to submit expense for approval: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process approval decision
   */
  async processApprovalDecision(
    dto: ApprovalDecisionDto
  ): Promise<ApprovalTask> {
    try {
      // Get approval task with details
      const task = await this.approvalTaskRepo.findByIdWithDetails(dto.taskId);
      if (!task) {
        throw new NotFoundException('Approval task not found');
      }

      if (task.status !== ApprovalTaskStatus.PENDING) {
        throw new BadRequestException('Task is not pending approval');
      }

      if (task.approverId !== dto.approverId) {
        throw new ForbiddenException(
          'You are not authorized to approve this task'
        );
      }

      // Complete the approval task
      const completedTask = await this.approvalTaskRepo.completeTask(
        dto.taskId,
        dto.decision,
        dto.comments
      );

      // Log approval history
      await this.logApprovalAction(
        task.approvalRequestId,
        dto.approverId,
        dto.decision === ApprovalDecision.APPROVED
          ? ApprovalAction.APPROVED
          : dto.decision === ApprovalDecision.REJECTED
            ? ApprovalAction.REJECTED
            : ApprovalAction.RETURNED,
        null,
        null,
        dto.comments
      );

      // Check if all required tasks are completed
      await this.checkApprovalCompletion(task.approvalRequestId);

      this.logger.log(
        `Processed approval decision for task ${dto.taskId}: ${dto.decision}`
      );
      return completedTask;
    } catch (error) {
      this.logger.error(
        `Failed to process approval decision: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process bulk approval decisions
   */
  async processBulkApproval(dto: BulkApprovalDto): Promise<ApprovalTask[]> {
    try {
      const completedTasks: ApprovalTask[] = [];

      for (const taskId of dto.taskIds) {
        try {
          const task = await this.processApprovalDecision({
            taskId,
            decision: dto.decision,
            comments: dto.comments,
            approverId: dto.approverId,
          });
          completedTasks.push(task);
        } catch (error) {
          this.logger.warn(
            `Failed to process bulk approval for task ${taskId}: ${error.message}`
          );
        }
      }

      this.logger.log(
        `Processed bulk approval for ${completedTasks.length}/${dto.taskIds.length} tasks`
      );
      return completedTasks;
    } catch (error) {
      this.logger.error(
        `Failed to process bulk approval: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequest(id: string): Promise<ApprovalRequestWithDetails> {
    const approvalRequest =
      await this.approvalRequestRepo.findByIdWithDetails(id);
    if (!approvalRequest) {
      throw new NotFoundException('Approval request not found');
    }
    return approvalRequest;
  }

  /**
   * Get approval requests with filters
   */
  async getApprovalRequests(
    organizationId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ) {
    return await this.approvalRequestRepo.findMany(
      { organizationId, ...filters },
      page,
      limit
    );
  }

  /**
   * Get pending approvals for an approver
   */
  async getPendingApprovals(
    approverId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ) {
    return await this.approvalTaskRepo.findPendingByApproverId(
      approverId,
      organizationId,
      page,
      limit
    );
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(
    organizationId: string,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    return await this.approvalRequestRepo.getStats(
      organizationId,
      dateFrom,
      dateTo
    );
  }

  /**
   * Cancel approval request
   */
  async cancelApprovalRequest(
    requestId: string,
    userId: string,
    reason?: string
  ): Promise<ApprovalRequest> {
    try {
      const approvalRequest =
        await this.approvalRequestRepo.findByIdWithDetails(requestId);
      if (!approvalRequest) {
        throw new NotFoundException('Approval request not found');
      }

      if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
        throw new BadRequestException(
          'Only pending approval requests can be cancelled'
        );
      }

      // Update approval request status
      const updatedRequest = await this.approvalRequestRepo.update(requestId, {
        status: ApprovalRequestStatus.CANCELLED,
        completedAt: new Date(),
      });

      // Update expense status back to draft
      await this.updateExpenseStatus(
        approvalRequest.expenseId,
        ExpenseStatus.DRAFT
      );

      // Log approval history
      await this.logApprovalAction(
        requestId,
        userId,
        ApprovalAction.CANCELLED,
        ApprovalRequestStatus.PENDING,
        ApprovalRequestStatus.CANCELLED,
        reason
      );

      this.logger.log(`Cancelled approval request: ${requestId}`);
      return updatedRequest;
    } catch (error) {
      this.logger.error(
        `Failed to cancel approval request: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async getExpenseWithDetails(expenseId: string) {
    return await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });
  }

  private async getUserRole(userId: string): Promise<UserRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role || UserRole.USER;
  }

  private async autoApproveExpense(expenseId: string): Promise<void> {
    await this.updateExpenseStatus(expenseId, ExpenseStatus.APPROVED);
    this.logger.log(`Auto-approved expense: ${expenseId}`);
  }

  private async createApprovalRequest(
    dto: CreateApprovalRequestDto,
    expense: any,
    requirements: ApprovalRequirement[]
  ): Promise<ApprovalRequest> {
    const priority = dto.priority || this.determinePriority(requirements);
    const dueDate = this.calculateDueDate(requirements);

    return await this.approvalRequestRepo.create({
      organization: { connect: { id: dto.organizationId } },
      expense: { connect: { id: dto.expenseId } },
      requester: { connect: { id: dto.requesterId } },
      status: ApprovalRequestStatus.PENDING,
      priority,
      dueDate,
      totalAmount: expense.amount,
      currency: expense.currency,
      reason: dto.reason,
    });
  }

  private async createApprovalTasks(
    approvalRequestId: string,
    requirements: ApprovalRequirement[]
  ): Promise<void> {
    const tasks = [];
    let sequence = 0;

    for (const requirement of requirements) {
      // Create tasks for each approver role/user
      const approvers = await this.getApprovers(requirement);

      for (const approverId of approvers) {
        tasks.push({
          approvalRequestId,
          approverId,
          status: ApprovalTaskStatus.PENDING,
          sequence: sequence++,
          isRequired: true,
        });
      }
    }

    if (tasks.length > 0) {
      await this.approvalTaskRepo.createMany(tasks);
    }
  }

  private async getApprovers(
    requirement: ApprovalRequirement
  ): Promise<string[]> {
    const approvers: string[] = [];

    // Add specific users
    if (requirement.approverUsers && requirement.approverUsers.length > 0) {
      approvers.push(...requirement.approverUsers);
    }

    // Add users by role
    if (requirement.approverRoles && requirement.approverRoles.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: requirement.approverRoles },
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      approvers.push(...users.map(u => u.id));
    }

    return [...new Set(approvers)]; // Remove duplicates
  }

  private determinePriority(
    requirements: ApprovalRequirement[]
  ): ApprovalPriority {
    const priorities = requirements.map(r => r.requirementPriority);
    if (priorities.includes('URGENT')) return ApprovalPriority.URGENT;
    if (priorities.includes('HIGH')) return ApprovalPriority.HIGH;
    if (priorities.includes('NORMAL')) return ApprovalPriority.NORMAL;
    return ApprovalPriority.LOW;
  }

  private calculateDueDate(requirements: ApprovalRequirement[]): Date | null {
    const escalationTimes = requirements
      .map(r => r.escalationTimeHours)
      .filter(t => t !== undefined);

    if (escalationTimes.length === 0) return null;

    const minEscalationTime = Math.min(...escalationTimes);
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + minEscalationTime);
    return dueDate;
  }

  private async updateExpenseStatus(
    expenseId: string,
    status: ExpenseStatus
  ): Promise<void> {
    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { status },
    });
  }

  private async checkApprovalCompletion(
    approvalRequestId: string
  ): Promise<void> {
    const tasks =
      await this.approvalTaskRepo.findByApprovalRequestId(approvalRequestId);
    const requiredTasks = tasks.filter(t => t.isRequired);
    const completedTasks = requiredTasks.filter(
      t => t.status === ApprovalTaskStatus.COMPLETED
    );
    const rejectedTasks = completedTasks.filter(
      t => t.decision === ApprovalDecision.REJECTED
    );

    if (rejectedTasks.length > 0) {
      // At least one rejection - reject the entire request
      await this.finalizeApprovalRequest(
        approvalRequestId,
        ApprovalRequestStatus.REJECTED
      );
    } else if (completedTasks.length === requiredTasks.length) {
      // All required tasks completed with approval
      await this.finalizeApprovalRequest(
        approvalRequestId,
        ApprovalRequestStatus.APPROVED
      );
    }
    // Otherwise, still pending
  }

  private async finalizeApprovalRequest(
    approvalRequestId: string,
    status: ApprovalRequestStatus
  ): Promise<void> {
    const approvalRequest = await this.approvalRequestRepo.update(
      approvalRequestId,
      {
        status,
        completedAt: new Date(),
      }
    );

    // Update expense status
    const expenseStatus =
      status === ApprovalRequestStatus.APPROVED
        ? ExpenseStatus.APPROVED
        : ExpenseStatus.REJECTED;

    await this.updateExpenseStatus(approvalRequest.expenseId, expenseStatus);

    // Send completion notifications
    await this.sendCompletionNotifications(approvalRequestId, status);

    this.logger.log(
      `Finalized approval request ${approvalRequestId} with status: ${status}`
    );
  }

  private async sendApprovalNotifications(
    approvalRequestId: string
  ): Promise<void> {
    // Implementation will be added when notification service is complete
    this.logger.log(
      `Sending approval notifications for request: ${approvalRequestId}`
    );
  }

  private async sendCompletionNotifications(
    approvalRequestId: string,
    status: ApprovalRequestStatus
  ): Promise<void> {
    // Implementation will be added when notification service is complete
    this.logger.log(
      `Sending completion notifications for request: ${approvalRequestId}, status: ${status}`
    );
  }

  private async logApprovalAction(
    approvalRequestId: string,
    userId: string,
    action: ApprovalAction,
    fromStatus?: ApprovalRequestStatus,
    toStatus?: ApprovalRequestStatus,
    comments?: string
  ): Promise<void> {
    await this.prisma.approvalHistory.create({
      data: {
        approvalRequest: { connect: { id: approvalRequestId } },
        user: { connect: { id: userId } },
        action,
        fromStatus,
        toStatus,
        comments,
        metadata: {},
      },
    });
  }
}
