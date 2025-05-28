import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxFiling, TaxFilingType, TaxFilingStatus, TaxType, Prisma } from '@prisma/client';
import { TaxCalculationService } from './tax-calculation.service';

export interface CreateTaxFilingDto {
  organizationId: string;
  taxPeriodId: string;
  filingType: TaxFilingType;
  preparedBy: string;
}

export interface TaxFilingWithPeriod extends TaxFiling {
  taxPeriod: {
    taxType: string;
    periodStart: Date;
    periodEnd: Date;
    year: number;
    quarter?: number;
    month?: number;
  };
}

export interface FilingSummary {
  totalFilings: number;
  byType: Record<TaxFilingType, {
    count: number;
    totalTax: number;
  }>;
  byStatus: Record<TaxFilingStatus, {
    count: number;
    totalTax: number;
  }>;
  submissionRate: number;
  averageProcessingDays: number;
}

export interface VATReturnData {
  organizationInfo: any;
  period: {
    start: Date;
    end: Date;
    year: number;
    quarter: number;
  };
  sales: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    total: number;
  };
  purchases: {
    standardRated: number;
    zeroRated: number;
    exempt: number;
    total: number;
  };
  vatCalculation: {
    outputVAT: number;
    inputVAT: number;
    netVAT: number;
    payable: boolean;
  };
  adjustments: any[];
}

@Injectable()
export class TaxFilingService {
  private readonly logger = new Logger(TaxFilingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculationService: TaxCalculationService,
  ) {}

