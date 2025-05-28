import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxCalculationService } from '../../tax-management/services/tax-calculation.service';
import { WithholdingTaxService } from '../../tax-management/services/withholding-tax.service';
import { TaxPeriodService } from '../../tax-management/services/tax-period.service';
import { PaymentMethod, TaxType, Prisma } from '@prisma/client';

export interface PaymentTaxCalculation {
  grossAmount: number;
  withholdingTaxAmount: number;
  netPayableAmount: number;
  withholdingRate: number;
  serviceType: string;
  certificateRequired: boolean;
  exemptionApplied: boolean;
  taxPeriodId?: string;
}

export interface SupplierPaymentRequest {
  organizationId: string;
  supplierId?: string;
  supplierName: string;
  supplierTin?: string;
  grossAmount: number;
  serviceType: string;
  serviceDescription?: string;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  invoiceId?: string;
  reference?: string;
}

export interface PaymentWithTaxResult {
  paymentId: string;
  grossAmount: number;
  withholdingTaxAmount: number;
  netPayableAmount: number;
  certificateId?: string;
  certificateNumber?: string;
  taxPeriodId?: string;
}

@Injectable()
export class PaymentTaxIntegrationService {
  private readonly logger = new Logger(PaymentTaxIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculationService: TaxCalculationService,
    private readonly withholdingTaxService: WithholdingTaxService,
    private readonly taxPeriodService: TaxPeriodService,
  ) {}

