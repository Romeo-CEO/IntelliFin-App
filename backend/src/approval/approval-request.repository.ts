import { Injectable, Logger } from '@nestjs/common';
import { 
  Prisma, 
  ApprovalRequest, 
  ApprovalTask, 
  ApprovalHistory,
  ApprovalRequestStatus,
  ApprovalTaskStatus,
  ApprovalDecision,
  ApprovalAction,
  ApprovalPriority,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface ApprovalRequestFilters {
  organizationId?: string;
  requesterId?: string;
  approverId?: string;
  status?: ApprovalRequestStatus;
  priority?: ApprovalPriority;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ApprovalRequestStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageApprovalTime: number;
  requestsByStatus: Record<ApprovalRequestStatus, number>;
  requestsByPriority: Record<ApprovalPriority, number>;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  expense: {
    id: string;
    description: string;
    amount: number;
    currency: string;
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
    role: string;
  };
  approvalTasks: Array<ApprovalTask & {
    approver: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }>;
  approvalHistory: Array<ApprovalHistory & {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

@Injectable()
export class ApprovalRequestRepository {
  private readonly logger = new Logger(ApprovalRequestRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new approval request
   */
  async create(data: Prisma.ApprovalRequestCreateInput): Promise<ApprovalRequest> {
    try {
      const approvalRequest = await this.prisma.approvalRequest.create({
        data,
        include: {
          expense: {
            select: {
              id: true,
              description: true,
              amount: true,
              currency: true,
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
              role: true,
            },
          },
        },
      });

      this.logger.log(`Created approval request: ${approvalRequest.id} for expense: ${approvalRequest.expenseId}`);
      return approvalRequest;
    } catch (error) {
      this.logger.error(`Failed to create approval request: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find approval request by ID with full details
   */
  async findByIdWithDetails(id: string): Promise<ApprovalRequestWithDetails | null> {
    try {
      return await this.prisma.approvalRequest.findUnique({
        where: { id },
        include: {
          expense: {
            select: {
              id: true,
              description: true,
              amount: true,
              currency: true,
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
              role: true,
            },
          },
          approvalTasks: {
            include: {
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
            orderBy: { sequence: 'asc' },
          },
          approvalHistory: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }) as ApprovalRequestWithDetails | null;
    } catch (error) {
      this.logger.error(`Failed to find approval request by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find approval request by expense ID
   */
  async findByExpenseId(expenseId: string): Promise<ApprovalRequest | null> {
    try {
      return await this.prisma.approvalRequest.findFirst({
        where: { expenseId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to find approval request by expense ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update approval request
   */
  async update(id: string, data: Prisma.ApprovalRequestUpdateInput): Promise<ApprovalRequest> {
    try {
      const approvalRequest = await this.prisma.approvalRequest.update({
        where: { id },
        data,
      });

      this.logger.log(`Updated approval request: ${approvalRequest.id}`);
      return approvalRequest;
    } catch (error) {
      this.logger.error(`Failed to update approval request: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find approval requests with filters and pagination
   */
  async findMany(
    filters: ApprovalRequestFilters,
    page: number = 1,
    limit: number = 20,
    orderBy: Prisma.ApprovalRequestOrderByWithRelationInput = { submittedAt: 'desc' },
  ): Promise<{
    approvalRequests: ApprovalRequestWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (page - 1) * limit;

      const [approvalRequests, total] = await Promise.all([
        this.prisma.approvalRequest.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            expense: {
              select: {
                id: true,
                description: true,
                amount: true,
                currency: true,
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
                role: true,
              },
            },
            approvalTasks: {
              include: {
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
              orderBy: { sequence: 'asc' },
            },
            approvalHistory: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5, // Limit history for performance
            },
          },
        }) as ApprovalRequestWithDetails[],
        this.prisma.approvalRequest.count({ where }),
      ]);

      return {
        approvalRequests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find approval requests: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get approval requests for a specific approver
   */
  async findByApproverId(
    approverId: string,
    organizationId: string,
    status?: ApprovalTaskStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    approvalRequests: ApprovalRequestWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.ApprovalRequestWhereInput = {
        organizationId,
        approvalTasks: {
          some: {
            approverId,
            ...(status && { status }),
          },
        },
      };

      const skip = (page - 1) * limit;

      const [approvalRequests, total] = await Promise.all([
        this.prisma.approvalRequest.findMany({
          where,
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
          include: {
            expense: {
              select: {
                id: true,
                description: true,
                amount: true,
                currency: true,
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
                role: true,
              },
            },
            approvalTasks: {
              include: {
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
              orderBy: { sequence: 'asc' },
            },
            approvalHistory: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        }) as ApprovalRequestWithDetails[],
        this.prisma.approvalRequest.count({ where }),
      ]);

      return {
        approvalRequests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find approval requests by approver: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get approval request statistics
   */
  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date): Promise<ApprovalRequestStats> {
    try {
      const where: Prisma.ApprovalRequestWhereInput = {
        organizationId,
        ...(dateFrom && dateTo && {
          submittedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
      };

      const [
        totalRequests,
        requestsByStatus,
        requestsByPriority,
        approvalTimes,
      ] = await Promise.all([
        this.prisma.approvalRequest.count({ where }),
        this.prisma.approvalRequest.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.approvalRequest.groupBy({
          by: ['priority'],
          where,
          _count: { _all: true },
        }),
        this.prisma.approvalRequest.findMany({
          where: {
            ...where,
            status: { in: [ApprovalRequestStatus.APPROVED, ApprovalRequestStatus.REJECTED] },
            completedAt: { not: null },
          },
          select: {
            submittedAt: true,
            completedAt: true,
          },
        }),
      ]);

      // Calculate average approval time
      const approvalTimesMs = approvalTimes
        .filter(req => req.completedAt)
        .map(req => req.completedAt!.getTime() - req.submittedAt.getTime());
      
      const averageApprovalTime = approvalTimesMs.length > 0
        ? approvalTimesMs.reduce((sum, time) => sum + time, 0) / approvalTimesMs.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      return {
        totalRequests,
        pendingRequests: requestsByStatus.find(s => s.status === ApprovalRequestStatus.PENDING)?._count._all || 0,
        approvedRequests: requestsByStatus.find(s => s.status === ApprovalRequestStatus.APPROVED)?._count._all || 0,
        rejectedRequests: requestsByStatus.find(s => s.status === ApprovalRequestStatus.REJECTED)?._count._all || 0,
        averageApprovalTime,
        requestsByStatus: requestsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count._all;
          return acc;
        }, {} as Record<ApprovalRequestStatus, number>),
        requestsByPriority: requestsByPriority.reduce((acc, item) => {
          acc[item.priority] = item._count._all;
          return acc;
        }, {} as Record<ApprovalPriority, number>),
      };
    } catch (error) {
      this.logger.error(`Failed to get approval request stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: ApprovalRequestFilters): Prisma.ApprovalRequestWhereInput {
    const where: Prisma.ApprovalRequestWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.requesterId) {
      where.requesterId = filters.requesterId;
    }

    if (filters.approverId) {
      where.approvalTasks = {
        some: {
          approverId: filters.approverId,
        },
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dateFrom && filters.dateTo) {
      where.submittedAt = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters.dateFrom) {
      where.submittedAt = {
        gte: filters.dateFrom,
      };
    } else if (filters.dateTo) {
      where.submittedAt = {
        lte: filters.dateTo,
      };
    }

    if (filters.search) {
      where.OR = [
        {
          expense: {
            description: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          expense: {
            vendor: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          requester: {
            OR: [
              {
                firstName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    return where;
  }
}
