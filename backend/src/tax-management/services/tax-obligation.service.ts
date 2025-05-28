import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxObligation, TaxObligationType, TaxObligationStatus, Prisma } from '@prisma/client';

export interface CreateTaxObligationDto {
  organizationId: string;
  taxPeriodId: string;
  obligationType: TaxObligationType;
  amountDue: number;
  dueDate: Date;
  description?: string;
}

export interface UpdateTaxObligationDto {
  amountDue?: number;
  amountPaid?: number;
  status?: TaxObligationStatus;
  paymentMethod?: string;
  paymentReference?: string;
  penaltyAmount?: number;
  interestAmount?: number;
}

export interface TaxObligationSummary {
  totalObligations: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  overdueAmount: number;
  byStatus: Record<TaxObligationStatus, {
    count: number;
    amount: number;
  }>;
  byType: Record<TaxObligationType, {
    count: number;
    amount: number;
  }>;
}

export interface PaymentPlan {
  obligationId: string;
  installments: Array<{
    amount: number;
    dueDate: Date;
    description: string;
  }>;
  totalAmount: number;
  numberOfInstallments: number;
}

@Injectable()
export class TaxObligationService {
  private readonly logger = new Logger(TaxObligationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tax obligation
   */
  async createObligation(dto: CreateTaxObligationDto): Promise<TaxObligation> {
    try {
      this.logger.log(`Creating tax obligation for period: ${dto.taxPeriodId}`);

      // Verify tax period exists and belongs to organization
      const taxPeriod = await this.prisma.taxPeriod.findFirst({
        where: {
          id: dto.taxPeriodId,
          organizationId: dto.organizationId,
        },
      });

      if (!taxPeriod) {
        throw new NotFoundException('Tax period not found');
      }

      const obligation = await this.prisma.taxObligation.create({
        data: {
          organizationId: dto.organizationId,
          taxPeriodId: dto.taxPeriodId,
          obligationType: dto.obligationType,
          amountDue: new Prisma.Decimal(dto.amountDue),
          dueDate: dto.dueDate,
          status: TaxObligationStatus.PENDING,
        },
      });

      this.logger.log(`Tax obligation created: ${obligation.id}`);
      return obligation;
    } catch (error) {
      this.logger.error(`Failed to create tax obligation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tax obligations for organization
   */
  async getObligations(
    organizationId: string,
    filters?: {
      taxPeriodId?: string;
      obligationType?: TaxObligationType;
      status?: TaxObligationStatus;
      overdue?: boolean;
      year?: number;
    },
  ): Promise<TaxObligation[]> {
    try {
      const where: any = { organizationId };

      if (filters?.taxPeriodId) {
        where.taxPeriodId = filters.taxPeriodId;
      }

      if (filters?.obligationType) {
        where.obligationType = filters.obligationType;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.overdue) {
        where.dueDate = { lt: new Date() };
        where.status = { not: TaxObligationStatus.COMPLETED };
      }

      if (filters?.year) {
        where.taxPeriod = {
          year: filters.year,
        };
      }

      const obligations = await this.prisma.taxObligation.findMany({
        where,
        include: {
          taxPeriod: {
            select: {
              taxType: true,
              periodStart: true,
              periodEnd: true,
              year: true,
              quarter: true,
              month: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return obligations;
    } catch (error) {
      this.logger.error(`Failed to get tax obligations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update tax obligation
   */
  async updateObligation(
    organizationId: string,
    obligationId: string,
    dto: UpdateTaxObligationDto,
  ): Promise<TaxObligation> {
    try {
      // Verify obligation exists and belongs to organization
      const existing = await this.prisma.taxObligation.findFirst({
        where: { id: obligationId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException('Tax obligation not found');
      }

      const updateData: any = {};

      if (dto.amountDue !== undefined) {
        updateData.amountDue = new Prisma.Decimal(dto.amountDue);
      }

      if (dto.amountPaid !== undefined) {
        updateData.amountPaid = new Prisma.Decimal(dto.amountPaid);
        
        // Auto-update status based on payment
        const totalDue = dto.amountDue !== undefined ? dto.amountDue : existing.amountDue.toNumber();
        if (dto.amountPaid >= totalDue) {
          updateData.status = TaxObligationStatus.COMPLETED;
          updateData.paidAt = new Date();
        } else if (dto.amountPaid > 0) {
          updateData.status = TaxObligationStatus.PARTIALLY_PAID;
        }
      }

      if (dto.status) {
        updateData.status = dto.status;
        if (dto.status === TaxObligationStatus.COMPLETED) {
          updateData.paidAt = new Date();
        }
      }

      if (dto.paymentMethod) {
        updateData.paymentMethod = dto.paymentMethod;
      }

      if (dto.paymentReference) {
        updateData.paymentReference = dto.paymentReference;
      }

      if (dto.penaltyAmount !== undefined) {
        updateData.penaltyAmount = new Prisma.Decimal(dto.penaltyAmount);
      }

      if (dto.interestAmount !== undefined) {
        updateData.interestAmount = new Prisma.Decimal(dto.interestAmount);
      }

      const updated = await this.prisma.taxObligation.update({
        where: { id: obligationId },
        data: updateData,
      });

      this.logger.log(`Tax obligation updated: ${obligationId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update tax obligation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Record payment for tax obligation
   */
  async recordPayment(
    organizationId: string,
    obligationId: string,
    amount: number,
    paymentMethod: string,
    paymentReference?: string,
  ): Promise<TaxObligation> {
    try {
      const obligation = await this.prisma.taxObligation.findFirst({
        where: { id: obligationId, organizationId },
      });

      if (!obligation) {
        throw new NotFoundException('Tax obligation not found');
      }

      const currentPaid = obligation.amountPaid.toNumber();
      const newPaidAmount = currentPaid + amount;
      const totalDue = obligation.amountDue.toNumber() + 
                      obligation.penaltyAmount.toNumber() + 
                      obligation.interestAmount.toNumber();

      if (newPaidAmount > totalDue) {
        throw new BadRequestException('Payment amount exceeds total amount due');
      }

      return await this.updateObligation(organizationId, obligationId, {
        amountPaid: newPaidAmount,
        paymentMethod,
        paymentReference,
      });
    } catch (error) {
      this.logger.error(`Failed to record payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate penalties and interest for overdue obligations
   */
  async calculatePenaltiesAndInterest(organizationId: string): Promise<void> {
    try {
      this.logger.log(`Calculating penalties and interest for organization: ${organizationId}`);

      const overdueObligations = await this.getObligations(organizationId, { overdue: true });

      for (const obligation of overdueObligations) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - obligation.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue > 0) {
          // Zambian penalty rates (simplified)
          const penaltyRate = 0.05; // 5% penalty
          const interestRate = 0.02; // 2% per month interest

          const penaltyAmount = obligation.amountDue.toNumber() * penaltyRate;
          const monthsOverdue = Math.ceil(daysOverdue / 30);
          const interestAmount = obligation.amountDue.toNumber() * interestRate * monthsOverdue;

          await this.updateObligation(organizationId, obligation.id, {
            penaltyAmount,
            interestAmount,
          });
        }
      }

      this.logger.log('Penalties and interest calculation completed');
    } catch (error) {
      this.logger.error(`Failed to calculate penalties: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tax obligation summary
   */
  async getObligationSummary(organizationId: string, year?: number): Promise<TaxObligationSummary> {
    try {
      const obligations = await this.getObligations(organizationId, { year });

      const summary: TaxObligationSummary = {
        totalObligations: obligations.length,
        totalAmountDue: 0,
        totalAmountPaid: 0,
        totalOutstanding: 0,
        totalOverdue: 0,
        overdueAmount: 0,
        byStatus: {} as any,
        byType: {} as any,
      };

      // Initialize status and type counters
      Object.values(TaxObligationStatus).forEach(status => {
        summary.byStatus[status] = { count: 0, amount: 0 };
      });

      Object.values(TaxObligationType).forEach(type => {
        summary.byType[type] = { count: 0, amount: 0 };
      });

      const now = new Date();

      obligations.forEach(obligation => {
        const amountDue = obligation.amountDue.toNumber();
        const amountPaid = obligation.amountPaid.toNumber();
        const outstanding = amountDue - amountPaid;

        summary.totalAmountDue += amountDue;
        summary.totalAmountPaid += amountPaid;
        summary.totalOutstanding += outstanding;

        // Count by status
        summary.byStatus[obligation.status].count++;
        summary.byStatus[obligation.status].amount += amountDue;

        // Count by type
        summary.byType[obligation.obligationType].count++;
        summary.byType[obligation.obligationType].amount += amountDue;

        // Check if overdue
        if (obligation.dueDate < now && obligation.status !== TaxObligationStatus.COMPLETED) {
          summary.totalOverdue++;
          summary.overdueAmount += outstanding;
        }
      });

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get obligation summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get upcoming obligations (due in next 30 days)
   */
  async getUpcomingObligations(organizationId: string): Promise<TaxObligation[]> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      return await this.prisma.taxObligation.findMany({
        where: {
          organizationId,
          dueDate: {
            gte: new Date(),
            lte: thirtyDaysFromNow,
          },
          status: {
            not: TaxObligationStatus.COMPLETED,
          },
        },
        include: {
          taxPeriod: {
            select: {
              taxType: true,
              periodStart: true,
              periodEnd: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get upcoming obligations: ${error.message}`, error.stack);
      throw error;
    }
  }
}
