import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Receipt, OcrStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface ReceiptFilters {
  expenseId?: string;
  organizationId?: string;
  ocrStatus?: OcrStatus;
  dateFrom?: Date;
  dateTo?: Date;
  fileType?: string;
  search?: string;
}

export interface ReceiptStats {
  totalReceipts: number;
  totalFileSize: number;
  receiptsByStatus: Record<OcrStatus, number>;
  receiptsByFileType: Record<string, number>;
  averageFileSize: number;
}

@Injectable()
export class ReceiptRepository {
  private readonly logger = new Logger(ReceiptRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new receipt record
   */
  async create(data: Prisma.ReceiptCreateInput): Promise<Receipt> {
    try {
      const receipt = await this.prisma.receipt.create({
        data,
        include: {
          expense: {
            select: {
              id: true,
              organizationId: true,
              description: true,
              amount: true,
              date: true,
            },
          },
        },
      });

      this.logger.log(`Created receipt: ${receipt.id} for expense: ${receipt.expenseId}`);
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to create receipt: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find receipt by ID
   */
  async findById(id: string): Promise<Receipt | null> {
    try {
      return await this.prisma.receipt.findUnique({
        where: { id },
        include: {
          expense: {
            select: {
              id: true,
              organizationId: true,
              description: true,
              amount: true,
              date: true,
              vendor: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to find receipt by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find receipts by expense ID
   */
  async findByExpenseId(expenseId: string): Promise<Receipt[]> {
    try {
      return await this.prisma.receipt.findMany({
        where: { expenseId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to find receipts by expense ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update receipt
   */
  async update(id: string, data: Prisma.ReceiptUpdateInput): Promise<Receipt> {
    try {
      const receipt = await this.prisma.receipt.update({
        where: { id },
        data,
        include: {
          expense: {
            select: {
              id: true,
              organizationId: true,
              description: true,
              amount: true,
              date: true,
            },
          },
        },
      });

      this.logger.log(`Updated receipt: ${receipt.id}`);
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to update receipt: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete receipt
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.receipt.delete({
        where: { id },
      });

      this.logger.log(`Deleted receipt: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete receipt: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find receipts with filters and pagination
   */
  async findMany(
    filters: ReceiptFilters,
    page: number = 1,
    limit: number = 50,
    orderBy: Prisma.ReceiptOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<{
    receipts: Receipt[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (page - 1) * limit;

      const [receipts, total] = await Promise.all([
        this.prisma.receipt.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            expense: {
              select: {
                id: true,
                organizationId: true,
                description: true,
                amount: true,
                date: true,
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
          },
        }),
        this.prisma.receipt.count({ where }),
      ]);

      return {
        receipts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find receipts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get receipt statistics
   */
  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date): Promise<ReceiptStats> {
    try {
      const where: Prisma.ReceiptWhereInput = {
        expense: {
          organizationId,
        },
        ...(dateFrom && dateTo && {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
      };

      const [
        totalReceipts,
        totalFileSizeResult,
        receiptsByStatus,
        receiptsByFileType,
      ] = await Promise.all([
        this.prisma.receipt.count({ where }),
        this.prisma.receipt.aggregate({
          where,
          _sum: { fileSize: true },
          _avg: { fileSize: true },
        }),
        this.prisma.receipt.groupBy({
          by: ['ocrStatus'],
          where,
          _count: { _all: true },
        }),
        this.prisma.receipt.groupBy({
          by: ['fileType'],
          where,
          _count: { _all: true },
        }),
      ]);

      return {
        totalReceipts,
        totalFileSize: Number(totalFileSizeResult._sum.fileSize || 0),
        averageFileSize: Number(totalFileSizeResult._avg.fileSize || 0),
        receiptsByStatus: receiptsByStatus.reduce((acc, item) => {
          acc[item.ocrStatus] = item._count._all;
          return acc;
        }, {} as Record<OcrStatus, number>),
        receiptsByFileType: receiptsByFileType.reduce((acc, item) => {
          acc[item.fileType] = item._count._all;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      this.logger.error(`Failed to get receipt stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find receipts pending OCR processing
   */
  async findPendingOcr(limit: number = 10): Promise<Receipt[]> {
    try {
      return await this.prisma.receipt.findMany({
        where: {
          ocrStatus: OcrStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
          expense: {
            select: {
              id: true,
              organizationId: true,
              description: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to find pending OCR receipts: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update OCR status and data
   */
  async updateOcrData(
    id: string,
    ocrStatus: OcrStatus,
    ocrText?: string,
    ocrData?: any,
  ): Promise<Receipt> {
    try {
      const updateData: Prisma.ReceiptUpdateInput = {
        ocrStatus,
        ocrProcessedAt: new Date(),
      };

      if (ocrText) updateData.ocrText = ocrText;
      if (ocrData) updateData.ocrData = ocrData;

      const receipt = await this.prisma.receipt.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Updated OCR data for receipt: ${receipt.id}, status: ${ocrStatus}`);
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to update OCR data: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find receipts by organization
   */
  async findByOrganization(
    organizationId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    receipts: Receipt[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.ReceiptWhereInput = {
        expense: {
          organizationId,
        },
      };

      const skip = (page - 1) * limit;

      const [receipts, total] = await Promise.all([
        this.prisma.receipt.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            expense: {
              select: {
                id: true,
                description: true,
                amount: true,
                date: true,
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
          },
        }),
        this.prisma.receipt.count({ where }),
      ]);

      return {
        receipts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find receipts by organization: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: ReceiptFilters): Prisma.ReceiptWhereInput {
    const where: Prisma.ReceiptWhereInput = {};

    if (filters.expenseId) {
      where.expenseId = filters.expenseId;
    }

    if (filters.organizationId) {
      where.expense = {
        organizationId: filters.organizationId,
      };
    }

    if (filters.ocrStatus) {
      where.ocrStatus = filters.ocrStatus;
    }

    if (filters.fileType) {
      where.fileType = {
        contains: filters.fileType,
        mode: 'insensitive',
      };
    }

    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters.dateFrom) {
      where.createdAt = {
        gte: filters.dateFrom,
      };
    } else if (filters.dateTo) {
      where.createdAt = {
        lte: filters.dateTo,
      };
    }

    if (filters.search) {
      where.OR = [
        {
          fileName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          ocrText: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
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
      ];
    }

    return where;
  }
}
