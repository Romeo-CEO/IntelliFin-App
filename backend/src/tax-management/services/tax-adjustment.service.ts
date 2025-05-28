import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxAdjustment, TaxAdjustmentType, TaxAdjustmentStatus, Prisma } from '@prisma/client';

export interface CreateTaxAdjustmentDto {
  organizationId: string;
  taxPeriodId: string;
  adjustmentType: TaxAdjustmentType;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  description?: string;
  supportingDocs?: any[];
  requestedBy: string;
}

export interface TaxAdjustmentWithPeriod extends TaxAdjustment {
  taxPeriod: {
    taxType: string;
    periodStart: Date;
    periodEnd: Date;
    year: number;
    quarter?: number;
    month?: number;
  };
}

export interface AdjustmentSummary {
  totalAdjustments: number;
  totalAdjustmentAmount: number;
  byType: Record<TaxAdjustmentType, {
    count: number;
    totalAmount: number;
  }>;
  byStatus: Record<TaxAdjustmentStatus, {
    count: number;
    totalAmount: number;
  }>;
  approvalRate: number;
  averageProcessingDays: number;
}

export interface AdjustmentWorkflowAction {
  adjustmentId: string;
  action: 'APPROVE' | 'REJECT';
  userId: string;
  comments?: string;
}

