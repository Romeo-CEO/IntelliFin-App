import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface TINValidationResult {
  isValid: boolean;
  tinNumber: string;
  businessName?: string;
  businessType?: string;
  registrationDate?: Date;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  taxTypes?: string[];
  errors?: string[];
}

export interface CustomerTaxProfile {
  customerId: string;
  tinNumber?: string;
  tinValidated: boolean;
  tinValidatedAt?: Date;
  vatRegistered: boolean;
  vatNumber?: string;
  withholdingTaxExempt: boolean;
  exemptionReason?: string;
  exemptionValidUntil?: Date;
  taxResidency: 'RESIDENT' | 'NON_RESIDENT';
  preferredTaxTreatment?: string;
}

export interface TaxComplianceCheck {
  customerId: string;
  complianceScore: number;
  lastChecked: Date;
  issues: Array<{
    type: 'TIN_INVALID' | 'VAT_MISMATCH' | 'EXEMPTION_EXPIRED' | 'DOCUMENTATION_MISSING';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    recommendation: string;
  }>;
  nextCheckDue: Date;
}

@Injectable()
export class CustomerTaxIntegrationService {
  private readonly logger = new Logger(CustomerTaxIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate TIN with ZRA
   */
  async validateTIN(tinNumber: string): Promise<TINValidationResult> {
    try {
      this.logger.log(`Validating TIN: ${tinNumber}`);

      // Basic format validation first
      const formatValidation = this.validateTINFormat(tinNumber);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // TODO: Implement actual ZRA TIN validation API call
      // For now, simulate validation based on TIN patterns
      const mockValidation = this.simulateTINValidation(tinNumber);

      this.logger.log(`TIN validation result for ${tinNumber}: ${mockValidation.isValid}`);
      return mockValidation;
    } catch (error) {
      this.logger.error(`Failed to validate TIN ${tinNumber}: ${error.message}`, error.stack);
      return {
        isValid: false,
        tinNumber,
        errors: ['TIN validation service temporarily unavailable'],
      };
    }
  }

  /**
   * Create or update customer tax profile
   */
  async createCustomerTaxProfile(
    organizationId: string,
    customerId: string,
    profileData: Partial<CustomerTaxProfile>,
  ): Promise<CustomerTaxProfile> {
    try {
      this.logger.log(`Creating tax profile for customer: ${customerId}`);

      // Validate TIN if provided
      let tinValidated = false;
      let tinValidationResult: TINValidationResult | null = null;

      if (profileData.tinNumber) {
        tinValidationResult = await this.validateTIN(profileData.tinNumber);
        tinValidated = tinValidationResult.isValid;

        if (!tinValidated) {
          throw new BadRequestException(
            `Invalid TIN: ${tinValidationResult.errors?.join(', ') || 'TIN validation failed'}`
          );
        }
      }

      // Create or update tax profile
      const taxProfile = await this.prisma.customerTaxProfile.upsert({
        where: {
          customerId,
        },
        create: {
          customerId,
          organizationId,
          tinNumber: profileData.tinNumber,
          tinValidated,
          tinValidatedAt: tinValidated ? new Date() : null,
          vatRegistered: profileData.vatRegistered || false,
          vatNumber: profileData.vatNumber,
          withholdingTaxExempt: profileData.withholdingTaxExempt || false,
          exemptionReason: profileData.exemptionReason,
          exemptionValidUntil: profileData.exemptionValidUntil,
          taxResidency: profileData.taxResidency || 'RESIDENT',
          preferredTaxTreatment: profileData.preferredTaxTreatment,
        },
        update: {
          tinNumber: profileData.tinNumber,
          tinValidated,
          tinValidatedAt: tinValidated ? new Date() : undefined,
          vatRegistered: profileData.vatRegistered,
          vatNumber: profileData.vatNumber,
          withholdingTaxExempt: profileData.withholdingTaxExempt,
          exemptionReason: profileData.exemptionReason,
          exemptionValidUntil: profileData.exemptionValidUntil,
          taxResidency: profileData.taxResidency,
          preferredTaxTreatment: profileData.preferredTaxTreatment,
        },
      });

      this.logger.log(`Tax profile created/updated for customer: ${customerId}`);
      return taxProfile as CustomerTaxProfile;
    } catch (error) {
      this.logger.error(`Failed to create customer tax profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get customer tax profile
   */
  async getCustomerTaxProfile(customerId: string): Promise<CustomerTaxProfile | null> {
    try {
      const profile = await this.prisma.customerTaxProfile.findUnique({
        where: { customerId },
      });

      return profile as CustomerTaxProfile | null;
    } catch (error) {
      this.logger.error(`Failed to get customer tax profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check customer tax compliance
   */
  async checkCustomerTaxCompliance(customerId: string): Promise<TaxComplianceCheck> {
    try {
      this.logger.log(`Checking tax compliance for customer: ${customerId}`);

      const profile = await this.getCustomerTaxProfile(customerId);
      const issues: TaxComplianceCheck['issues'] = [];
      let complianceScore = 100;

      if (!profile) {
        issues.push({
          type: 'DOCUMENTATION_MISSING',
          severity: 'HIGH',
          description: 'Customer tax profile not found',
          recommendation: 'Create customer tax profile with TIN and tax information',
        });
        complianceScore -= 40;
      } else {
        // Check TIN validation
        if (profile.tinNumber && !profile.tinValidated) {
          issues.push({
            type: 'TIN_INVALID',
            severity: 'HIGH',
            description: 'TIN number not validated with ZRA',
            recommendation: 'Validate TIN number with ZRA system',
          });
          complianceScore -= 30;
        }

        // Check VAT registration consistency
        if (profile.vatRegistered && !profile.vatNumber) {
          issues.push({
            type: 'VAT_MISMATCH',
            severity: 'MEDIUM',
            description: 'VAT registered but no VAT number provided',
            recommendation: 'Provide VAT registration number',
          });
          complianceScore -= 20;
        }

        // Check exemption validity
        if (profile.withholdingTaxExempt && profile.exemptionValidUntil) {
          if (profile.exemptionValidUntil < new Date()) {
            issues.push({
              type: 'EXEMPTION_EXPIRED',
              severity: 'CRITICAL',
              description: 'Withholding tax exemption has expired',
              recommendation: 'Renew exemption certificate or remove exemption status',
            });
            complianceScore -= 50;
          }
        }
      }

      const complianceCheck: TaxComplianceCheck = {
        customerId,
        complianceScore: Math.max(0, complianceScore),
        lastChecked: new Date(),
        issues,
        nextCheckDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      this.logger.log(`Tax compliance check completed for customer ${customerId}: ${complianceScore}%`);
      return complianceCheck;
    } catch (error) {
      this.logger.error(`Failed to check customer tax compliance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk validate customer TINs
   */
  async bulkValidateCustomerTINs(
    organizationId: string,
    customerIds?: string[],
  ): Promise<{
    validated: number;
    failed: number;
    results: Array<{ customerId: string; tinNumber?: string; isValid: boolean; errors?: string[] }>;
  }> {
    try {
      this.logger.log(`Starting bulk TIN validation for organization: ${organizationId}`);

      const whereClause: any = { organizationId };
      if (customerIds) {
        whereClause.id = { in: customerIds };
      }

      const customers = await this.prisma.customer.findMany({
        where: whereClause,
        include: {
          taxProfile: true,
        },
      });

      const results = [];
      let validated = 0;
      let failed = 0;

      for (const customer of customers) {
        if (customer.taxProfile?.tinNumber) {
          try {
            const validationResult = await this.validateTIN(customer.taxProfile.tinNumber);
            
            if (validationResult.isValid) {
              // Update validation status
              await this.prisma.customerTaxProfile.update({
                where: { customerId: customer.id },
                data: {
                  tinValidated: true,
                  tinValidatedAt: new Date(),
                },
              });
              validated++;
            } else {
              failed++;
            }

            results.push({
              customerId: customer.id,
              tinNumber: customer.taxProfile.tinNumber,
              isValid: validationResult.isValid,
              errors: validationResult.errors,
            });
          } catch (error) {
            failed++;
            results.push({
              customerId: customer.id,
              tinNumber: customer.taxProfile.tinNumber,
              isValid: false,
              errors: [error.message],
            });
          }
        }
      }

      this.logger.log(`Bulk TIN validation completed: ${validated} validated, ${failed} failed`);
      return { validated, failed, results };
    } catch (error) {
      this.logger.error(`Failed to bulk validate TINs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate TIN format (basic validation)
   */
  private validateTINFormat(tinNumber: string): TINValidationResult {
    // Remove spaces and convert to uppercase
    const cleanTIN = tinNumber.replace(/\s/g, '').toUpperCase();

    // Basic format validation for Zambian TINs
    // Zambian TINs are typically 10 digits
    const tinRegex = /^\d{10}$/;

    if (!tinRegex.test(cleanTIN)) {
      return {
        isValid: false,
        tinNumber: cleanTIN,
        errors: ['TIN must be 10 digits'],
      };
    }

    // Check for obviously invalid patterns (all zeros, sequential numbers, etc.)
    if (cleanTIN === '0000000000' || cleanTIN === '1234567890') {
      return {
        isValid: false,
        tinNumber: cleanTIN,
        errors: ['Invalid TIN pattern'],
      };
    }

    return {
      isValid: true,
      tinNumber: cleanTIN,
    };
  }

  /**
   * Simulate TIN validation (replace with actual ZRA API call)
   */
  private simulateTINValidation(tinNumber: string): TINValidationResult {
    // Mock validation logic - replace with actual ZRA API integration
    const cleanTIN = tinNumber.replace(/\s/g, '');

    // Simulate some valid TINs for testing
    const validTINs = ['1000000001', '1000000002', '2000000001', '3000000001'];
    
    if (validTINs.includes(cleanTIN)) {
      return {
        isValid: true,
        tinNumber: cleanTIN,
        businessName: `Business for TIN ${cleanTIN}`,
        businessType: 'LIMITED_COMPANY',
        registrationDate: new Date('2020-01-01'),
        status: 'ACTIVE',
        taxTypes: ['VAT', 'PAYE', 'WITHHOLDING_TAX'],
      };
    }

    // Simulate validation based on TIN patterns
    if (cleanTIN.startsWith('9')) {
      return {
        isValid: false,
        tinNumber: cleanTIN,
        errors: ['TIN not found in ZRA database'],
      };
    }

    return {
      isValid: true,
      tinNumber: cleanTIN,
      businessName: `Validated Business ${cleanTIN}`,
      businessType: 'SOLE_PROPRIETOR',
      status: 'ACTIVE',
      taxTypes: ['INCOME_TAX'],
    };
  }
}
