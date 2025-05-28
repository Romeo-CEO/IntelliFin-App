import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  PaymentRepository,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentFilters,
  PaymentWithRelations,
} from './payment.repository';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentReconciliationService } from './services/payment-reconciliation.service';
import { MobileMoneyPaymentService } from './services/mobile-money-payment.service';
import { InvoiceService } from '../invoices/invoice.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly reconciliationService: PaymentReconciliationService,
    private readonly mobileMoneyService: MobileMoneyPaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new payment
   */
  async createPayment(
    organizationId: string,
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentWithRelations> {
    try {
      // Validate customer exists
      const customer = await this.prisma.customer.findFirst({
        where: { id: createPaymentDto.customerId, organizationId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Validate invoice if provided
      let invoice = null;
      if (createPaymentDto.invoiceId) {
        invoice = await this.prisma.invoice.findFirst({
          where: { id: createPaymentDto.invoiceId, organizationId },
        });

        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }

        // Check if payment amount doesn't exceed outstanding amount
        const outstandingAmount = invoice.totalAmount.toNumber() - (invoice.paidAmount?.toNumber() || 0);
        if (createPaymentDto.amount > outstandingAmount) {
          throw new BadRequestException(
            `Payment amount (${createPaymentDto.amount}) exceeds outstanding amount (${outstandingAmount})`
          );
        }
      }

      // Validate transaction if provided
      if (createPaymentDto.transactionId) {
        const transaction = await this.prisma.transaction.findFirst({
          where: { id: createPaymentDto.transactionId, organizationId },
        });

        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        // Check if transaction is already linked to another payment
        const existingPayment = await this.prisma.payment.findFirst({
          where: { transactionId: createPaymentDto.transactionId },
        });

        if (existingPayment) {
          throw new ConflictException('Transaction is already linked to another payment');
        }
      }

      // Prepare payment data
      const paymentData: CreatePaymentData = {
        organizationId,
        invoiceId: createPaymentDto.invoiceId,
        customerId: createPaymentDto.customerId,
        transactionId: createPaymentDto.transactionId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'ZMW',
        paymentDate: new Date(createPaymentDto.paymentDate),
        paymentMethod: createPaymentDto.paymentMethod,
        reference: createPaymentDto.reference,
        notes: createPaymentDto.notes,
        createdBy: userId,
      };

      // Create payment in transaction
      const payment = await this.prisma.$transaction(async (tx) => {
        // Create the payment
        const newPayment = await this.paymentRepository.create(paymentData);

        // Update invoice if provided
        if (createPaymentDto.invoiceId) {
          await this.updateInvoicePaymentStatus(createPaymentDto.invoiceId, organizationId, tx);
        }

        // Mark transaction as reconciled if provided
        if (createPaymentDto.transactionId) {
          await tx.transaction.update({
            where: { id: createPaymentDto.transactionId },
            data: { isReconciled: true },
          });
        }

        return newPayment;
      });

      this.logger.log(`Created payment: ${payment.id} for customer ${customer.name}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string, organizationId: string): Promise<PaymentWithRelations> {
    const payment = await this.paymentRepository.findById(id, organizationId);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Get payments with filters and pagination
   */
  async getPayments(organizationId: string, query: PaymentQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'paymentDate',
      sortOrder = 'desc',
      ...filters
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const paymentFilters: PaymentFilters = {
      organizationId,
      ...filters,
      ...(filters.paymentDateFrom && { paymentDateFrom: new Date(filters.paymentDateFrom) }),
      ...(filters.paymentDateTo && { paymentDateTo: new Date(filters.paymentDateTo) }),
    };

    const [payments, total] = await Promise.all([
      this.paymentRepository.findMany(paymentFilters, orderBy, skip, limit),
      this.paymentRepository.count(paymentFilters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update payment
   */
  async updatePayment(
    id: string,
    organizationId: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentWithRelations> {
    try {
      // Check if payment exists
      const existingPayment = await this.getPaymentById(id, organizationId);

      // Validate invoice if being updated
      if (updatePaymentDto.invoiceId && updatePaymentDto.invoiceId !== existingPayment.invoiceId) {
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: updatePaymentDto.invoiceId, organizationId },
        });

        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }
      }

      // Validate transaction if being updated
      if (updatePaymentDto.transactionId && updatePaymentDto.transactionId !== existingPayment.transactionId) {
        const transaction = await this.prisma.transaction.findFirst({
          where: { id: updatePaymentDto.transactionId, organizationId },
        });

        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        // Check if transaction is already linked to another payment
        const existingPaymentWithTransaction = await this.prisma.payment.findFirst({
          where: { 
            transactionId: updatePaymentDto.transactionId,
            id: { not: id },
          },
        });

        if (existingPaymentWithTransaction) {
          throw new ConflictException('Transaction is already linked to another payment');
        }
      }

      // Prepare update data
      const updateData: UpdatePaymentData = {
        ...updatePaymentDto,
        ...(updatePaymentDto.paymentDate && { paymentDate: new Date(updatePaymentDto.paymentDate) }),
      };

      // Update payment in transaction
      const payment = await this.prisma.$transaction(async (tx) => {
        // Update the payment
        const updatedPayment = await this.paymentRepository.update(id, organizationId, updateData);

        // Update invoice payment status if invoice changed
        if (updatePaymentDto.invoiceId !== existingPayment.invoiceId) {
          // Update old invoice if it existed
          if (existingPayment.invoiceId) {
            await this.updateInvoicePaymentStatus(existingPayment.invoiceId, organizationId, tx);
          }
          // Update new invoice if provided
          if (updatePaymentDto.invoiceId) {
            await this.updateInvoicePaymentStatus(updatePaymentDto.invoiceId, organizationId, tx);
          }
        } else if (existingPayment.invoiceId && updatePaymentDto.amount !== existingPayment.amount.toNumber()) {
          // Update invoice if amount changed
          await this.updateInvoicePaymentStatus(existingPayment.invoiceId, organizationId, tx);
        }

        // Update transaction reconciliation status
        if (updatePaymentDto.transactionId !== existingPayment.transactionId) {
          // Unmark old transaction if it existed
          if (existingPayment.transactionId) {
            await tx.transaction.update({
              where: { id: existingPayment.transactionId },
              data: { isReconciled: false },
            });
          }
          // Mark new transaction if provided
          if (updatePaymentDto.transactionId) {
            await tx.transaction.update({
              where: { id: updatePaymentDto.transactionId },
              data: { isReconciled: true },
            });
          }
        }

        return updatedPayment;
      });

      this.logger.log(`Updated payment: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to update payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete payment
   */
  async deletePayment(id: string, organizationId: string): Promise<void> {
    try {
      // Check if payment exists
      const payment = await this.getPaymentById(id, organizationId);

      // Delete payment in transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete the payment
        await this.paymentRepository.delete(id, organizationId);

        // Update invoice payment status if payment was linked to invoice
        if (payment.invoiceId) {
          await this.updateInvoicePaymentStatus(payment.invoiceId, organizationId, tx);
        }

        // Unmark transaction as reconciled if it was linked
        if (payment.transactionId) {
          await tx.transaction.update({
            where: { id: payment.transactionId },
            data: { isReconciled: false },
          });
        }
      });

      this.logger.log(`Deleted payment: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete payment: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(organizationId: string) {
    return await this.paymentRepository.getPaymentStats(organizationId);
  }

  /**
   * Get payments by invoice ID
   */
  async getPaymentsByInvoiceId(invoiceId: string, organizationId: string): Promise<PaymentWithRelations[]> {
    return await this.paymentRepository.findByInvoiceId(invoiceId, organizationId);
  }

  /**
   * Reconcile payments automatically
   */
  async reconcilePayments(organizationId: string) {
    return await this.reconciliationService.reconcilePayments(organizationId);
  }

  /**
   * Apply automatic reconciliation matches
   */
  async applyAutomaticMatches(organizationId: string, matches: any[]) {
    return await this.reconciliationService.applyAutomaticMatches(organizationId, matches);
  }

  /**
   * Manually reconcile payment with transaction
   */
  async manualReconcile(organizationId: string, paymentId: string, transactionId: string) {
    return await this.reconciliationService.manualReconcile(organizationId, paymentId, transactionId);
  }

  /**
   * Bulk reconcile payments
   */
  async bulkReconcile(organizationId: string, mappings: Array<{ paymentId: string; transactionId: string }>) {
    return await this.reconciliationService.bulkReconcile(organizationId, mappings);
  }

  /**
   * Get unreconciled payments
   */
  async getUnreconciledPayments(organizationId: string): Promise<PaymentWithRelations[]> {
    return await this.paymentRepository.findUnreconciledPayments(organizationId);
  }

  /**
   * Update invoice payment status based on payments
   */
  private async updateInvoicePaymentStatus(invoiceId: string, organizationId: string, tx?: any) {
    const prisma = tx || this.prisma;

    // Get all payments for this invoice
    const payments = await prisma.payment.findMany({
      where: { invoiceId, organizationId },
    });

    // Calculate total paid amount
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);

    // Get invoice to determine new status
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) return;

    const totalAmount = invoice.totalAmount.toNumber();
    let newStatus = invoice.status;

    if (totalPaid >= totalAmount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    } else {
      // Check if invoice was previously paid and now has no payments
      if (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
        newStatus = 'SENT';
      }
    }

    // Update invoice
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        status: newStatus,
      },
    });
  }

  /**
   * Build order by clause
   */
  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
    const orderByMap: Record<string, any> = {
      paymentDate: { paymentDate: sortOrder },
      amount: { amount: sortOrder },
      customerName: { customer: { name: sortOrder } },
      paymentMethod: { paymentMethod: sortOrder },
      createdAt: { createdAt: sortOrder },
    };

    return orderByMap[sortBy] || { paymentDate: sortOrder };
  }
}