  /**
   * Calculate withholding tax for supplier payment
   */
  async calculatePaymentTax(
    organizationId: string,
    grossAmount: number,
    serviceType: string,
    supplierTin?: string,
    paymentDate: Date = new Date(),
  ): Promise<PaymentTaxCalculation> {
    try {
      this.logger.log(`Calculating payment tax for amount: ${grossAmount}, service: ${serviceType}`);

      // Check if withholding tax applies
      const withholdingRequired = await this.isWithholdingTaxRequired(
        organizationId,
        grossAmount,
        serviceType,
        supplierTin,
      );

      if (!withholdingRequired.required) {
        return {
          grossAmount,
          withholdingTaxAmount: 0,
          netPayableAmount: grossAmount,
          withholdingRate: 0,
          serviceType,
          certificateRequired: false,
          exemptionApplied: withholdingRequired.exemptionApplied,
        };
      }

      // Calculate withholding tax
      const taxCalculation = await this.taxCalculationService.calculateTax({
        organizationId,
        taxType: TaxType.WITHHOLDING_TAX,
        amount: grossAmount,
        effectiveDate: paymentDate,
        metadata: { serviceType },
      });

      // Get current tax period for withholding tax
      const taxPeriod = await this.taxPeriodService.getCurrentPeriod(
        organizationId,
        TaxType.WITHHOLDING_TAX,
      );

      return {
        grossAmount,
        withholdingTaxAmount: taxCalculation.taxAmount,
        netPayableAmount: grossAmount - taxCalculation.taxAmount,
        withholdingRate: taxCalculation.effectiveRate,
        serviceType,
        certificateRequired: true,
        exemptionApplied: false,
        taxPeriodId: taxPeriod?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate payment tax: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process supplier payment with automatic withholding tax
   */
  async processSupplierPayment(request: SupplierPaymentRequest): Promise<PaymentWithTaxResult> {
    try {
      this.logger.log(`Processing supplier payment for ${request.supplierName}: ${request.grossAmount}`);

      return await this.prisma.$transaction(async (tx) => {
        // Calculate withholding tax
        const taxCalculation = await this.calculatePaymentTax(
          request.organizationId,
          request.grossAmount,
          request.serviceType,
          request.supplierTin,
          request.paymentDate,
        );

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            organizationId: request.organizationId,
            customerId: request.supplierId,
            amount: new Prisma.Decimal(taxCalculation.netPayableAmount),
            grossAmount: new Prisma.Decimal(request.grossAmount),
            withholdingTaxAmount: new Prisma.Decimal(taxCalculation.withholdingTaxAmount),
            paymentMethod: request.paymentMethod,
            paymentDate: request.paymentDate,
            reference: request.reference,
            invoiceId: request.invoiceId,
            status: 'COMPLETED',
            notes: `Payment to ${request.supplierName}${request.serviceDescription ? ` - ${request.serviceDescription}` : ''}`,
          },
        });

        let certificateId: string | undefined;
        let certificateNumber: string | undefined;

        // Create withholding tax certificate if required
        if (taxCalculation.certificateRequired && taxCalculation.taxPeriodId) {
          const certificate = await this.withholdingTaxService.createCertificate({
            organizationId: request.organizationId,
            taxPeriodId: taxCalculation.taxPeriodId,
            supplierName: request.supplierName,
            supplierTin: request.supplierTin,
            serviceType: request.serviceType,
            serviceDescription: request.serviceDescription,
            grossAmount: request.grossAmount,
            withholdingRate: taxCalculation.withholdingRate,
            paymentDate: request.paymentDate,
          });

          certificateId = certificate.id;
          certificateNumber = certificate.certificateNumber;

          // Link certificate to payment
          await tx.payment.update({
            where: { id: payment.id },
            data: { withholdingCertificateId: certificateId },
          });
        }

        this.logger.log(`Supplier payment processed: ${payment.id}, certificate: ${certificateNumber || 'N/A'}`);

        return {
          paymentId: payment.id,
          grossAmount: request.grossAmount,
          withholdingTaxAmount: taxCalculation.withholdingTaxAmount,
          netPayableAmount: taxCalculation.netPayableAmount,
          certificateId,
          certificateNumber,
          taxPeriodId: taxCalculation.taxPeriodId,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to process supplier payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment tax summary for organization
   */
  async getPaymentTaxSummary(
    organizationId: string,
    year?: number,
    month?: number,
  ): Promise<{
    totalPayments: number;
    totalGrossAmount: number;
    totalWithholdingTax: number;
    totalNetPayments: number;
    certificatesGenerated: number;
    averageWithholdingRate: number;
  }> {
    try {
      const whereClause: any = { organizationId };

      if (year || month) {
        whereClause.paymentDate = {};
        if (year) {
          whereClause.paymentDate.gte = new Date(year, month ? month - 1 : 0, 1);
          whereClause.paymentDate.lt = new Date(year, month ? month : 12, month ? 1 : 1);
        }
      }

      const payments = await this.prisma.payment.findMany({
        where: {
          ...whereClause,
          withholdingTaxAmount: { gt: 0 },
        },
        select: {
          grossAmount: true,
          withholdingTaxAmount: true,
          amount: true,
          withholdingCertificateId: true,
        },
      });

      const totalPayments = payments.length;
      const totalGrossAmount = payments.reduce((sum, p) => sum + (p.grossAmount?.toNumber() || 0), 0);
      const totalWithholdingTax = payments.reduce((sum, p) => sum + (p.withholdingTaxAmount?.toNumber() || 0), 0);
      const totalNetPayments = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const certificatesGenerated = payments.filter(p => p.withholdingCertificateId).length;
      const averageWithholdingRate = totalGrossAmount > 0 ? (totalWithholdingTax / totalGrossAmount) * 100 : 0;

      return {
        totalPayments,
        totalGrossAmount,
        totalWithholdingTax,
        totalNetPayments,
        certificatesGenerated,
        averageWithholdingRate,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment tax summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if withholding tax is required for payment
   */
  private async isWithholdingTaxRequired(
    organizationId: string,
    amount: number,
    serviceType: string,
    supplierTin?: string,
  ): Promise<{ required: boolean; exemptionApplied: boolean; reason?: string }> {
    // Check minimum threshold (typically K200 for most services)
    const minimumThreshold = this.getMinimumThreshold(serviceType);
    if (amount < minimumThreshold) {
      return {
        required: false,
        exemptionApplied: true,
        reason: `Amount below minimum threshold of K${minimumThreshold}`,
      };
    }

    // Check if supplier is exempt (e.g., government entities, certain NGOs)
    if (supplierTin) {
      const isExempt = await this.checkSupplierExemption(supplierTin);
      if (isExempt) {
        return {
          required: false,
          exemptionApplied: true,
          reason: 'Supplier is exempt from withholding tax',
        };
      }
    }

    // Check service type exemptions
    const exemptServices = ['GOVERNMENT_SERVICES', 'EXEMPT_SERVICES'];
    if (exemptServices.includes(serviceType)) {
      return {
        required: false,
        exemptionApplied: true,
        reason: 'Service type is exempt from withholding tax',
      };
    }

    return { required: true, exemptionApplied: false };
  }

  /**
   * Get minimum threshold for withholding tax by service type
   */
  private getMinimumThreshold(serviceType: string): number {
    const thresholds: Record<string, number> = {
      PROFESSIONAL_SERVICES: 200,
      RENT: 500,
      INTEREST: 0, // No minimum threshold
      DIVIDENDS: 0, // No minimum threshold
      CONSULTANCY: 200,
      OTHER: 200,
    };

    return thresholds[serviceType] || 200;
  }

  /**
   * Check if supplier is exempt from withholding tax
   */
  private async checkSupplierExemption(supplierTin: string): Promise<boolean> {
    // TODO: Implement actual exemption checking logic
    // This could involve checking against ZRA exemption lists or organization-specific exemptions
    
    // For now, check if TIN indicates government entity (typically starts with specific patterns)
    const governmentPatterns = ['1000', '2000', '9000']; // Example patterns
    return governmentPatterns.some(pattern => supplierTin.startsWith(pattern));
  }
}
