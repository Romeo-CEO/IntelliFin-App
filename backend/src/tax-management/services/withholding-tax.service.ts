import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WithholdingTaxCertificate, WithholdingCertificateStatus, Prisma } from '@prisma/client';

export interface CreateWithholdingCertificateDto {
  organizationId: string;
  taxPeriodId: string;
  supplierName: string;
  supplierTin?: string;
  serviceType: string;
  serviceDescription?: string;
  grossAmount: number;
  withholdingRate: number;
  paymentDate: Date;
}

export interface WithholdingCertificateWithPeriod extends WithholdingTaxCertificate {
  taxPeriod: {
    taxType: string;
    periodStart: Date;
    periodEnd: Date;
    year: number;
    quarter?: number;
    month?: number;
  };
}

export interface WithholdingTaxSummary {
  totalCertificates: number;
  totalGrossAmount: number;
  totalTaxWithheld: number;
  totalNetAmount: number;
  byStatus: Record<WithholdingCertificateStatus, {
    count: number;
    grossAmount: number;
    taxWithheld: number;
  }>;
  byServiceType: Record<string, {
    count: number;
    grossAmount: number;
    taxWithheld: number;
  }>;
  submissionRate: number;
}

@Injectable()
export class WithholdingTaxService {
  private readonly logger = new Logger(WithholdingTaxService.name);

