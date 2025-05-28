import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryCacheService } from './inventory-cache.service';

export interface ZraItemClassification {
  itemCode: string;
  description: string;
  vatRate: number;
  category: string;
  isRestricted: boolean;
  requiresLicense: boolean;
}

export interface ZraComplianceCheck {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
  itemClassification?: ZraItemClassification;
}

export interface ZraInventoryReport {
  reportId: string;
  organizationId: string;
  reportType: 'STOCK_DECLARATION' | 'INVENTORY_VALUATION' | 'MOVEMENT_SUMMARY';
  reportData: any;
  submissionStatus: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  submissionDate?: Date;
  zraReference?: string;
}

/**
 * ZRA Integration Service
 * Handles Zambian Revenue Authority compliance for inventory management
 * Ensures proper tax classification, reporting, and regulatory compliance
 */
@Injectable()
export class ZraIntegrationService {
  private readonly logger = new Logger(ZraIntegrationService.name);
  private readonly zraApiUrl: string;
  private readonly zraApiKey: string;
  private readonly isZraEnabled: boolean;

  // Standard Zambian VAT rates
  private readonly ZAMBIAN_VAT_RATES = {
    STANDARD: 16,
    ZERO_RATED: 0,
    EXEMPT: 0,
  };

  // Common ZRA item categories
  private readonly ZRA_CATEGORIES = {
    FOOD_BEVERAGES: 'FB',
    CLOTHING_TEXTILES: 'CT',
    ELECTRONICS: 'EL',
    FURNITURE: 'FU',
    MEDICAL_SUPPLIES: 'MS',
    AUTOMOTIVE: 'AU',
    CONSTRUCTION: 'CO',
    AGRICULTURE: 'AG',
    SERVICES: 'SV',
    OTHER: 'OT',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: InventoryCacheService,
  ) {
    this.zraApiUrl = this.configService.get<string>('zra.apiUrl') || '';
    this.zraApiKey = this.configService.get<string>('zra.apiKey') || '';
    this.isZraEnabled = this.configService.get<boolean>('zra.enabled') || false;
  }

  /**
   * Validate ZRA item code format
   */
  validateZraItemCode(itemCode: string): boolean {
    if (!itemCode) return false;
    
    // ZRA item codes typically follow pattern: CATEGORY-SUBCATEGORY-SEQUENCE
    const zraPattern = /^[A-Z]{2,3}-[A-Z0-9]{2,4}-[0-9]{3,6}$/;
    return zraPattern.test(itemCode);
  }

