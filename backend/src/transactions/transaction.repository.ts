import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  MobileMoneyProvider,
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

export interface CreateTransactionData {
  organizationId: string;
  accountId: string;
  externalId: string;
  reference?: string;
  transactionDate: Date;
  amount: number;
  currency: string;
  type: TransactionType;
  counterpartyName?: string;
  counterpartyNumber?: string;
  description?: string;
  balanceAfter?: number;
  status: TransactionStatus;
  fees?: number;
  metadata?: any;
}

export interface UpdateTransactionData {
  reference?: string;
  counterpartyName?: string;
  counterpartyNumber?: string;
  description?: string;
  balanceAfter?: number;
  status?: TransactionStatus;
  fees?: number;
  categoryId?: string;
  isReconciled?: boolean;
  invoiceId?: string;
  expenseId?: string;
  metadata?: any;
}

export interface TransactionFilters {
  organizationId: string;
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  status?: TransactionStatus;
  isReconciled?: boolean;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  byType: Record<TransactionType, { count: number; amount: number }>;
  byStatus: Record<TransactionStatus, { count: number; amount: number }>;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new transaction
   */
  async create(data: CreateTransactionData): Promise<Transaction> {
    try {
      return await this.prisma.transaction.create({
        data: {
          organizationId: data.organizationId,
          accountId: data.accountId,
          externalId: data.externalId,
          reference: data.reference,
          transactionDate: data.transactionDate,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency,
          type: data.type,
          counterpartyName: data.counterpartyName,
          counterpartyNumber: data.counterpartyNumber,
          description: data.description,
          balanceAfter: data.balanceAfter
            ? new Prisma.Decimal(data.balanceAfter)
            : null,
          status: data.status,
          fees: data.fees
            ? new Prisma.Decimal(data.fees)
            : new Prisma.Decimal(0),
          metadata: data.metadata,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to create transaction: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create multiple transactions in a batch
   */
  async createMany(
    transactions: CreateTransactionData[]
  ): Promise<{ count: number }> {
    try {
      const data = transactions.map(tx => ({
        organizationId: tx.organizationId,
        accountId: tx.accountId,
        externalId: tx.externalId,
        reference: tx.reference,
        transactionDate: tx.transactionDate,
        amount: new Prisma.Decimal(tx.amount),
        currency: tx.currency,
        type: tx.type,
        counterpartyName: tx.counterpartyName,
        counterpartyNumber: tx.counterpartyNumber,
        description: tx.description,
        balanceAfter: tx.balanceAfter
          ? new Prisma.Decimal(tx.balanceAfter)
          : null,
        status: tx.status,
        fees: tx.fees ? new Prisma.Decimal(tx.fees) : new Prisma.Decimal(0),
        metadata: tx.metadata,
      }));

      return await this.prisma.transaction.createMany({
        data,
        skipDuplicates: true, // Skip transactions with duplicate externalId
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to create transactions batch: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find transaction by external ID
   */
  async findByExternalId(
    organizationId: string,
    externalId: string
  ): Promise<Transaction | null> {
    try {
      return await this.prisma.transaction.findUnique({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId,
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to find transaction by external ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async update(id: string, data: UpdateTransactionData): Promise<Transaction> {
    try {
      const updateData: any = { ...data };

      // Convert numeric fields to Prisma.Decimal
      if (data.balanceAfter !== undefined) {
        updateData.balanceAfter = data.balanceAfter
          ? new Prisma.Decimal(data.balanceAfter)
          : null;
      }
      if (data.fees !== undefined) {
        updateData.fees = new Prisma.Decimal(data.fees);
      }

      return await this.prisma.transaction.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to update transaction: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find transactions with filters and pagination
   */
  async findMany(
    filters: TransactionFilters,
    page: number = 1,
    limit: number = 50,
    orderBy: Prisma.TransactionOrderByWithRelationInput = {
      transactionDate: 'desc',
    }
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            account: {
              select: {
                accountName: true,
                accountNumber: true,
                provider: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                type: true,
                color: true,
              },
            },
          },
        }),
        this.prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      this.logger.error(`Failed to find transactions: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get transaction summary for an organization
   */
  async getSummary(filters: TransactionFilters): Promise<TransactionSummary> {
    try {
      const where = this.buildWhereClause(filters);

      const [totalStats, typeStats, statusStats, dateRange] = await Promise.all(
        [
          this.prisma.transaction.aggregate({
            where,
            _count: { id: true },
            _sum: {
              amount: true,
              fees: true,
            },
          }),
          this.prisma.transaction.groupBy({
            by: ['type'],
            where,
            _count: { id: true },
            _sum: { amount: true },
          }),
          this.prisma.transaction.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where,
            _min: { transactionDate: true },
            _max: { transactionDate: true },
          }),
        ]
      );

      // Build type summary
      const byType: Record<TransactionType, { count: number; amount: number }> =
        {} as any;
      Object.values(TransactionType).forEach(type => {
        byType[type] = { count: 0, amount: 0 };
      });
      typeStats.forEach(stat => {
        byType[stat.type] = {
          count: stat._count.id,
          amount: parseFloat(stat._sum.amount?.toString() || '0'),
        };
      });

      // Build status summary
      const byStatus: Record<
        TransactionStatus,
        { count: number; amount: number }
      > = {} as any;
      Object.values(TransactionStatus).forEach(status => {
        byStatus[status] = { count: 0, amount: 0 };
      });
      statusStats.forEach(stat => {
        byStatus[stat.status] = {
          count: stat._count.id,
          amount: parseFloat(stat._sum.amount?.toString() || '0'),
        };
      });

      return {
        totalTransactions: totalStats._count.id,
        totalAmount: parseFloat(totalStats._sum.amount?.toString() || '0'),
        totalFees: parseFloat(totalStats._sum.fees?.toString() || '0'),
        byType,
        byStatus,
        dateRange: {
          earliest: dateRange._min.transactionDate,
          latest: dateRange._max.transactionDate,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get transaction summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get latest transaction date for an account
   */
  async getLatestTransactionDate(accountId: string): Promise<Date | null> {
    try {
      const result = await this.prisma.transaction.findFirst({
        where: { accountId },
        orderBy: { transactionDate: 'desc' },
        select: { transactionDate: true },
      });

      return result?.transactionDate || null;
    } catch (error: any) {
      this.logger.error(
        `Failed to get latest transaction date: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if transaction exists by external ID
   */
  async existsByExternalId(
    organizationId: string,
    externalId: string
  ): Promise<boolean> {
    try {
      const count = await this.prisma.transaction.count({
        where: {
          organizationId,
          externalId,
        },
      });

      return count > 0;
    } catch (error: any) {
      this.logger.error(
        `Failed to check transaction existence: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete transactions for an account (used when disconnecting account)
   */
  async deleteByAccountId(accountId: string): Promise<{ count: number }> {
    try {
      return await this.prisma.transaction.deleteMany({
        where: { accountId },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to delete transactions: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Build where clause for transaction queries
   */
  private buildWhereClause(
    filters: TransactionFilters
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        where.transactionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.transactionDate.lte = filters.endDate;
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isReconciled !== undefined) {
      where.isReconciled = filters.isReconciled;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) {
        where.amount.gte = new Prisma.Decimal(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        where.amount.lte = new Prisma.Decimal(filters.maxAmount);
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { counterpartyName: { contains: filters.search, mode: 'insensitive' } },
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { externalId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
