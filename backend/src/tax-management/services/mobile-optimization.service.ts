import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxCalculationService } from './tax-calculation.service';
import { TaxType } from '@prisma/client';

export interface OfflineTaxData {
  taxRates: Array<{
    taxType: string;
    rate: number;
    effectiveDate: string;
    endDate?: string;
  }>;
  taxPeriods: Array<{
    id: string;
    taxType: string;
    periodStart: string;
    periodEnd: string;
    filingDeadline: string;
    paymentDeadline: string;
  }>;
  serviceTypes: Array<{
    value: string;
    label: string;
    rate: number;
    minimumThreshold: number;
  }>;
  lastSyncAt: string;
  version: string;
}

export interface OfflineCalculationRequest {
  taxType: string;
  amount: number;
  serviceType?: string;
  calculationDate: string;
}

export interface OfflineCalculationResult {
  taxAmount: number;
  effectiveRate: number;
  netAmount: number;
  calculationBreakdown: {
    grossAmount: number;
    taxableAmount: number;
    exemptAmount: number;
    taxRate: number;
  };
  isOfflineCalculation: boolean;
}

export interface MobileDataSync {
  organizationId: string;
  lastSyncAt: Date;
  pendingUploads: number;
  pendingDownloads: number;
  syncStatus: 'IDLE' | 'SYNCING' | 'ERROR' | 'COMPLETED';
  errorMessage?: string;
}

export interface CompressedTaxReport {
  reportType: string;
  period: string;
  data: any;
  compressedSize: number;
  originalSize: number;
  compressionRatio: number;
}

@Injectable()
export class MobileOptimizationService {
  private readonly logger = new Logger(MobileOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculationService: TaxCalculationService,
  ) {}

  /**
   * Get offline tax data package for mobile app
   */
  async getOfflineTaxDataPackage(organizationId: string): Promise<OfflineTaxData> {
    try {
      this.logger.log(`Generating offline tax data package for organization: ${organizationId}`);

      // Get current tax rates
      const taxRates = await this.prisma.taxRate.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: { effectiveDate: 'desc' },
      });