  // Zambian withholding tax rates by service type
  private readonly WITHHOLDING_RATES = {
    PROFESSIONAL_SERVICES: 0.15,
    RENT: 0.10,
    INTEREST: 0.15,
    DIVIDENDS: 0.15,
    ROYALTIES: 0.15,
    MANAGEMENT_FEES: 0.15,
    TECHNICAL_FEES: 0.15,
    COMMISSIONS: 0.15,
    CONSULTANCY: 0.15,
    OTHER: 0.15,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create withholding tax certificate
   */
  async createCertificate(dto: CreateWithholdingCertificateDto): Promise<WithholdingTaxCertificate> {
    try {
      this.logger.log(`Creating withholding tax certificate for ${dto.supplierName}`);

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

      // Calculate tax amounts
      const withholdingRate = dto.withholdingRate || this.getDefaultRate(dto.serviceType);
      const taxWithheld = dto.grossAmount * withholdingRate;
      const netAmount = dto.grossAmount - taxWithheld;

      // Generate certificate number
      const certificateNumber = await this.generateCertificateNumber(dto.organizationId, taxPeriod);

      const certificate = await this.prisma.withholdingTaxCertificate.create({
        data: {
          organizationId: dto.organizationId,
          taxPeriodId: dto.taxPeriodId,
          certificateNumber,
          supplierName: dto.supplierName,
          supplierTin: dto.supplierTin,
          serviceType: dto.serviceType,
          serviceDescription: dto.serviceDescription,
          grossAmount: new Prisma.Decimal(dto.grossAmount),
          taxWithheld: new Prisma.Decimal(taxWithheld),
          netAmount: new Prisma.Decimal(netAmount),
          withholdingRate: new Prisma.Decimal(withholdingRate),
          issueDate: new Date(),
          paymentDate: dto.paymentDate,
          status: WithholdingCertificateStatus.ISSUED,
        },
      });

      this.logger.log(`Withholding tax certificate created: ${certificate.id}`);
      return certificate;
    } catch (error) {
      this.logger.error(`Failed to create withholding certificate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get withholding tax certificates
   */
  async getCertificates(
    organizationId: string,
    filters?: {
      taxPeriodId?: string;
      supplierTin?: string;
      serviceType?: string;
      status?: WithholdingCertificateStatus;
      year?: number;
      month?: number;
    },
  ): Promise<WithholdingCertificateWithPeriod[]> {
    try {
      const where: any = { organizationId };

      if (filters?.taxPeriodId) {
        where.taxPeriodId = filters.taxPeriodId;
      }

      if (filters?.supplierTin) {
        where.supplierTin = filters.supplierTin;
      }

      if (filters?.serviceType) {
        where.serviceType = filters.serviceType;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.year || filters?.month) {
        where.taxPeriod = {};
        if (filters.year) where.taxPeriod.year = filters.year;
        if (filters.month) where.taxPeriod.month = filters.month;
      }

      const certificates = await this.prisma.withholdingTaxCertificate.findMany({
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
        orderBy: { issueDate: 'desc' },
      });

      return certificates;
    } catch (error) {
      this.logger.error(`Failed to get withholding certificates: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit certificate to ZRA
   */
  async submitToZRA(
    organizationId: string,
    certificateId: string,
  ): Promise<WithholdingTaxCertificate> {
    try {
      const certificate = await this.prisma.withholdingTaxCertificate.findFirst({
        where: { id: certificateId, organizationId },
      });

      if (!certificate) {
        throw new NotFoundException('Withholding tax certificate not found');
      }

      if (certificate.status !== WithholdingCertificateStatus.ISSUED) {
        throw new BadRequestException('Only issued certificates can be submitted');
      }

      // TODO: Implement actual ZRA submission
      // For now, simulate submission
      const zraReference = `ZRA-WHT-${Date.now()}`;

      const updated = await this.prisma.withholdingTaxCertificate.update({
        where: { id: certificateId },
        data: {
          status: WithholdingCertificateStatus.SUBMITTED,
          submittedToZra: true,
          zraSubmissionDate: new Date(),
          zraReference,
        },
      });

      this.logger.log(`Certificate submitted to ZRA: ${certificateId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to submit certificate to ZRA: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk submit certificates to ZRA
   */
  async bulkSubmitToZRA(
    organizationId: string,
    certificateIds: string[],
  ): Promise<{ submitted: number; failed: number; errors: string[] }> {
    try {
      let submitted = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const certificateId of certificateIds) {
        try {
          await this.submitToZRA(organizationId, certificateId);
          submitted++;
        } catch (error) {
          failed++;
          errors.push(`Certificate ${certificateId}: ${error.message}`);
        }
      }

      this.logger.log(`Bulk submission completed: ${submitted} submitted, ${failed} failed`);
      return { submitted, failed, errors };
    } catch (error) {
      this.logger.error(`Failed to bulk submit certificates: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get withholding tax summary
   */
  async getWithholdingSummary(
    organizationId: string,
    year?: number,
    month?: number,
  ): Promise<WithholdingTaxSummary> {
    try {
      const certificates = await this.getCertificates(organizationId, { year, month });

      const summary: WithholdingTaxSummary = {
        totalCertificates: certificates.length,
        totalGrossAmount: 0,
        totalTaxWithheld: 0,
        totalNetAmount: 0,
        byStatus: {} as any,
        byServiceType: {} as any,
        submissionRate: 0,
      };

      // Initialize status counters
      Object.values(WithholdingCertificateStatus).forEach(status => {
        summary.byStatus[status] = {
          count: 0,
          grossAmount: 0,
          taxWithheld: 0,
        };
      });

      let submittedCount = 0;

      certificates.forEach(cert => {
        const grossAmount = cert.grossAmount.toNumber();
        const taxWithheld = cert.taxWithheld.toNumber();

        summary.totalGrossAmount += grossAmount;
        summary.totalTaxWithheld += taxWithheld;
        summary.totalNetAmount += cert.netAmount.toNumber();

        // Count by status
        summary.byStatus[cert.status].count++;
        summary.byStatus[cert.status].grossAmount += grossAmount;
        summary.byStatus[cert.status].taxWithheld += taxWithheld;

        // Count by service type
        if (!summary.byServiceType[cert.serviceType]) {
          summary.byServiceType[cert.serviceType] = {
            count: 0,
            grossAmount: 0,
            taxWithheld: 0,
          };
        }
        summary.byServiceType[cert.serviceType].count++;
        summary.byServiceType[cert.serviceType].grossAmount += grossAmount;
        summary.byServiceType[cert.serviceType].taxWithheld += taxWithheld;

        // Count submitted certificates
        if (cert.submittedToZra) {
          submittedCount++;
        }
      });

      summary.submissionRate = certificates.length > 0 ? 
        Math.round((submittedCount / certificates.length) * 100) : 100;

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get withholding summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate monthly withholding tax return
   */
  async generateMonthlyReturn(
    organizationId: string,
    year: number,
    month: number,
  ): Promise<any> {
    try {
      this.logger.log(`Generating monthly WHT return for ${year}-${month}`);

      const certificates = await this.getCertificates(organizationId, { year, month });
      const summary = await this.getWithholdingSummary(organizationId, year, month);

      const returnData = {
        organizationId,
        period: { year, month },
        summary,
        certificates: certificates.map(cert => ({
          certificateNumber: cert.certificateNumber,
          supplierName: cert.supplierName,
          supplierTin: cert.supplierTin,
          serviceType: cert.serviceType,
          grossAmount: cert.grossAmount.toNumber(),
          taxWithheld: cert.taxWithheld.toNumber(),
          paymentDate: cert.paymentDate,
        })),
        totalTaxWithheld: summary.totalTaxWithheld,
        generatedAt: new Date(),
      };

      this.logger.log('Monthly WHT return generated successfully');
      return returnData;
    } catch (error) {
      this.logger.error(`Failed to generate monthly return: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get default withholding rate for service type
   */
  private getDefaultRate(serviceType: string): number {
    return this.WITHHOLDING_RATES[serviceType] || this.WITHHOLDING_RATES.OTHER;
  }

  /**
   * Generate unique certificate number
   */
  private async generateCertificateNumber(organizationId: string, taxPeriod: any): Promise<string> {
    const year = taxPeriod.year;
    const month = taxPeriod.month || 1;
    
    // Count existing certificates for this period
    const count = await this.prisma.withholdingTaxCertificate.count({
      where: {
        organizationId,
        taxPeriodId: taxPeriod.id,
      },
    });

    // Format: WHT-YYYY-MM-NNNN
    return `WHT-${year}-${month.toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
