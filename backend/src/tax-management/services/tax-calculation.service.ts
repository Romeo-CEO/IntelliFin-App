import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxType } from '@prisma/client';
import {
  VatCalculator,
  ZambianVatRates,
} from '../../invoices/utils/vat-calculator';

export interface TaxCalculationRequest {
  organizationId: string;
  taxType: TaxType;
  amount: number;
  effectiveDate?: Date;
  isInclusive?: boolean;
  metadata?: Record<string, any>;
}

export interface TaxCalculationResult {
  taxType: TaxType;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  isInclusive: boolean;
  effectiveDate: Date;
  calculation: {
    baseAmount: number;
    applicableRate: number;
    exemptions: number;
    adjustments: number;
    finalTaxAmount: number;
  };
}

export interface WithholdingTaxCalculation {
  grossAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  netPayableAmount: number;
  certificateRequired: boolean;
  exemptionApplied: boolean;
}

export interface IncomeTaxCalculation {
  taxableIncome: number;
  taxBrackets: Array<{
    min: number;
    max: number;
    rate: number;
    taxOnBracket: number;
  }>;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  // Zambian tax rates and thresholds (2024)
  private readonly ZAMBIAN_TAX_RATES = {
    VAT: {
      STANDARD: 0.16,
      ZERO_RATED: 0.0,
      EXEMPT: -1,
    },
    WITHHOLDING_TAX: {
      STANDARD: 0.15,
      PROFESSIONAL_SERVICES: 0.15,
      RENT: 0.1,
      INTEREST: 0.15,
      DIVIDENDS: 0.15,
      ROYALTIES: 0.15,
    },
    INCOME_TAX: {
      CORPORATE: 0.35,
      BRACKETS: [
        { min: 0, max: 4800, rate: 0.0 },
        { min: 4800, max: 9600, rate: 0.25 },
        { min: 9600, max: 19200, rate: 0.3 },
        { min: 19200, max: Infinity, rate: 0.375 },
      ],
    },
    PAYE: {
      BRACKETS: [
        { min: 0, max: 4800, rate: 0.0 },
        { min: 4800, max: 9600, rate: 0.25 },
        { min: 9600, max: 19200, rate: 0.3 },
        { min: 19200, max: Infinity, rate: 0.375 },
      ],
    },
    TURNOVER_TAX: {
      RATE: 0.04, // 4% for small businesses
      THRESHOLD: 800000, // K800,000 annual turnover threshold
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate tax for any tax type
   */
  async calculateTax(
    request: TaxCalculationRequest
  ): Promise<TaxCalculationResult> {
    try {
      this.logger.log(
        `Calculating ${request.taxType} tax for organization: ${request.organizationId}`
      );

      const effectiveDate = request.effectiveDate || new Date();
      const taxRate = await this.getTaxRate(
        request.organizationId,
        request.taxType,
        effectiveDate
      );

      let calculation: TaxCalculationResult;

      switch (request.taxType) {
        case TaxType.VAT:
          calculation = this.calculateVAT(
            request.amount,
            taxRate,
            request.isInclusive || false
          );
          break;
        case TaxType.WITHHOLDING_TAX:
          calculation = this.calculateWithholdingTax(request.amount, taxRate);
          break;
        case TaxType.INCOME_TAX:
          calculation = this.calculateIncomeTax(request.amount, taxRate);
          break;
        case TaxType.PAYE:
          calculation = this.calculatePAYE(request.amount);
          break;
        case TaxType.TURNOVER_TAX:
          calculation = this.calculateTurnoverTax(request.amount, taxRate);
          break;
        default:
          calculation = this.calculateGenericTax(
            request.amount,
            taxRate,
            request.isInclusive || false
          );
      }

      calculation.taxType = request.taxType;
      calculation.effectiveDate = effectiveDate;

      this.logger.log(
        `Tax calculation completed: ${calculation.taxAmount} ${request.taxType}`
      );
      return calculation;
    } catch (error) {
      this.logger.error(
        `Failed to calculate tax: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Calculate VAT using existing VAT calculator
   */
  private calculateVAT(
    amount: number,
    rate: number,
    isInclusive: boolean
  ): TaxCalculationResult {
    const vatResult = VatCalculator.calculateVat(
      amount,
      rate * 100,
      isInclusive
    );

    return {
      taxType: TaxType.VAT,
      grossAmount: isInclusive ? amount : vatResult.total,
      taxAmount: vatResult.vatAmount,
      netAmount: vatResult.subtotal,
      taxRate: rate,
      isInclusive,
      effectiveDate: new Date(),
      calculation: {
        baseAmount: vatResult.subtotal,
        applicableRate: rate,
        exemptions: 0,
        adjustments: 0,
        finalTaxAmount: vatResult.vatAmount,
      },
    };
  }

  /**
   * Calculate withholding tax
   */
  private calculateWithholdingTax(
    grossAmount: number,
    rate: number
  ): TaxCalculationResult {
    const taxAmount = grossAmount * rate;
    const netAmount = grossAmount - taxAmount;

    return {
      taxType: TaxType.WITHHOLDING_TAX,
      grossAmount,
      taxAmount,
      netAmount,
      taxRate: rate,
      isInclusive: true,
      effectiveDate: new Date(),
      calculation: {
        baseAmount: grossAmount,
        applicableRate: rate,
        exemptions: 0,
        adjustments: 0,
        finalTaxAmount: taxAmount,
      },
    };
  }

  /**
   * Calculate income tax using Zambian brackets
   */
  private calculateIncomeTax(
    taxableIncome: number,
    rate?: number
  ): TaxCalculationResult {
    const brackets = this.ZAMBIAN_TAX_RATES.INCOME_TAX.BRACKETS;
    let totalTax = 0;
    let remainingIncome = taxableIncome;

    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;

      const taxableAtBracket = Math.min(
        remainingIncome,
        bracket.max - bracket.min
      );
      const taxAtBracket = taxableAtBracket * bracket.rate;
      totalTax += taxAtBracket;
      remainingIncome -= taxableAtBracket;
    }

    return {
      taxType: TaxType.INCOME_TAX,
      grossAmount: taxableIncome,
      taxAmount: totalTax,
      netAmount: taxableIncome - totalTax,
      taxRate: taxableIncome > 0 ? totalTax / taxableIncome : 0,
      isInclusive: false,
      effectiveDate: new Date(),
      calculation: {
        baseAmount: taxableIncome,
        applicableRate:
          rate || (taxableIncome > 0 ? totalTax / taxableIncome : 0),
        exemptions: 0,
        adjustments: 0,
        finalTaxAmount: totalTax,
      },
    };
  }

  /**
   * Calculate PAYE (same as income tax for individuals)
   */
  private calculatePAYE(grossSalary: number): TaxCalculationResult {
    return this.calculateIncomeTax(grossSalary);
  }

  /**
   * Calculate turnover tax for small businesses
   */
  private calculateTurnoverTax(
    turnover: number,
    rate: number
  ): TaxCalculationResult {
    const taxAmount = turnover * rate;

    return {
      taxType: TaxType.TURNOVER_TAX,
      grossAmount: turnover,
      taxAmount,
      netAmount: turnover - taxAmount,
      taxRate: rate,
      isInclusive: false,
      effectiveDate: new Date(),
      calculation: {
        baseAmount: turnover,
        applicableRate: rate,
        exemptions: 0,
        adjustments: 0,
        finalTaxAmount: taxAmount,
      },
    };
  }

  /**
   * Generic tax calculation for other tax types
   */
  private calculateGenericTax(
    amount: number,
    rate: number,
    isInclusive: boolean
  ): TaxCalculationResult {
    let taxAmount: number;
    let netAmount: number;
    let grossAmount: number;

    if (isInclusive) {
      grossAmount = amount;
      taxAmount = amount * (rate / (1 + rate));
      netAmount = amount - taxAmount;
    } else {
      netAmount = amount;
      taxAmount = amount * rate;
      grossAmount = amount + taxAmount;
    }

    return {
      taxType: TaxType.VAT, // Will be overridden by caller
      grossAmount,
      taxAmount,
      netAmount,
      taxRate: rate,
      isInclusive,
      effectiveDate: new Date(),
      calculation: {
        baseAmount: netAmount,
        applicableRate: rate,
        exemptions: 0,
        adjustments: 0,
        finalTaxAmount: taxAmount,
      },
    };
  }

  /**
   * Get applicable tax rate for organization and date
   */
  private async getTaxRate(
    organizationId: string,
    taxType: TaxType,
    effectiveDate: Date
  ): Promise<number> {
    try {
      // First try to get organization-specific rate
      const customRate = await this.prisma.taxRate.findFirst({
        where: {
          organizationId,
          taxType,
          effectiveDate: { lte: effectiveDate },
          OR: [{ endDate: null }, { endDate: { gte: effectiveDate } }],
          isActive: true,
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (customRate) {
        return customRate.rate.toNumber();
      }

      // Fall back to default Zambian rates
      return this.getDefaultTaxRate(taxType);
    } catch (error) {
      this.logger.warn(
        `Failed to get tax rate from database, using default: ${error.message}`
      );
      return this.getDefaultTaxRate(taxType);
    }
  }

  /**
   * Get default Zambian tax rates
   */
  private getDefaultTaxRate(taxType: TaxType): number {
    switch (taxType) {
      case TaxType.VAT:
        return this.ZAMBIAN_TAX_RATES.VAT.STANDARD;
      case TaxType.WITHHOLDING_TAX:
        return this.ZAMBIAN_TAX_RATES.WITHHOLDING_TAX.STANDARD;
      case TaxType.INCOME_TAX:
        return this.ZAMBIAN_TAX_RATES.INCOME_TAX.CORPORATE;
      case TaxType.TURNOVER_TAX:
        return this.ZAMBIAN_TAX_RATES.TURNOVER_TAX.RATE;
      default:
        return 0;
    }
  }
}
