import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, ZraSubmissionStatus } from '@prisma/client';
import {
  CreateInvoiceData,
  CreateInvoiceItemData,
  InvoiceFilters,
  InvoiceRepository,
  InvoiceWithRelations,
  UpdateInvoiceData,
} from './invoice.repository';
import {
  CreateInvoiceDto,
  InvoiceQueryDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { VatCalculator } from './utils/vat-calculator';
import { InvoiceNumberGenerator } from './utils/invoice-number-generator';
import { ZraInvoiceService } from './services/zra-invoice.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceNumberGenerator: InvoiceNumberGenerator,
    private readonly zraInvoiceService: ZraInvoiceService
  ) {}

  /**
   * Create a new invoice
   */
  async createInvoice(
    organizationId: string,
    userId: string,
    createInvoiceDto: CreateInvoiceDto
  ): Promise<InvoiceWithRelations> {
    try {
      // Generate invoice number
      const { invoiceNumber } =
        await this.invoiceNumberGenerator.generateInvoiceNumber(organizationId);

      // Calculate invoice totals
      const calculations = VatCalculator.calculateInvoiceTotals(
        createInvoiceDto.items,
        createInvoiceDto.discountAmount || 0
      );

      // Validate calculations
      const validation = VatCalculator.validateInvoiceCalculations(
        calculations.items,
        calculations.subtotalAfterDiscount,
        calculations.totalVatAmount,
        calculations.grandTotal
      );

      if (!validation.isValid) {
        throw new BadRequestException(
          `Invoice calculation errors: ${validation.errors.join(', ')}`
        );
      }

      // Prepare invoice data
      const invoiceData: CreateInvoiceData = {
        organizationId,
        customerId: createInvoiceDto.customerId,
        invoiceNumber,
        reference: createInvoiceDto.reference,
        issueDate: new Date(createInvoiceDto.issueDate),
        dueDate: new Date(createInvoiceDto.dueDate),
        subtotal: calculations.subtotalAfterDiscount,
        vatAmount: calculations.totalVatAmount,
        discountAmount: createInvoiceDto.discountAmount || 0,
        totalAmount: calculations.grandTotal,
        currency: createInvoiceDto.currency || 'ZMW',
        status: createInvoiceDto.status || InvoiceStatus.DRAFT,
        notes: createInvoiceDto.notes,
        terms: createInvoiceDto.terms,
        paymentInstructions: createInvoiceDto.paymentInstructions,
        createdBy: userId,
        items: calculations.items.map((item, index) => ({
          description: createInvoiceDto.items[index].description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          discountRate: createInvoiceDto.items[index].discountRate,
          discountAmount: item.discountAmount,
          sortOrder: createInvoiceDto.items[index].sortOrder || index,
        })),
      };

      // Validate due date
      if (invoiceData.dueDate <= invoiceData.issueDate) {
        throw new BadRequestException('Due date must be after issue date');
      }

      const invoice = await this.invoiceRepository.create(invoiceData);

      this.logger.log(
        `Created invoice: ${invoice.invoiceNumber} (${invoice.id}) for organization ${organizationId}`
      );
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(
    id: string,
    organizationId: string
  ): Promise<InvoiceWithRelations> {
    const invoice = await this.invoiceRepository.findById(id, organizationId);

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Get invoices with filters and pagination
   */
  async getInvoices(organizationId: string, query: InvoiceQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'issueDate',
      sortOrder = 'desc',
      ...filters
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const invoiceFilters: InvoiceFilters = {
      organizationId,
      ...filters,
      ...(filters.issueDateFrom && {
        issueDateFrom: new Date(filters.issueDateFrom),
      }),
      ...(filters.issueDateTo && {
        issueDateTo: new Date(filters.issueDateTo),
      }),
      ...(filters.dueDateFrom && {
        dueDateFrom: new Date(filters.dueDateFrom),
      }),
      ...(filters.dueDateTo && { dueDateTo: new Date(filters.dueDateTo) }),
    };

    const [invoices, total] = await Promise.all([
      this.invoiceRepository.findMany(invoiceFilters, orderBy, skip, limit),
      this.invoiceRepository.count(invoiceFilters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update invoice
   */
  async updateInvoice(
    id: string,
    organizationId: string,
    updateInvoiceDto: UpdateInvoiceDto
  ): Promise<InvoiceWithRelations> {
    try {
      // Check if invoice exists
      const existingInvoice = await this.getInvoiceById(id, organizationId);

      // Validate status transitions
      if (updateInvoiceDto.status) {
        this.validateStatusTransition(
          existingInvoice.status,
          updateInvoiceDto.status
        );
      }

      // If updating items, recalculate totals
      let updateData: UpdateInvoiceData = { ...updateInvoiceDto };

      if (updateInvoiceDto.items) {
        const calculations = VatCalculator.calculateInvoiceTotals(
          updateInvoiceDto.items,
          updateInvoiceDto.discountAmount || 0
        );

        updateData = {
          ...updateData,
          subtotal: calculations.subtotalAfterDiscount,
          vatAmount: calculations.totalVatAmount,
          totalAmount: calculations.grandTotal,
        };

        // TODO: Update invoice items (requires separate item management)
      }

      // Convert date strings to Date objects
      if (updateInvoiceDto.issueDate) {
        updateData.issueDate = new Date(updateInvoiceDto.issueDate);
      }
      if (updateInvoiceDto.dueDate) {
        updateData.dueDate = new Date(updateInvoiceDto.dueDate);
      }

      // Validate due date
      if (
        updateData.dueDate &&
        updateData.issueDate &&
        updateData.dueDate <= updateData.issueDate
      ) {
        throw new BadRequestException('Due date must be after issue date');
      }

      const invoice = await this.invoiceRepository.update(
        id,
        organizationId,
        updateData
      );

      this.logger.log(
        `Updated invoice: ${invoice.invoiceNumber} (${invoice.id})`
      );
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to update invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete invoice (soft delete)
   */
  async deleteInvoice(id: string, organizationId: string): Promise<void> {
    try {
      // Check if invoice exists
      const invoice = await this.getInvoiceById(id, organizationId);

      // Validate deletion rules
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Cannot delete a paid invoice');
      }

      if (invoice.zraSubmissionStatus === ZraSubmissionStatus.ACCEPTED) {
        throw new BadRequestException(
          'Cannot delete an invoice that has been accepted by ZRA'
        );
      }

      await this.invoiceRepository.softDelete(id, organizationId);

      this.logger.log(
        `Deleted invoice: ${invoice.invoiceNumber} (${invoice.id})`
      );
    } catch (error) {
      this.logger.error(`Failed to delete invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(organizationId: string) {
    return await this.invoiceRepository.getInvoiceStats(organizationId);
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(
    id: string,
    organizationId: string
  ): Promise<InvoiceWithRelations> {
    try {
      const invoice = await this.getInvoiceById(id, organizationId);

      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException('Only draft invoices can be sent');
      }

      // Update status to SENT
      const updatedInvoice = await this.invoiceRepository.update(
        id,
        organizationId,
        {
          status: InvoiceStatus.SENT,
        }
      );

      // TODO: Send email notification to customer

      this.logger.log(`Sent invoice: ${invoice.invoiceNumber} (${invoice.id})`);
      return updatedInvoice;
    } catch (error) {
      this.logger.error(`Failed to send invoice: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit invoice to ZRA
   */
  async submitToZra(
    id: string,
    organizationId: string,
    organizationTin: string
  ): Promise<InvoiceWithRelations> {
    try {
      const invoice = await this.getInvoiceById(id, organizationId);

      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new BadRequestException(
          'Cannot submit draft invoice to ZRA. Send the invoice first.'
        );
      }

      if (invoice.zraSubmissionStatus === ZraSubmissionStatus.ACCEPTED) {
        throw new BadRequestException(
          'Invoice has already been accepted by ZRA'
        );
      }

      // Submit to ZRA
      const submission = await this.zraInvoiceService.submitInvoice(
        invoice,
        organizationTin
      );

      // Update invoice with ZRA submission details
      const updatedInvoice = await this.invoiceRepository.update(
        id,
        organizationId,
        {
          zraSubmissionStatus: submission.status,
          zraSubmissionId: submission.submissionId,
          zraSubmissionDate: submission.submissionDate,
          zraReceiptNumber: submission.receiptNumber,
          zraQrCode: submission.qrCode,
        }
      );

      this.logger.log(
        `Submitted invoice to ZRA: ${invoice.invoiceNumber} (${invoice.id}), status: ${submission.status}`
      );
      return updatedInvoice;
    } catch (error) {
      this.logger.error(
        `Failed to submit invoice to ZRA: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(
    id: string,
    organizationId: string,
    paidAmount: number,
    paymentDate?: Date
  ): Promise<InvoiceWithRelations> {
    try {
      const invoice = await this.getInvoiceById(id, organizationId);

      if (paidAmount <= 0) {
        throw new BadRequestException('Paid amount must be greater than 0');
      }

      if (paidAmount > invoice.totalAmount) {
        throw new BadRequestException('Paid amount cannot exceed total amount');
      }

      const totalPaid = (invoice.paidAmount || 0) + paidAmount;
      let newStatus = invoice.status;

      if (totalPaid >= invoice.totalAmount) {
        newStatus = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const updatedInvoice = await this.invoiceRepository.update(
        id,
        organizationId,
        {
          paidAmount: totalPaid,
          status: newStatus,
        }
      );

      this.logger.log(
        `Marked invoice as paid: ${invoice.invoiceNumber} (${invoice.id}), amount: ${paidAmount}`
      );
      return updatedInvoice;
    } catch (error) {
      this.logger.error(
        `Failed to mark invoice as paid: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(
    organizationId: string
  ): Promise<InvoiceWithRelations[]> {
    return await this.invoiceRepository.findOverdueInvoices(organizationId);
  }

  /**
   * Update overdue invoices status
   */
  async updateOverdueInvoices(organizationId: string): Promise<number> {
    try {
      const overdueInvoices = await this.getOverdueInvoices(organizationId);
      let updatedCount = 0;

      for (const invoice of overdueInvoices) {
        if (invoice.status !== InvoiceStatus.OVERDUE) {
          await this.invoiceRepository.update(invoice.id, organizationId, {
            status: InvoiceStatus.OVERDUE,
          });
          updatedCount++;
        }
      }

      this.logger.log(
        `Updated ${updatedCount} overdue invoices for organization ${organizationId}`
      );
      return updatedCount;
    } catch (error) {
      this.logger.error(
        `Failed to update overdue invoices: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate invoice status transition
   */
  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus
  ): void {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
      [InvoiceStatus.SENT]: [
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.PARTIALLY_PAID]: [
        InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.BAD_DEBT,
      ],
      [InvoiceStatus.PAID]: [], // Paid invoices cannot be changed
      [InvoiceStatus.OVERDUE]: [
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.PAID,
        InvoiceStatus.BAD_DEBT,
      ],
      [InvoiceStatus.CANCELLED]: [], // Cancelled invoices cannot be changed
      [InvoiceStatus.BAD_DEBT]: [
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.PAID,
      ], // Can recover from bad debt
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Build order by clause
   */
  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
    const orderByMap: Record<string, any> = {
      invoiceNumber: { invoiceNumber: sortOrder },
      issueDate: { issueDate: sortOrder },
      dueDate: { dueDate: sortOrder },
      totalAmount: { totalAmount: sortOrder },
      status: { status: sortOrder },
      customerName: { customer: { name: sortOrder } },
    };

    return orderByMap[sortBy] || { issueDate: sortOrder };
  }
}