  /**
   * Get item classification from ZRA
   */
  async getItemClassification(itemCode: string): Promise<ZraItemClassification | null> {
    try {
      if (!this.isZraEnabled || !itemCode) {
        return null;
      }

      const cacheKey = `zra_classification_${itemCode}`;
      
      // Try cache first
      const cached = await this.cacheService.get<ZraItemClassification>(cacheKey);
      if (cached) {
        return cached;
      }

      // In a real implementation, this would call the ZRA API
      // For now, we'll return mock data based on item code pattern
      const classification = this.getMockClassification(itemCode);
      
      if (classification) {
        // Cache for 24 hours
        await this.cacheService.set(cacheKey, classification, 86400);
      }

      return classification;
    } catch (error) {
      this.logger.error(`Failed to get ZRA item classification: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Check product compliance with ZRA regulations
   */
  async checkProductCompliance(productData: any): Promise<ZraComplianceCheck> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let itemClassification: ZraItemClassification | null = null;

      // Check ZRA item code
      if (!productData.zraItemCode) {
        issues.push('ZRA item code is required for tax compliance');
        recommendations.push('Assign appropriate ZRA item classification code');
      } else if (!this.validateZraItemCode(productData.zraItemCode)) {
        issues.push('ZRA item code format is invalid');
        recommendations.push('Use valid ZRA item code format (e.g., FB-001-123456)');
      } else {
        itemClassification = await this.getItemClassification(productData.zraItemCode);
        
        if (itemClassification) {
          // Check VAT rate consistency
          if (productData.vatRate !== itemClassification.vatRate) {
            issues.push(`VAT rate mismatch: Product has ${productData.vatRate}%, ZRA classification requires ${itemClassification.vatRate}%`);
            recommendations.push(`Update VAT rate to ${itemClassification.vatRate}% as per ZRA classification`);
          }

          // Check for restricted items
          if (itemClassification.isRestricted) {
            recommendations.push('This item is restricted - ensure proper licensing and documentation');
          }

          if (itemClassification.requiresLicense) {
            recommendations.push('This item requires special licensing - verify compliance before sale');
          }
        }
      }

      // Check VAT rate validity
      if (!this.isValidZambianVatRate(productData.vatRate)) {
        issues.push(`Invalid VAT rate: ${productData.vatRate}% is not a standard Zambian VAT rate`);
        recommendations.push('Use standard Zambian VAT rates: 0% (zero-rated/exempt) or 16% (standard)');
      }

      // Check taxable status consistency
      if (productData.isTaxable && productData.vatRate === 0) {
        issues.push('Product marked as taxable but has 0% VAT rate');
        recommendations.push('Either mark as non-taxable or apply appropriate VAT rate');
      }

      return {
        isCompliant: issues.length === 0,
        issues,
        recommendations,
        itemClassification,
      };
    } catch (error) {
      this.logger.error(`Failed to check product compliance: ${error.message}`, error);
      return {
        isCompliant: false,
        issues: ['Compliance check failed'],
        recommendations: ['Contact system administrator'],
      };
    }
  }

  /**
   * Generate ZRA inventory report
   */
  async generateInventoryReport(
    organizationId: string,
    reportType: 'STOCK_DECLARATION' | 'INVENTORY_VALUATION' | 'MOVEMENT_SUMMARY',
    startDate: Date,
    endDate: Date,
  ): Promise<ZraInventoryReport> {
    try {
      const reportId = this.generateReportId();
      
      // In a real implementation, this would gather actual inventory data
      const reportData = await this.compileInventoryData(organizationId, reportType, startDate, endDate);

      const report: ZraInventoryReport = {
        reportId,
        organizationId,
        reportType,
        reportData,
        submissionStatus: 'PENDING',
      };

      // Cache the report
      const cacheKey = `zra_report_${reportId}`;
      await this.cacheService.set(cacheKey, report, 3600); // 1 hour

      this.logger.log(`Generated ZRA inventory report: ${reportId} for organization: ${organizationId}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate ZRA inventory report: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit report to ZRA
   */
  async submitReportToZra(reportId: string): Promise<boolean> {
    try {
      if (!this.isZraEnabled) {
        this.logger.warn('ZRA integration is disabled - report submission skipped');
        return false;
      }

      const cacheKey = `zra_report_${reportId}`;
      const report = await this.cacheService.get<ZraInventoryReport>(cacheKey);
      
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // In a real implementation, this would submit to ZRA API
      const submissionResult = await this.mockZraSubmission(report);

      // Update report status
      report.submissionStatus = submissionResult.success ? 'SUBMITTED' : 'REJECTED';
      report.submissionDate = new Date();
      report.zraReference = submissionResult.reference;

      // Update cache
      await this.cacheService.set(cacheKey, report, 3600);

      this.logger.log(`ZRA report submission ${submissionResult.success ? 'successful' : 'failed'}: ${reportId}`);
      return submissionResult.success;
    } catch (error) {
      this.logger.error(`Failed to submit report to ZRA: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Get ZRA compliance summary for organization
   */
  async getComplianceSummary(organizationId: string): Promise<any> {
    try {
      const cacheKey = `zra_compliance_${organizationId}`;
      
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          // In a real implementation, this would analyze actual inventory data
          return {
            totalProducts: 0,
            compliantProducts: 0,
            nonCompliantProducts: 0,
            missingZraCode: 0,
            vatRateIssues: 0,
            restrictedItems: 0,
            compliancePercentage: 0,
            lastReportDate: null,
            nextReportDue: null,
          };
        },
        'INVENTORY_REPORTS',
      );
    } catch (error) {
      this.logger.error(`Failed to get compliance summary: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Suggest ZRA item code based on product details
   */
  suggestZraItemCode(productData: any): string[] {
    const suggestions: string[] = [];

    // Simple categorization based on product name and category
    const category = productData.category?.toLowerCase() || '';
    const name = productData.name?.toLowerCase() || '';

    if (category.includes('food') || name.includes('food')) {
      suggestions.push('FB-001-000001', 'FB-002-000001');
    } else if (category.includes('clothing') || name.includes('clothing')) {
      suggestions.push('CT-001-000001', 'CT-002-000001');
    } else if (category.includes('electronics') || name.includes('electronic')) {
      suggestions.push('EL-001-000001', 'EL-002-000001');
    } else if (category.includes('furniture') || name.includes('furniture')) {
      suggestions.push('FU-001-000001', 'FU-002-000001');
    } else {
      suggestions.push('OT-001-000001', 'OT-002-000001');
    }

    return suggestions;
  }

  /**
   * Check if VAT rate is valid for Zambia
   */
  private isValidZambianVatRate(vatRate: number): boolean {
    return Object.values(this.ZAMBIAN_VAT_RATES).includes(vatRate);
  }

  /**
   * Get mock classification (replace with real ZRA API call)
   */
  private getMockClassification(itemCode: string): ZraItemClassification | null {
    const category = itemCode.substring(0, 2);
    
    const classifications: Record<string, Partial<ZraItemClassification>> = {
      'FB': { description: 'Food and Beverages', vatRate: 0, category: 'Food', isRestricted: false },
      'CT': { description: 'Clothing and Textiles', vatRate: 16, category: 'Clothing', isRestricted: false },
      'EL': { description: 'Electronics', vatRate: 16, category: 'Electronics', isRestricted: false },
      'FU': { description: 'Furniture', vatRate: 16, category: 'Furniture', isRestricted: false },
      'MS': { description: 'Medical Supplies', vatRate: 0, category: 'Medical', isRestricted: true },
      'AU': { description: 'Automotive', vatRate: 16, category: 'Automotive', isRestricted: false },
      'CO': { description: 'Construction Materials', vatRate: 16, category: 'Construction', isRestricted: false },
      'AG': { description: 'Agricultural Products', vatRate: 0, category: 'Agriculture', isRestricted: false },
    };

    const baseClassification = classifications[category];
    if (!baseClassification) return null;

    return {
      itemCode,
      description: baseClassification.description || 'Unknown',
      vatRate: baseClassification.vatRate || 16,
      category: baseClassification.category || 'Other',
      isRestricted: baseClassification.isRestricted || false,
      requiresLicense: baseClassification.isRestricted || false,
    };
  }

  /**
   * Compile inventory data for reporting
   */
  private async compileInventoryData(
    organizationId: string,
    reportType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // In a real implementation, this would query actual inventory data
    return {
      organizationId,
      reportType,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalItems: 0,
        totalValue: 0,
        vatAmount: 0,
      },
      items: [],
    };
  }

  /**
   * Mock ZRA submission (replace with real API call)
   */
  private async mockZraSubmission(report: ZraInventoryReport): Promise<{ success: boolean; reference?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success/failure
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      success,
      reference: success ? `ZRA-${Date.now()}` : undefined,
    };
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ZRA-RPT-${timestamp}-${random}`;
  }
}
