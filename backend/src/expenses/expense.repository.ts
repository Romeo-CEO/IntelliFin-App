import { Injectable, Logger } from '@nestjs/common';
import { Expense, ExpenseStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface ExpenseFilters {
  organizationId: string;
  categoryId?: string;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  isRecurring?: boolean;
  isTaxDeductible?: boolean;
  createdBy?: string;
  search?: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  expensesByStatus: Record<ExpenseStatus, number>;
  expensesByPaymentMethod: Record<PaymentMethod, number>;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    totalAmount: number;
  }>;
}

@Injectable()
export class ExpenseRepository {
  private readonly logger = new Logger(ExpenseRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new expense
   */
  async create(data: Prisma.ExpenseCreateInput): Promise<Expense> {
    try {
      const expense = await this.prisma.expense.create({
        data,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(
        `Created expense: ${expense.id} for organization: ${expense.organizationId}`
      );
      return expense;
    } catch (error) {
      this.logger.error(`Failed to create expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find expense by ID
   */
  async findById(id: string, organizationId: string): Promise<Expense | null> {
    try {
      return await this.prisma.expense.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
          transaction: {
            select: {
              id: true,
              amount: true,
              transactionDate: true,
              description: true,
            },
          },
          receipts: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              fileSize: true,
              storagePath: true,
              thumbnailPath: true,
              ocrStatus: true,
              createdAt: true,
            },
          },
          expenseTagLinks: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find expense by ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update expense
   */
  async update(
    id: string,
    organizationId: string,
    data: Prisma.ExpenseUpdateInput
  ): Promise<Expense> {
    try {
      const expense = await this.prisma.expense.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });

      this.logger.log(`Updated expense: ${expense.id}`);
      return expense;
    } catch (error) {
      this.logger.error(`Failed to update expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete expense (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.expense.update({
        where: {
          id,
          organizationId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Soft deleted expense: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find expenses with filters and pagination
   */
  async findMany(
    filters: ExpenseFilters,
    page: number = 1,
    limit: number = 50,
    orderBy: Prisma.ExpenseOrderByWithRelationInput = { date: 'desc' }
  ): Promise<{
    expenses: Expense[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        this.prisma.expense.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
                color: true,
              },
            },
            receipts: {
              select: {
                id: true,
                fileName: true,
                thumbnailPath: true,
              },
            },
            expenseTagLinks: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.expense.count({ where }),
      ]);

      return {
        expenses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find expenses: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get expense statistics
   */
  async getStats(
    organizationId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ExpenseStats> {
    try {
      const where: Prisma.ExpenseWhereInput = {
        organizationId,
        deletedAt: null,
        ...(dateFrom &&
          dateTo && {
            date: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
      };

      const [
        totalExpenses,
        totalAmountResult,
        expensesByStatus,
        expensesByPaymentMethod,
        expensesByCategory,
      ] = await Promise.all([
        this.prisma.expense.count({ where }),
        this.prisma.expense.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true },
        }),
        this.prisma.expense.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.expense.groupBy({
          by: ['paymentMethod'],
          where,
          _count: { _all: true },
        }),
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          where,
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

      // Get category names for the category stats
      const categoryIds = expensesByCategory.map(item => item.categoryId);
      const categories = await this.prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

      return {
        totalExpenses,
        totalAmount: Number(totalAmountResult._sum.amount || 0),
        averageAmount: Number(totalAmountResult._avg.amount || 0),
        expensesByStatus: expensesByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count._all;
            return acc;
          },
          {} as Record<ExpenseStatus, number>
        ),
        expensesByPaymentMethod: expensesByPaymentMethod.reduce(
          (acc, item) => {
            acc[item.paymentMethod] = item._count._all;
            return acc;
          },
          {} as Record<PaymentMethod, number>
        ),
        expensesByCategory: expensesByCategory.map(item => ({
          categoryId: item.categoryId,
          categoryName: categoryMap.get(item.categoryId) || 'Unknown',
          count: item._count._all,
          totalAmount: Number(item._sum.amount || 0),
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get expense stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: ExpenseFilters): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
    };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.vendor) {
      where.vendor = {
        contains: filters.vendor,
        mode: 'insensitive',
      };
    }

    if (filters.dateFrom && filters.dateTo) {
      where.date = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters.dateFrom) {
      where.date = {
        gte: filters.dateFrom,
      };
    } else if (filters.dateTo) {
      where.date = {
        lte: filters.dateTo,
      };
    }

    if (filters.amountMin !== undefined && filters.amountMax !== undefined) {
      where.amount = {
        gte: filters.amountMin,
        lte: filters.amountMax,
      };
    } else if (filters.amountMin !== undefined) {
      where.amount = {
        gte: filters.amountMin,
      };
    } else if (filters.amountMax !== undefined) {
      where.amount = {
        lte: filters.amountMax,
      };
    }

    if (filters.isRecurring !== undefined) {
      where.isRecurring = filters.isRecurring;
    }

    if (filters.isTaxDeductible !== undefined) {
      where.isTaxDeductible = filters.isTaxDeductible;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters.search) {
      where.OR = [
        {
          description: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          vendor: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          reference: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          notes: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }
}
