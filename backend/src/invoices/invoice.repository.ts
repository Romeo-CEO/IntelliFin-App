import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Invoice, InvoiceItem, InvoiceStatus, ZraSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CreateInvoiceData {
  organizationId: string;
  customerId: string;
  invoiceNumber: string;
  reference?: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  vatAmount: number;
  discountAmount?: number;
  totalAmount: number;
  currency?: string;
  status?: InvoiceStatus;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  createdBy: string;
  items: CreateInvoiceItemData[];
}

export interface CreateInvoiceItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate?: number;
  vatAmount: number;
  discountRate?: number;
  discountAmount?: number;
  sortOrder?: number;
}

export interface UpdateInvoiceData {
  customerId?: string;
  reference?: string;
  issueDate?: Date;
  dueDate?: Date;
  subtotal?: number;
  vatAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  status?: InvoiceStatus;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  zraSubmissionStatus?: ZraSubmissionStatus;
  zraSubmissionId?: string;
  zraSubmissionDate?: Date;
  zraReceiptNumber?: string;
  zraQrCode?: string;
}

export interface InvoiceFilters {
  organizationId: string;
  customerId?: string;
  status?: InvoiceStatus;
  zraSubmissionStatus?: ZraSubmissionStatus;
  issueDateFrom?: Date;
  issueDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  isOverdue?: boolean;
}

export interface InvoiceWithRelations extends Invoice {
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    zraTin?: string;
  };
  items: InvoiceItem[];
  _count?: {
    payments: number;
  };
}

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new invoice with items
   */
  async create(data: CreateInvoiceData): Promise<InvoiceWithRelations> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create the invoice
        const invoice = await tx.invoice.create({
          data: {
            organizationId: data.organizationId,
            customerId: data.customerId,
            invoiceNumber: data.invoiceNumber,
            reference: data.reference,
            issueDate: data.issueDate,
            dueDate: data.dueDate,
            subtotal: data.subtotal,
            vatAmount: data.vatAmount,
            discountAmount: data.discountAmount || 0,
            totalAmount: data.totalAmount,
            currency: data.currency || 'ZMW',
            status: data.status || InvoiceStatus.DRAFT,
            notes: data.notes,
            terms: data.terms,
            paymentInstructions: data.paymentInstructions,
            createdBy: data.createdBy,
          },
        });

        // Create invoice items
        if (data.items && data.items.length > 0) {
          await tx.invoiceItem.createMany({
            data: data.items.map((item, index) => ({
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              vatRate: item.vatRate || 16, // Default Zambian VAT rate
              vatAmount: item.vatAmount,
              discountRate: item.discountRate || 0,
              discountAmount: item.discountAmount || 0,
              sortOrder: item.sortOrder || index,
            })),
          });
        }

        // Return invoice with relations
        return await tx.invoice.findUnique({
          where: { id: invoice.id },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                zraTin: true,
              },
            },
            items: {
              orderBy: { sortOrder: 'asc' },
            },
            _count: {
              select: { payments: true },
            },
          },
        }) as InvoiceWithRelations;
      });
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find invoice by ID with relations
   */
  async findById(id: string, organizationId: string): Promise<InvoiceWithRelations | null> {
    try {
      return await this.prisma.invoice.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              zraTin: true,
              address: true,
              city: true,
              country: true,
              contactPerson: true,
            },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { payments: true },
          },
        },
      }) as InvoiceWithRelations;
    } catch (error) {
      this.logger.error(`Failed to find invoice by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find invoices with filters and pagination
   */
  async findMany(
    filters: InvoiceFilters,
    orderBy: Prisma.InvoiceOrderByWithRelationInput = { issueDate: 'desc' },
    skip?: number,
    take?: number,
  ): Promise<InvoiceWithRelations[]> {
    try {
      const where = this.buildWhereClause(filters);

      return await this.prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              zraTin: true,
            },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { payments: true },
          },
        },
        orderBy,
        skip,
        take,
      }) as InvoiceWithRelations[];
    } catch (error) {
      this.logger.error(`Failed to find invoices: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Count invoices with filters
   */
  async count(filters: InvoiceFilters): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.invoice.count({ where });
    } catch (error) {
      this.logger.error(`Failed to count invoices: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update invoice
   */
  async update(id: string, organizationId: string, data: UpdateInvoiceData): Promise<InvoiceWithRelations> {
    try {
      const updatedInvoice = await this.prisma.invoice.update({
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
              zraTin: true,
            },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { payments: true },
          },
        },
      });

      return updatedInvoice as InvoiceWithRelations;
    } catch (error) {
      this.logger.error(`Failed to update invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Soft delete invoice
   */
  async softDelete(id: string, organizationId: string): Promise<Invoice> {
    try {
      return await this.prisma.invoice.update({
        where: {
          id,
          organizationId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(organizationId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }> {
    try {
      const [counts, amounts] = await Promise.all([
        this.prisma.invoice.groupBy({
          by: ['status'],
          where: { organizationId, deletedAt: null },
          _count: { id: true },
        }),
        this.prisma.invoice.aggregate({
          where: { organizationId, deletedAt: null },
          _sum: {
            totalAmount: true,
            paidAmount: true,
          },
        }),
      ]);

      const statusCounts = counts.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      const totalAmount = amounts._sum.totalAmount?.toNumber() || 0;
      const paidAmount = amounts._sum.paidAmount?.toNumber() || 0;

      return {
        total: counts.reduce((sum, item) => sum + item._count.id, 0),
        draft: statusCounts.draft || 0,
        sent: statusCounts.sent || 0,
        paid: statusCounts.paid || 0,
        overdue: statusCounts.overdue || 0,
        totalAmount,
        paidAmount,
        outstandingAmount: totalAmount - paidAmount,
      };
    } catch (error) {
      this.logger.error(`Failed to get invoice stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find overdue invoices
   */
  async findOverdueInvoices(organizationId: string): Promise<InvoiceWithRelations[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return await this.prisma.invoice.findMany({
        where: {
          organizationId,
          deletedAt: null,
          dueDate: { lt: today },
          status: {
            in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              zraTin: true,
            },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }) as InvoiceWithRelations[];
    } catch (error) {
      this.logger.error(`Failed to find overdue invoices: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(filters: InvoiceFilters): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
    };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.zraSubmissionStatus) {
      where.zraSubmissionStatus = filters.zraSubmissionStatus;
    }

    if (filters.issueDateFrom || filters.issueDateTo) {
      where.issueDate = {};
      if (filters.issueDateFrom) {
        where.issueDate.gte = filters.issueDateFrom;
      }
      if (filters.issueDateTo) {
        where.issueDate.lte = filters.issueDateTo;
      }
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = filters.dueDateTo;
      }
    }

    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.totalAmount = {};
      if (filters.amountMin !== undefined) {
        where.totalAmount.gte = filters.amountMin;
      }
      if (filters.amountMax !== undefined) {
        where.totalAmount.lte = filters.amountMax;
      }
    }

    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isOverdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.dueDate = { lt: today };
      where.status = {
        in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
      };
    }

    return where;
  }
}