      // Get current and upcoming tax periods
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6); // Next 6 months

      const taxPeriods = await this.prisma.taxPeriod.findMany({
        where: {
          organizationId,
          periodEnd: { gte: currentDate },
          periodStart: { lte: futureDate },
        },
        orderBy: { periodStart: 'asc' },
      });

      // Service types with rates
      const serviceTypes = [
        { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services', rate: 15, minimumThreshold: 200 },
        { value: 'RENT', label: 'Rent', rate: 10, minimumThreshold: 500 },
        { value: 'INTEREST', label: 'Interest', rate: 15, minimumThreshold: 0 },
        { value: 'DIVIDENDS', label: 'Dividends', rate: 15, minimumThreshold: 0 },
        { value: 'CONSULTANCY', label: 'Consultancy', rate: 15, minimumThreshold: 200 },
        { value: 'OTHER', label: 'Other Services', rate: 15, minimumThreshold: 200 },
      ];

      const offlineData: OfflineTaxData = {
        taxRates: taxRates.map(rate => ({
          taxType: rate.taxType,
          rate: rate.rate.toNumber(),
          effectiveDate: rate.effectiveDate.toISOString(),
          endDate: rate.endDate?.toISOString(),
        })),
        taxPeriods: taxPeriods.map(period => ({
          id: period.id,
          taxType: period.taxType,
          periodStart: period.periodStart.toISOString(),
          periodEnd: period.periodEnd.toISOString(),
          filingDeadline: period.filingDeadline.toISOString(),
          paymentDeadline: period.paymentDeadline.toISOString(),
        })),
        serviceTypes,
        lastSyncAt: new Date().toISOString(),
        version: '1.0.0',
      };

      this.logger.log(`Offline tax data package generated: ${JSON.stringify(offlineData).length} bytes`);
      return offlineData;
    } catch (error) {
      this.logger.error(`Failed to generate offline tax data package: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Perform offline tax calculation
   */
  async calculateTaxOffline(
    organizationId: string,
    request: OfflineCalculationRequest,
    offlineData?: OfflineTaxData,
  ): Promise<OfflineCalculationResult> {
    try {
      this.logger.log(`Performing offline tax calculation: ${request.taxType}, amount: ${request.amount}`);

      // If no offline data provided, get current data
      if (!offlineData) {
        offlineData = await this.getOfflineTaxDataPackage(organizationId);
      }

      // Find applicable tax rate
      const calculationDate = new Date(request.calculationDate);
      let applicableRate = 0;

      if (request.taxType === 'WITHHOLDING_TAX' && request.serviceType) {
        const serviceType = offlineData.serviceTypes.find(st => st.value === request.serviceType);
        applicableRate = serviceType ? serviceType.rate : 15; // Default 15%
      } else {
        const taxRate = offlineData.taxRates.find(rate => 
          rate.taxType === request.taxType &&
          new Date(rate.effectiveDate) <= calculationDate &&
          (!rate.endDate || new Date(rate.endDate) >= calculationDate)
        );
        applicableRate = taxRate ? taxRate.rate : this.getDefaultTaxRate(request.taxType);
      }

      // Calculate tax
      const taxAmount = request.amount * (applicableRate / 100);
      const netAmount = request.amount - taxAmount;

      const result: OfflineCalculationResult = {
        taxAmount,
        effectiveRate: applicableRate,
        netAmount,
        calculationBreakdown: {
          grossAmount: request.amount,
          taxableAmount: request.amount,
          exemptAmount: 0,
          taxRate: applicableRate,
        },
        isOfflineCalculation: true,
      };

      this.logger.log(`Offline tax calculation completed: ${taxAmount} (${applicableRate}%)`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to calculate tax offline: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Compress tax report for mobile transmission
   */
  async compressTaxReport(
    reportType: string,
    period: string,
    reportData: any,
  ): Promise<CompressedTaxReport> {
    try {
      this.logger.log(`Compressing tax report: ${reportType} for ${period}`);

      const originalData = JSON.stringify(reportData);
      const originalSize = Buffer.byteLength(originalData, 'utf8');

      // Simple compression by removing unnecessary fields and formatting
      const compressedData = this.compressReportData(reportData);
      const compressedString = JSON.stringify(compressedData);
      const compressedSize = Buffer.byteLength(compressedString, 'utf8');

      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      const result: CompressedTaxReport = {
        reportType,
        period,
        data: compressedData,
        compressedSize,
        originalSize,
        compressionRatio,
      };

      this.logger.log(`Report compressed: ${originalSize} -> ${compressedSize} bytes (${compressionRatio.toFixed(1)}% reduction)`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to compress tax report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get mobile data sync status
   */
  async getMobileDataSyncStatus(organizationId: string): Promise<MobileDataSync> {
    try {
      // TODO: Implement actual sync status tracking
      // For now, return mock status
      const syncStatus: MobileDataSync = {
        organizationId,
        lastSyncAt: new Date(),
        pendingUploads: 0,
        pendingDownloads: 0,
        syncStatus: 'COMPLETED',
      };

      return syncStatus;
    } catch (error) {
      this.logger.error(`Failed to get mobile sync status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimize data for low-bandwidth transmission
   */
  async optimizeForLowBandwidth(data: any): Promise<{
    optimizedData: any;
    originalSize: number;
    optimizedSize: number;
    optimizationRatio: number;
  }> {
    try {
      const originalString = JSON.stringify(data);
      const originalSize = Buffer.byteLength(originalString, 'utf8');

      // Optimization strategies
      const optimizedData = {
        ...data,
        // Remove null/undefined values
        ...this.removeNullValues(data),
        // Shorten field names
        ...this.shortenFieldNames(data),
        // Round decimal places
        ...this.roundDecimals(data),
      };

      const optimizedString = JSON.stringify(optimizedData);
      const optimizedSize = Buffer.byteLength(optimizedString, 'utf8');
      const optimizationRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      this.logger.log(`Data optimized for low bandwidth: ${originalSize} -> ${optimizedSize} bytes (${optimizationRatio.toFixed(1)}% reduction)`);

      return {
        optimizedData,
        originalSize,
        optimizedSize,
        optimizationRatio,
      };
    } catch (error) {
      this.logger.error(`Failed to optimize data for low bandwidth: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get default tax rate for offline calculations
   */
  private getDefaultTaxRate(taxType: string): number {
    const defaultRates: Record<string, number> = {
      VAT: 16,
      INCOME_TAX: 25,
      WITHHOLDING_TAX: 15,
      PAYE: 25,
      TURNOVER_TAX: 4,
    };

    return defaultRates[taxType] || 0;
  }

  /**
   * Compress report data by removing unnecessary fields
   */
  private compressReportData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.compressReportData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const compressed: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip null/undefined values
        if (value === null || value === undefined) continue;
        
        // Skip empty arrays/objects
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'object' && Object.keys(value).length === 0) continue;
        
        // Recursively compress nested objects
        compressed[key] = this.compressReportData(value);
      }
      
      return compressed;
    }

    return data;
  }

  /**
   * Remove null/undefined values from object
   */
  private removeNullValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNullValues(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.removeNullValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Shorten field names for bandwidth optimization
   */
  private shortenFieldNames(obj: any): any {
    const fieldMap: Record<string, string> = {
      'organizationId': 'orgId',
      'customerId': 'custId',
      'invoiceId': 'invId',
      'paymentId': 'payId',
      'createdAt': 'created',
      'updatedAt': 'updated',
      'description': 'desc',
      'amount': 'amt',
      'quantity': 'qty',
    };

    if (Array.isArray(obj)) {
      return obj.map(item => this.shortenFieldNames(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const shortened: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const shortKey = fieldMap[key] || key;
        shortened[shortKey] = this.shortenFieldNames(value);
      }
      return shortened;
    }

    return obj;
  }

  /**
   * Round decimal values to reduce precision
   */
  private roundDecimals(obj: any, precision: number = 2): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.roundDecimals(item, precision));
    }

    if (typeof obj === 'object' && obj !== null) {
      const rounded: any = {};
      for (const [key, value] of Object.entries(obj)) {
        rounded[key] = this.roundDecimals(value, precision);
      }
      return rounded;
    }

    if (typeof obj === 'number' && !Number.isInteger(obj)) {
      return Math.round(obj * Math.pow(10, precision)) / Math.pow(10, precision);
    }

    return obj;
  }
}