@Injectable()
export class TaxAdjustmentService {
  private readonly logger = new Logger(TaxAdjustmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create tax adjustment request
   */
  async createAdjustment(dto: CreateTaxAdjustmentDto): Promise<TaxAdjustment> {
    try {
      this.logger.log(`Creating tax adjustment for period: ${dto.taxPeriodId}`);

      // Verify tax period exists
      const taxPeriod = await this.prisma.taxPeriod.findFirst({
        where: {
          id: dto.taxPeriodId,
          organizationId: dto.organizationId,
        },
      });

      if (!taxPeriod) {
        throw new NotFoundException('Tax period not found');
      }

      // Calculate adjustment amount
      const adjustmentAmount = dto.adjustedAmount - dto.originalAmount;

      const adjustment = await this.prisma.taxAdjustment.create({
        data: {
          organizationId: dto.organizationId,
          taxPeriodId: dto.taxPeriodId,
          adjustmentType: dto.adjustmentType,
          originalAmount: new Prisma.Decimal(dto.originalAmount),
          adjustedAmount: new Prisma.Decimal(dto.adjustedAmount),
          adjustmentAmount: new Prisma.Decimal(adjustmentAmount),
          reason: dto.reason,
          description: dto.description,
          supportingDocs: dto.supportingDocs ? JSON.stringify(dto.supportingDocs) : null,
          requestedBy: dto.requestedBy,
          status: TaxAdjustmentStatus.PENDING,
        },
      });

      this.logger.log(`Tax adjustment created: ${adjustment.id}`);
      return adjustment;
    } catch (error) {
      this.logger.error(`Failed to create tax adjustment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tax adjustments
   */
  async getAdjustments(
    organizationId: string,
    filters?: {
      taxPeriodId?: string;
      adjustmentType?: TaxAdjustmentType;
      status?: TaxAdjustmentStatus;
      year?: number;
      requestedBy?: string;
    },
  ): Promise<TaxAdjustmentWithPeriod[]> {
    try {
      const where: any = { organizationId };

      if (filters?.taxPeriodId) {
        where.taxPeriodId = filters.taxPeriodId;
      }

      if (filters?.adjustmentType) {
        where.adjustmentType = filters.adjustmentType;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.requestedBy) {
        where.requestedBy = filters.requestedBy;
      }

      if (filters?.year) {
        where.taxPeriod = {
          year: filters.year,
        };
      }

      const adjustments = await this.prisma.taxAdjustment.findMany({
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
        orderBy: { requestedAt: 'desc' },
      });

      return adjustments;
    } catch (error) {
      this.logger.error(`Failed to get tax adjustments: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process adjustment workflow action
   */
  async processWorkflowAction(
    organizationId: string,
    action: AdjustmentWorkflowAction,
  ): Promise<TaxAdjustment> {
    try {
      const adjustment = await this.prisma.taxAdjustment.findFirst({
        where: {
          id: action.adjustmentId,
          organizationId,
        },
      });

      if (!adjustment) {
        throw new NotFoundException('Tax adjustment not found');
      }

      if (adjustment.status !== TaxAdjustmentStatus.PENDING) {
        throw new BadRequestException('Only pending adjustments can be processed');
      }

      const updateData: any = {};

      if (action.action === 'APPROVE') {
        updateData.status = TaxAdjustmentStatus.APPROVED;
        updateData.approvedBy = action.userId;
        updateData.approvedAt = new Date();
      } else if (action.action === 'REJECT') {
        updateData.status = TaxAdjustmentStatus.REJECTED;
        updateData.rejectedBy = action.userId;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = action.comments;
      }

      const updated = await this.prisma.taxAdjustment.update({
        where: { id: action.adjustmentId },
        data: updateData,
      });

      this.logger.log(`Tax adjustment ${action.action.toLowerCase()}: ${action.adjustmentId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to process adjustment workflow: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit approved adjustment to ZRA
   */
  async submitToZRA(
    organizationId: string,
    adjustmentId: string,
  ): Promise<TaxAdjustment> {
    try {
      const adjustment = await this.prisma.taxAdjustment.findFirst({
        where: { id: adjustmentId, organizationId },
      });

      if (!adjustment) {
        throw new NotFoundException('Tax adjustment not found');
      }

      if (adjustment.status !== TaxAdjustmentStatus.APPROVED) {
        throw new BadRequestException('Only approved adjustments can be submitted to ZRA');
      }

      // TODO: Implement actual ZRA submission
      // For now, simulate submission
      const zraReference = `ZRA-ADJ-${Date.now()}`;

      const updated = await this.prisma.taxAdjustment.update({
        where: { id: adjustmentId },
        data: {
          status: TaxAdjustmentStatus.PROCESSING,
          submittedToZra: true,
          zraReference,
        },
      });

      this.logger.log(`Adjustment submitted to ZRA: ${adjustmentId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to submit adjustment to ZRA: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get adjustment summary
   */
  async getAdjustmentSummary(
    organizationId: string,
    year?: number,
  ): Promise<AdjustmentSummary> {
    try {
      const adjustments = await this.getAdjustments(organizationId, { year });

      const summary: AdjustmentSummary = {
        totalAdjustments: adjustments.length,
        totalAdjustmentAmount: 0,
        byType: {} as any,
        byStatus: {} as any,
        approvalRate: 0,
        averageProcessingDays: 0,
      };

      // Initialize counters
      Object.values(TaxAdjustmentType).forEach(type => {
        summary.byType[type] = { count: 0, totalAmount: 0 };
      });

      Object.values(TaxAdjustmentStatus).forEach(status => {
        summary.byStatus[status] = { count: 0, totalAmount: 0 };
      });

      let approvedCount = 0;
      let totalProcessingDays = 0;
      let processedCount = 0;

      adjustments.forEach(adj => {
        const adjustmentAmount = Math.abs(adj.adjustmentAmount.toNumber());
        summary.totalAdjustmentAmount += adjustmentAmount;

        // Count by type
        summary.byType[adj.adjustmentType].count++;
        summary.byType[adj.adjustmentType].totalAmount += adjustmentAmount;

        // Count by status
        summary.byStatus[adj.status].count++;
        summary.byStatus[adj.status].totalAmount += adjustmentAmount;

        // Calculate approval rate
        if (adj.status === TaxAdjustmentStatus.APPROVED || adj.status === TaxAdjustmentStatus.COMPLETED) {
          approvedCount++;
        }

        // Calculate processing time
        if (adj.approvedAt || adj.rejectedAt) {
          const processedAt = adj.approvedAt || adj.rejectedAt;
          const processingDays = Math.ceil(
            (processedAt!.getTime() - adj.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          totalProcessingDays += processingDays;
          processedCount++;
        }
      });

      summary.approvalRate = adjustments.length > 0 ? 
        Math.round((approvedCount / adjustments.length) * 100) : 0;

      summary.averageProcessingDays = processedCount > 0 ? 
        Math.round(totalProcessingDays / processedCount) : 0;

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get adjustment summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pending adjustments requiring approval
   */
  async getPendingApprovals(organizationId: string): Promise<TaxAdjustmentWithPeriod[]> {
    try {
      return await this.getAdjustments(organizationId, {
        status: TaxAdjustmentStatus.PENDING,
      });
    } catch (error) {
      this.logger.error(`Failed to get pending approvals: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Auto-approve small adjustments
   */
  async autoApproveSmallAdjustments(
    organizationId: string,
    threshold: number = 1000, // K1,000 threshold
    approvedBy: string,
  ): Promise<{ approved: number; total: number }> {
    try {
      const pendingAdjustments = await this.getPendingApprovals(organizationId);
      
      const smallAdjustments = pendingAdjustments.filter(adj => 
        Math.abs(adj.adjustmentAmount.toNumber()) <= threshold
      );

      let approved = 0;

      for (const adjustment of smallAdjustments) {
        try {
          await this.processWorkflowAction(organizationId, {
            adjustmentId: adjustment.id,
            action: 'APPROVE',
            userId: approvedBy,
            comments: `Auto-approved: adjustment amount below K${threshold} threshold`,
          });
          approved++;
        } catch (error) {
          this.logger.warn(`Failed to auto-approve adjustment ${adjustment.id}: ${error.message}`);
        }
      }

      this.logger.log(`Auto-approved ${approved} of ${smallAdjustments.length} small adjustments`);
      return { approved, total: smallAdjustments.length };
    } catch (error) {
      this.logger.error(`Failed to auto-approve adjustments: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate adjustment report
   */
  async generateAdjustmentReport(
    organizationId: string,
    year: number,
  ): Promise<any> {
    try {
      this.logger.log(`Generating adjustment report for year ${year}`);

      const adjustments = await this.getAdjustments(organizationId, { year });
      const summary = await this.getAdjustmentSummary(organizationId, year);

      const report = {
        organizationId,
        year,
        summary,
        adjustments: adjustments.map(adj => ({
          id: adj.id,
          type: adj.adjustmentType,
          originalAmount: adj.originalAmount.toNumber(),
          adjustedAmount: adj.adjustedAmount.toNumber(),
          adjustmentAmount: adj.adjustmentAmount.toNumber(),
          reason: adj.reason,
          status: adj.status,
          requestedAt: adj.requestedAt,
          approvedAt: adj.approvedAt,
          rejectedAt: adj.rejectedAt,
          taxPeriod: adj.taxPeriod,
        })),
        generatedAt: new Date(),
      };

      this.logger.log('Adjustment report generated successfully');
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate adjustment report: ${error.message}`, error.stack);
      throw error;
    }
  }
}
