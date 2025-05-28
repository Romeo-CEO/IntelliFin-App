import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Payment, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CreatePaymentData {
  organizationId: string;
  invoiceId?: string;
  customerId: string;
  transactionId?: string;
  amount: number;
  currency?: string;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdatePaymentData {
  invoiceId?: string;
  transactionId?: string;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface PaymentFilters {
  organizationId: string;
  customerId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

export interface PaymentWithRelations extends Payment {
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };
  transaction?: {
    id: string;
    externalId: string;
    type: string;
    status: string;
  };
}

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment
   */
  async create(data: CreatePaymentData): Promise<PaymentWithRelations> {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          organizationId: data.organizationId,
          invoiceId: data.invoiceId,
          customerId: data.customerId,
          transactionId: data.transactionId,
          amount: data.amount,
          currency: data.currency || 'ZMW',
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          notes: data.notes,
          createdBy: data.createdBy,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
            },
          },
        },
      });

      return payment as PaymentWithRelations;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find payment by ID with relations
   */
  async findById(id: string, organizationId: string): Promise<PaymentWithRelations | null> {
    try {
      return await this.prisma.payment.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              country: true,
              contactPerson: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              status: true,
              issueDate: true,
              dueDate: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
              transactionDate: true,
              counterpartyName: true,
              counterpartyNumber: true,
            },
          },
        },
      }) as PaymentWithRelations;
    } catch (error) {
      this.logger.error(`Failed to find payment by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find payments with filters and pagination
   */
  async findMany(
    filters: PaymentFilters,
    orderBy: Prisma.PaymentOrderByWithRelationInput = { paymentDate: 'desc' },
    skip?: number,
    take?: number,
  ): Promise<PaymentWithRelations[]> {
    try {
      const where = this.buildWhereClause(filters);

      return await this.prisma.payment.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }) as PaymentWithRelations[];
    } catch (error) {
      this.logger.error(`Failed to find payments: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Count payments with filters
   */
  async count(filters: PaymentFilters): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.payment.count({ where });
    } catch (error) {
      this.logger.error(`Failed to count payments: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update payment
   */
  async update(id: string, organizationId: string, data: UpdatePaymentData): Promise<PaymentWithRelations> {
    try {
      const updatedPayment = await this.prisma.payment.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
            },
          },
        },
      });

      return updatedPayment as PaymentWithRelations;
    } catch (error) {
      this.logger.error(`Failed to update payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete payment
   */
  async delete(id: string, organizationId: string): Promise<Payment> {
    try {
      return await this.prisma.payment.delete({
        where: {
          id,
          organizationId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(organizationId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    byMethod: Array<{ method: PaymentMethod; count: number; amount: number }>;
    recentPayments: number;
  }> {
    try {
      const [totalStats, methodStats, recentCount] = await Promise.all([
        this.prisma.payment.aggregate({
          where: { organizationId },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.payment.groupBy({
          by: ['paymentMethod'],
          where: { organizationId },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.payment.count({
          where: {
            organizationId,
            paymentDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      return {
        totalPayments: totalStats._count.id,
        totalAmount: totalStats._sum.amount?.toNumber() || 0,
        byMethod: methodStats.map(stat => ({
          method: stat.paymentMethod,
          count: stat._count.id,
          amount: stat._sum.amount?.toNumber() || 0,
        })),
        recentPayments: recentCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find payments for reconciliation
   */
  async findUnreconciledPayments(organizationId: string): Promise<PaymentWithRelations[]> {
    try {
      return await this.prisma.payment.findMany({
        where: {
          organizationId,
          transactionId: null, // Payments not linked to transactions
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }) as PaymentWithRelations[];
    } catch (error) {
      this.logger.error(`Failed to find unreconciled payments: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find payments by invoice ID
   */
  async findByInvoiceId(invoiceId: string, organizationId: string): Promise<PaymentWithRelations[]> {
    try {
      return await this.prisma.payment.findMany({
        where: {
          invoiceId,
          organizationId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              externalId: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }) as PaymentWithRelations[];
    } catch (error) {
      this.logger.error(`Failed to find payments by invoice ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(filters: PaymentFilters): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.paymentDateFrom || filters.paymentDateTo) {
      where.paymentDate = {};
      if (filters.paymentDateFrom) {
        where.paymentDate.gte = filters.paymentDateFrom;
      }
      if (filters.paymentDateTo) {
        where.paymentDate.lte = filters.paymentDateTo;
      }
    }

    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.amount = {};
      if (filters.amountMin !== undefined) {
        where.amount.gte = filters.amountMin;
      }
      if (filters.amountMax !== undefined) {
        where.amount.lte = filters.amountMax;
      }
    }

    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}
