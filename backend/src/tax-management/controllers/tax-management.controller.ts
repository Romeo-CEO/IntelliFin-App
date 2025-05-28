import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaxCalculationService, TaxCalculationRequest } from '../services/tax-calculation.service';
import { TaxType } from '@prisma/client';

@ApiTags('Tax Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-management')
export class TaxManagementController {
  constructor(private readonly taxCalculationService: TaxCalculationService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate tax for any tax type' })
  @ApiResponse({ status: 200, description: 'Tax calculation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid calculation request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async calculateTax(
    @Request() req: any,
    @Body() calculationRequest: TaxCalculationRequest,
  ) {
    try {
      // Ensure the request is for the user's organization
      calculationRequest.organizationId = req.user.organizationId;

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'Tax calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate tax',
      };
    }
  }

  @Post('calculate/vat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate VAT specifically' })
  @ApiResponse({ status: 200, description: 'VAT calculation completed successfully' })
  async calculateVAT(
    @Request() req: any,
    @Body() body: { amount: number; isInclusive?: boolean; effectiveDate?: string },
  ) {
    try {
      const calculationRequest: TaxCalculationRequest = {
        organizationId: req.user.organizationId,
        taxType: TaxType.VAT,
        amount: body.amount,
        isInclusive: body.isInclusive || false,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      };

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'VAT calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate VAT',
      };
    }
  }

  @Post('calculate/withholding-tax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate withholding tax' })
  @ApiResponse({ status: 200, description: 'Withholding tax calculation completed successfully' })
  async calculateWithholdingTax(
    @Request() req: any,
    @Body() body: { amount: number; serviceType?: string; effectiveDate?: string },
  ) {
    try {
      const calculationRequest: TaxCalculationRequest = {
        organizationId: req.user.organizationId,
        taxType: TaxType.WITHHOLDING_TAX,
        amount: body.amount,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        metadata: { serviceType: body.serviceType },
      };

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'Withholding tax calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate withholding tax',
      };
    }
  }

  @Post('calculate/income-tax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate income tax' })
  @ApiResponse({ status: 200, description: 'Income tax calculation completed successfully' })
  async calculateIncomeTax(
    @Request() req: any,
    @Body() body: { taxableIncome: number; effectiveDate?: string },
  ) {
    try {
      const calculationRequest: TaxCalculationRequest = {
        organizationId: req.user.organizationId,
        taxType: TaxType.INCOME_TAX,
        amount: body.taxableIncome,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      };

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'Income tax calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate income tax',
      };
    }
  }

  @Post('calculate/paye')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate PAYE tax' })
  @ApiResponse({ status: 200, description: 'PAYE calculation completed successfully' })
  async calculatePAYE(
    @Request() req: any,
    @Body() body: { grossSalary: number; effectiveDate?: string },
  ) {
    try {
      const calculationRequest: TaxCalculationRequest = {
        organizationId: req.user.organizationId,
        taxType: TaxType.PAYE,
        amount: body.grossSalary,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      };

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'PAYE calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate PAYE',
      };
    }
  }

  @Post('calculate/turnover-tax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate turnover tax for small businesses' })
  @ApiResponse({ status: 200, description: 'Turnover tax calculation completed successfully' })
  async calculateTurnoverTax(
    @Request() req: any,
    @Body() body: { turnover: number; effectiveDate?: string },
  ) {
    try {
      const calculationRequest: TaxCalculationRequest = {
        organizationId: req.user.organizationId,
        taxType: TaxType.TURNOVER_TAX,
        amount: body.turnover,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      };

      const result = await this.taxCalculationService.calculateTax(calculationRequest);

      return {
        success: true,
        data: result,
        message: 'Turnover tax calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate turnover tax',
      };
    }
  }

  @Get('tax-types')
  @ApiOperation({ summary: 'Get available tax types' })
  @ApiResponse({ status: 200, description: 'Tax types retrieved successfully' })
  async getTaxTypes() {
    try {
      const taxTypes = Object.values(TaxType).map(type => ({
        value: type,
        label: this.formatTaxTypeLabel(type),
        description: this.getTaxTypeDescription(type),
      }));

      return {
        success: true,
        data: taxTypes,
        message: 'Tax types retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax types',
      };
    }
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'Get current tax rates' })
  @ApiResponse({ status: 200, description: 'Tax rates retrieved successfully' })
  async getCurrentTaxRates(@Request() req: any) {
    try {
      // This would typically fetch from the database, but for now return default rates
      const taxRates = {
        VAT: {
          standard: 16,
          zeroRated: 0,
          exempt: 'N/A',
        },
        WITHHOLDING_TAX: {
          standard: 15,
          professionalServices: 15,
          rent: 10,
          interest: 15,
          dividends: 15,
        },
        INCOME_TAX: {
          corporate: 35,
          brackets: [
            { min: 0, max: 4800, rate: 0 },
            { min: 4800, max: 9600, rate: 25 },
            { min: 9600, max: 19200, rate: 30 },
            { min: 19200, max: 'Infinity', rate: 37.5 },
          ],
        },
        PAYE: {
          brackets: [
            { min: 0, max: 4800, rate: 0 },
            { min: 4800, max: 9600, rate: 25 },
            { min: 9600, max: 19200, rate: 30 },
            { min: 19200, max: 'Infinity', rate: 37.5 },
          ],
        },
        TURNOVER_TAX: {
          rate: 4,
          threshold: 800000,
        },
      };

      return {
        success: true,
        data: taxRates,
        message: 'Tax rates retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax rates',
      };
    }
  }

  /**
   * Format tax type labels for display
   */
  private formatTaxTypeLabel(taxType: TaxType): string {
    const labels = {
      [TaxType.VAT]: 'Value Added Tax (VAT)',
      [TaxType.INCOME_TAX]: 'Income Tax',
      [TaxType.PAYE]: 'Pay As You Earn (PAYE)',
      [TaxType.WITHHOLDING_TAX]: 'Withholding Tax',
      [TaxType.ADVANCE_TAX]: 'Advance Tax',
      [TaxType.TURNOVER_TAX]: 'Turnover Tax',
      [TaxType.PROPERTY_TAX]: 'Property Transfer Tax',
      [TaxType.EXCISE_TAX]: 'Excise Tax',
    };
    return labels[taxType] || taxType;
  }

  /**
   * Get tax type descriptions
   */
  private getTaxTypeDescription(taxType: TaxType): string {
    const descriptions = {
      [TaxType.VAT]: 'Standard rate 16% on goods and services',
      [TaxType.INCOME_TAX]: 'Corporate income tax at 35%',
      [TaxType.PAYE]: 'Employee income tax deducted from salaries',
      [TaxType.WITHHOLDING_TAX]: 'Tax withheld at source on payments',
      [TaxType.ADVANCE_TAX]: 'Quarterly advance payments of income tax',
      [TaxType.TURNOVER_TAX]: '4% tax on turnover for small businesses',
      [TaxType.PROPERTY_TAX]: 'Tax on property transfers',
      [TaxType.EXCISE_TAX]: 'Tax on specific goods like alcohol and tobacco',
    };
    return descriptions[taxType] || 'Tax calculation service';
  }
}
