import { Injectable, Logger } from '@nestjs/common';
import {
  ApprovalDecision,
  ApprovalTask,
  ApprovalTaskStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface ApprovalTaskWithDetails extends ApprovalTask {
  approvalRequest: {
    id: string;
    expenseId: string;
    status: string;
    priority: string;
    totalAmount: number;
    currency: string;
    submittedAt: Date;
    expense: {
      id: string;
      description: string;
      vendor?: string;
      category: {
        id: string;
        name: string;
        color?: string;
      };
    };
    requester: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class ApprovalTaskRepository {
  private readonly logger = new Logger(ApprovalTaskRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new approval task
   */
  async create(data: Prisma.ApprovalTaskCreateInput): Promise<ApprovalTask> {
    try {
      const approvalTask = await this.prisma.approvalTask.create({
        data,
      });

      this.logger.log(
        `Created approval task: ${approvalTask.id} for approver: ${approvalTask.approverId}`
      );
      return approvalTask;
    } catch (error) {
      this.logger.error(
        `Failed to create approval task: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create multiple approval tasks
   */
  async createMany(
    data: Prisma.ApprovalTaskCreateManyInput[]
  ): Promise<number> {
    try {
      const result = await this.prisma.approvalTask.createMany({
        data,
      });

      this.logger.log(`Created ${result.count} approval tasks`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to create approval tasks: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find approval task by ID with details
   */
  async findByIdWithDetails(
    id: string
  ): Promise<ApprovalTaskWithDetails | null> {
    try {
      return (await this.prisma.approvalTask.findUnique({
        where: { id },
        include: {
          approvalRequest: {
            include: {
              expense: {
                select: {
                  id: true,
                  description: true,
                  vendor: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
              requester: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      })) as ApprovalTaskWithDetails | null;
    } catch (error) {
      this.logger.error(
        `Failed to find approval task by ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update approval task
   */
  async update(
    id: string,
    data: Prisma.ApprovalTaskUpdateInput
  ): Promise<ApprovalTask> {
    try {
      const approvalTask = await this.prisma.approvalTask.update({
        where: { id },
        data,
      });

      this.logger.log(`Updated approval task: ${approvalTask.id}`);
      return approvalTask;
    } catch (error) {
      this.logger.error(
        `Failed to update approval task: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find tasks by approval request ID
   */
  async findByApprovalRequestId(
    approvalRequestId: string
  ): Promise<ApprovalTask[]> {
    try {
      return await this.prisma.approvalTask.findMany({
        where: { approvalRequestId },
        orderBy: { sequence: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find approval tasks by request ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find pending tasks for an approver
   */
  async findPendingByApproverId(
    approverId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    tasks: ApprovalTaskWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.ApprovalTaskWhereInput = {
        approverId,
        status: ApprovalTaskStatus.PENDING,
        approvalRequest: {
          organizationId,
          status: 'PENDING', // Only include tasks from pending approval requests
        },
      };

      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        this.prisma.approvalTask.findMany({
          where,
          orderBy: [
            { approvalRequest: { priority: 'desc' } },
            { approvalRequest: { submittedAt: 'asc' } },
          ],
          skip,
          take: limit,
          include: {
            approvalRequest: {
              include: {
                expense: {
                  select: {
                    id: true,
                    description: true,
                    vendor: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
                requester: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        }) as ApprovalTaskWithDetails[],
        this.prisma.approvalTask.count({ where }),
      ]);

      return {
        tasks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to find pending approval tasks: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find all tasks for an approver with filters
   */
  async findByApproverId(
    approverId: string,
    organizationId: string,
    status?: ApprovalTaskStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    tasks: ApprovalTaskWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.ApprovalTaskWhereInput = {
        approverId,
        approvalRequest: {
          organizationId,
        },
        ...(status && { status }),
      };

      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        this.prisma.approvalTask.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            approvalRequest: {
              include: {
                expense: {
                  select: {
                    id: true,
                    description: true,
                    vendor: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
                requester: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        }) as ApprovalTaskWithDetails[],
        this.prisma.approvalTask.count({ where }),
      ]);

      return {
        tasks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to find approval tasks by approver: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Complete an approval task
   */
  async completeTask(
    taskId: string,
    decision: ApprovalDecision,
    comments?: string
  ): Promise<ApprovalTask> {
    try {
      const approvalTask = await this.prisma.approvalTask.update({
        where: { id: taskId },
        data: {
          status: ApprovalTaskStatus.COMPLETED,
          decision,
          comments,
          decidedAt: new Date(),
        },
      });

      this.logger.log(
        `Completed approval task: ${approvalTask.id} with decision: ${decision}`
      );
      return approvalTask;
    } catch (error) {
      this.logger.error(
        `Failed to complete approval task: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Skip an approval task (for sequential workflows)
   */
  async skipTask(taskId: string, reason?: string): Promise<ApprovalTask> {
    try {
      const approvalTask = await this.prisma.approvalTask.update({
        where: { id: taskId },
        data: {
          status: ApprovalTaskStatus.SKIPPED,
          comments: reason,
          decidedAt: new Date(),
        },
      });

      this.logger.log(`Skipped approval task: ${approvalTask.id}`);
      return approvalTask;
    } catch (error) {
      this.logger.error(
        `Failed to skip approval task: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Expire overdue approval tasks
   */
  async expireOverdueTasks(organizationId: string): Promise<number> {
    try {
      const result = await this.prisma.approvalTask.updateMany({
        where: {
          status: ApprovalTaskStatus.PENDING,
          approvalRequest: {
            organizationId,
            dueDate: {
              lt: new Date(),
            },
          },
        },
        data: {
          status: ApprovalTaskStatus.EXPIRED,
          decidedAt: new Date(),
        },
      });

      this.logger.log(`Expired ${result.count} overdue approval tasks`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to expire overdue tasks: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get task statistics for an approver
   */
  async getApproverStats(
    approverId: string,
    organizationId: string
  ): Promise<{
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    averageDecisionTime: number;
    tasksByDecision: Record<ApprovalDecision, number>;
  }> {
    try {
      const where: Prisma.ApprovalTaskWhereInput = {
        approverId,
        approvalRequest: {
          organizationId,
        },
      };

      const [
        totalTasks,
        pendingTasks,
        completedTasks,
        tasksByDecision,
        decisionTimes,
      ] = await Promise.all([
        this.prisma.approvalTask.count({ where }),
        this.prisma.approvalTask.count({
          where: { ...where, status: ApprovalTaskStatus.PENDING },
        }),
        this.prisma.approvalTask.count({
          where: { ...where, status: ApprovalTaskStatus.COMPLETED },
        }),
        this.prisma.approvalTask.groupBy({
          by: ['decision'],
          where: { ...where, decision: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.approvalTask.findMany({
          where: {
            ...where,
            status: ApprovalTaskStatus.COMPLETED,
            decidedAt: { not: null },
          },
          select: {
            createdAt: true,
            decidedAt: true,
          },
        }),
      ]);

      // Calculate average decision time
      const decisionTimesMs = decisionTimes
        .filter(task => task.decidedAt)
        .map(task => task.decidedAt!.getTime() - task.createdAt.getTime());

      const averageDecisionTime =
        decisionTimesMs.length > 0
          ? decisionTimesMs.reduce((sum, time) => sum + time, 0) /
            decisionTimesMs.length /
            (1000 * 60 * 60) // Convert to hours
          : 0;

      return {
        totalTasks,
        pendingTasks,
        completedTasks,
        averageDecisionTime,
        tasksByDecision: tasksByDecision.reduce(
          (acc, item) => {
            if (item.decision) {
              acc[item.decision] = item._count._all;
            }
            return acc;
          },
          {} as Record<ApprovalDecision, number>
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get approver stats: ${error.message}`,
        error
      );
      throw error;
    }
  }
}