  /**
   * Prepare tax filing
   */
  async prepareFiling(dto: CreateTaxFilingDto): Promise<TaxFiling> {
    try {
      this.logger.log(`Preparing ${dto.filingType} filing for period: ${dto.taxPeriodId}`);

      // Verify tax period exists
      const taxPeriod = await this.prisma.taxPeriod.findFirst({
        where: {
          id: dto.taxPeriodId,
          organizationId: dto.organizationId,
        },
        include: {
          organization: true,
        },
      });

      if (!taxPeriod) {
        throw new NotFoundException('Tax period not found');
      }

      // Check if filing already exists
      const existingFiling = await this.prisma.taxFiling.findFirst({
        where: {
          organizationId: dto.organizationId,
          taxPeriodId: dto.taxPeriodId,
          filingType: dto.filingType,
        },
      });

      if (existingFiling) {
        throw new BadRequestException('Filing already exists for this period');
      }

      // Generate filing data based on type
      const filingData = await this.generateFilingData(dto.filingType, taxPeriod);
      const calculatedTax = this.calculateTaxFromFilingData(filingData);

      const filing = await this.prisma.taxFiling.create({
        data: {
          organizationId: dto.organizationId,
          taxPeriodId: dto.taxPeriodId,
          filingType: dto.filingType,
          filingData: JSON.stringify(filingData),
          calculatedTax: new Prisma.Decimal(calculatedTax),
          taxDue: new Prisma.Decimal(calculatedTax),
          status: TaxFilingStatus.DRAFT,
          preparedBy: dto.preparedBy,
          preparedAt: new Date(),
        },
      });

      this.logger.log(`Tax filing prepared: ${filing.id}`);
      return filing;
    } catch (error) {
      this.logger.error(`Failed to prepare tax filing: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit filing to ZRA
   */
  async submitFiling(
    organizationId: string,
    filingId: string,
    submittedBy: string,
  ): Promise<TaxFiling> {
    try {
      const filing = await this.prisma.taxFiling.findFirst({
        where: { id: filingId, organizationId },
      });

      if (!filing) {
        throw new NotFoundException('Tax filing not found');
      }

      if (filing.status !== TaxFilingStatus.PREPARED && filing.status !== TaxFilingStatus.DRAFT) {
        throw new BadRequestException('Only prepared or draft filings can be submitted');
      }

      // TODO: Implement actual ZRA submission
      // For now, simulate submission
      const zraReference = `ZRA-${filing.filingType}-${Date.now()}`;

      const updated = await this.prisma.taxFiling.update({
        where: { id: filingId },
        data: {
          status: TaxFilingStatus.SUBMITTED,
          submittedAt: new Date(),
          submittedBy,
          zraReference,
          zraStatus: 'SUBMITTED',
        },
      });

      this.logger.log(`Tax filing submitted to ZRA: ${filingId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to submit tax filing: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tax filings
   */
  async getFilings(
    organizationId: string,
    filters?: {
      taxPeriodId?: string;
      filingType?: TaxFilingType;
      status?: TaxFilingStatus;
      year?: number;
    },
  ): Promise<TaxFilingWithPeriod[]> {
    try {
      const where: any = { organizationId };

      if (filters?.taxPeriodId) {
        where.taxPeriodId = filters.taxPeriodId;
      }

      if (filters?.filingType) {
        where.filingType = filters.filingType;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.year) {
        where.taxPeriod = {
          year: filters.year,
        };
      }

      const filings = await this.prisma.taxFiling.findMany({
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
        orderBy: { preparedAt: 'desc' },
      });

      return filings;
    } catch (error) {
      this.logger.error(`Failed to get tax filings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate VAT return
   */
  async generateVATReturn(
    organizationId: string,
    taxPeriodId: string,
  ): Promise<VATReturnData> {
    try {
      this.logger.log(`Generating VAT return for period: ${taxPeriodId}`);

      const taxPeriod = await this.prisma.taxPeriod.findFirst({
        where: {
          id: taxPeriodId,
          organizationId,
          taxType: TaxType.VAT,
        },
        include: {
          organization: true,
        },
      });

      if (!taxPeriod) {
        throw new NotFoundException('VAT tax period not found');
      }

      // Get sales data from invoices
      const salesData = await this.getSalesDataForPeriod(organizationId, taxPeriod);
      
      // Get purchase data from expenses
      const purchaseData = await this.getPurchaseDataForPeriod(organizationId, taxPeriod);

      // Calculate VAT
      const outputVAT = salesData.standardRated * 0.16;
      const inputVAT = purchaseData.standardRated * 0.16;
      const netVAT = outputVAT - inputVAT;

      const vatReturn: VATReturnData = {
        organizationInfo: {
          name: taxPeriod.organization.name,
          tin: taxPeriod.organization.zraTin,
          address: taxPeriod.organization.address,
        },
        period: {
          start: taxPeriod.periodStart,
          end: taxPeriod.periodEnd,
          year: taxPeriod.year,
          quarter: taxPeriod.quarter || 1,
        },
        sales: salesData,
        purchases: purchaseData,
        vatCalculation: {
          outputVAT,
          inputVAT,
          netVAT,
          payable: netVAT > 0,
        },
        adjustments: [], // TODO: Get adjustments from tax adjustments table
      };

      this.logger.log('VAT return generated successfully');
      return vatReturn;
    } catch (error) {
      this.logger.error(`Failed to generate VAT return: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get filing summary
   */
  async getFilingSummary(
    organizationId: string,
    year?: number,
  ): Promise<FilingSummary> {
    try {
      const filings = await this.getFilings(organizationId, { year });

      const summary: FilingSummary = {
        totalFilings: filings.length,
        byType: {} as any,
        byStatus: {} as any,
        submissionRate: 0,
        averageProcessingDays: 0,
      };

      // Initialize counters
      Object.values(TaxFilingType).forEach(type => {
        summary.byType[type] = { count: 0, totalTax: 0 };
      });

      Object.values(TaxFilingStatus).forEach(status => {
        summary.byStatus[status] = { count: 0, totalTax: 0 };
      });

      let submittedCount = 0;
      let totalProcessingDays = 0;
      let processedCount = 0;

      filings.forEach(filing => {
        const taxAmount = filing.calculatedTax.toNumber();

        // Count by type
        summary.byType[filing.filingType].count++;
        summary.byType[filing.filingType].totalTax += taxAmount;

        // Count by status
        summary.byStatus[filing.status].count++;
        summary.byStatus[filing.status].totalTax += taxAmount;

        // Count submitted filings
        if (filing.submittedAt) {
          submittedCount++;

          // Calculate processing time
          if (filing.acknowledgedAt) {
            const processingDays = Math.ceil(
              (filing.acknowledgedAt.getTime() - filing.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            totalProcessingDays += processingDays;
            processedCount++;
          }
        }
      });

      summary.submissionRate = filings.length > 0 ? 
        Math.round((submittedCount / filings.length) * 100) : 0;

      summary.averageProcessingDays = processedCount > 0 ? 
        Math.round(totalProcessingDays / processedCount) : 0;

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get filing summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate filing data based on type
   */
  private async generateFilingData(filingType: TaxFilingType, taxPeriod: any): Promise<any> {
    switch (filingType) {
      case TaxFilingType.VAT_RETURN:
        return await this.generateVATReturn(taxPeriod.organizationId, taxPeriod.id);
      
      case TaxFilingType.WHT_RETURN:
        return await this.generateWHTReturnData(taxPeriod.organizationId, taxPeriod);
      
      case TaxFilingType.PAYE_RETURN:
        return await this.generatePAYEReturnData(taxPeriod.organizationId, taxPeriod);
      
      default:
        return {
          type: filingType,
          period: {
            start: taxPeriod.periodStart,
            end: taxPeriod.periodEnd,
            year: taxPeriod.year,
            quarter: taxPeriod.quarter,
            month: taxPeriod.month,
          },
          generatedAt: new Date(),
        };
    }
  }

  /**
   * Calculate tax from filing data
   */
  private calculateTaxFromFilingData(filingData: any): number {
    if (filingData.vatCalculation) {
      return Math.max(0, filingData.vatCalculation.netVAT);
    }
    
    if (filingData.totalTaxWithheld) {
      return filingData.totalTaxWithheld;
    }
    
    if (filingData.totalPAYE) {
      return filingData.totalPAYE;
    }
    
    return 0;
  }

  /**
   * Get sales data for VAT period
   */
  private async getSalesDataForPeriod(organizationId: string, taxPeriod: any) {
    // TODO: Implement actual sales data retrieval from invoices
    // For now, return mock data
    return {
      standardRated: 100000,
      zeroRated: 20000,
      exempt: 5000,
      total: 125000,
    };
  }

  /**
   * Get purchase data for VAT period
   */
  private async getPurchaseDataForPeriod(organizationId: string, taxPeriod: any) {
    // TODO: Implement actual purchase data retrieval from expenses
    // For now, return mock data
    return {
      standardRated: 60000,
      zeroRated: 10000,
      exempt: 3000,
      total: 73000,
    };
  }

  /**
   * Generate WHT return data
   */
  private async generateWHTReturnData(organizationId: string, taxPeriod: any) {
    // TODO: Get actual withholding certificates data
    return {
      type: 'WHT_RETURN',
      period: {
        start: taxPeriod.periodStart,
        end: taxPeriod.periodEnd,
        year: taxPeriod.year,
        month: taxPeriod.month,
      },
      totalTaxWithheld: 15000,
      certificatesCount: 25,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate PAYE return data
   */
  private async generatePAYEReturnData(organizationId: string, taxPeriod: any) {
    // TODO: Get actual PAYE data from payroll
    return {
      type: 'PAYE_RETURN',
      period: {
        start: taxPeriod.periodStart,
        end: taxPeriod.periodEnd,
        year: taxPeriod.year,
        month: taxPeriod.month,
      },
      totalPAYE: 25000,
      employeesCount: 15,
      generatedAt: new Date(),
    };
  }
}
