import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateTaxFilingDto,
  TaxFilingService,
} from '../services/tax-filing.service';
import { TaxFilingStatus, TaxFilingType } from '@prisma/client';

@ApiTags('Tax Filing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-filing')
export class TaxFilingController {
  constructor(private readonly taxFilingService: TaxFilingService) {}

  @Post('prepare')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Prepare tax filing' })
  @ApiResponse({ status: 201, description: 'Filing prepared successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async prepareFiling(
    @Request() req: any,
    @Body() createDto: Omit<CreateTaxFilingDto, 'organizationId' | 'preparedBy'>
  ) {
    try {
      const dto: CreateTaxFilingDto = {
        ...createDto,
        organizationId: req.user.organizationId,
        preparedBy: req.user.id,
      };

      const filing = await this.taxFilingService.prepareFiling(dto);

      return {
        success: true,
        data: filing,
        message: 'Tax filing prepared successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to prepare tax filing',
      };
    }
  }

  @Put(':id/submit')
  @ApiOperation({ summary: 'Submit filing to ZRA' })
  @ApiResponse({ status: 200, description: 'Filing submitted successfully' })
  @ApiResponse({ status: 404, description: 'Filing not found' })
  async submitFiling(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) filingId: string
  ) {
    try {
      const filing = await this.taxFilingService.submitFiling(
        req.user.organizationId,
        filingId,
        req.user.id
      );

      return {
        success: true,
        data: filing,
        message: 'Tax filing submitted to ZRA successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit tax filing',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get tax filings' })
  @ApiQuery({ name: 'taxPeriodId', required: false, type: String })
  @ApiQuery({ name: 'filingType', required: false, enum: TaxFilingType })
  @ApiQuery({ name: 'status', required: false, enum: TaxFilingStatus })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Filings retrieved successfully' })
  async getFilings(
    @Request() req: any,
    @Query('taxPeriodId') taxPeriodId?: string,
    @Query('filingType') filingType?: TaxFilingType,
    @Query('status') status?: TaxFilingStatus,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number
  ) {
    try {
      const filters = {
        taxPeriodId,
        filingType,
        status,
        year,
      };

      const filings = await this.taxFilingService.getFilings(
        req.user.organizationId,
        filters
      );

      return {
        success: true,
        data: filings,
        message: 'Tax filings retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax filings',
      };
    }
  }

  @Get('vat-return/:taxPeriodId')
  @ApiOperation({ summary: 'Generate VAT return' })
  @ApiResponse({
    status: 200,
    description: 'VAT return generated successfully',
  })
  async generateVATReturn(
    @Request() req: any,
    @Param('taxPeriodId', ParseUUIDPipe) taxPeriodId: string
  ) {
    try {
      const vatReturn = await this.taxFilingService.generateVATReturn(
        req.user.organizationId,
        taxPeriodId
      );

      return {
        success: true,
        data: vatReturn,
        message: 'VAT return generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate VAT return',
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get filing summary' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getFilingSummary(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number
  ) {
    try {
      const summary = await this.taxFilingService.getFilingSummary(
        req.user.organizationId,
        year
      );

      return {
        success: true,
        data: summary,
        message: 'Filing summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve filing summary',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get tax filing dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboardData(@Request() req: any) {
    try {
      const currentYear = new Date().getFullYear();

      // Get summary for current year
      const summary = await this.taxFilingService.getFilingSummary(
        req.user.organizationId,
        currentYear
      );

      // Get recent filings
      const recentFilings = await this.taxFilingService.getFilings(
        req.user.organizationId,
        { year: currentYear }
      );

      // Get draft filings
      const draftFilings = await this.taxFilingService.getFilings(
        req.user.organizationId,
        { status: TaxFilingStatus.DRAFT, year: currentYear }
      );

      // Get submitted filings
      const submittedFilings = await this.taxFilingService.getFilings(
        req.user.organizationId,
        { status: TaxFilingStatus.SUBMITTED, year: currentYear }
      );

      const dashboardData = {
        summary,
        recentFilings: recentFilings.slice(0, 10), // Latest 10 filings
        draftFilings: draftFilings.slice(0, 5), // Top 5 drafts
        submittedFilings: submittedFilings.slice(0, 5), // Latest 5 submitted
        alerts: {
          draftCount: draftFilings.length,
          pendingSubmission: draftFilings.filter(
            f => f.status === TaxFilingStatus.PREPARED
          ).length,
          awaitingAcknowledgment: submittedFilings.filter(
            f => f.status === TaxFilingStatus.SUBMITTED && !f.acknowledgedAt
          ).length,
        },
        year: currentYear,
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Tax filing dashboard data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve dashboard data',
      };
    }
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available filing types' })
  @ApiResponse({
    status: 200,
    description: 'Filing types retrieved successfully',
  })
  async getFilingTypes() {
    try {
      const filingTypes = [
        {
          value: 'VAT_RETURN',
          label: 'VAT Return',
          description: 'Quarterly VAT return',
          frequency: 'Quarterly',
          deadline: '18th of month following quarter',
        },
        {
          value: 'INCOME_TAX',
          label: 'Income Tax Return',
          description: 'Annual income tax return',
          frequency: 'Annually',
          deadline: '21st June following tax year',
        },
        {
          value: 'PAYE_RETURN',
          label: 'PAYE Return',
          description: 'Monthly PAYE return',
          frequency: 'Monthly',
          deadline: '10th of following month',
        },
        {
          value: 'WHT_RETURN',
          label: 'Withholding Tax Return',
          description: 'Monthly withholding tax return',
          frequency: 'Monthly',
          deadline: '14th of following month',
        },
        {
          value: 'ADVANCE_TAX',
          label: 'Advance Tax',
          description: 'Quarterly advance tax payment',
          frequency: 'Quarterly',
          deadline: '30 days after quarter end',
        },
        {
          value: 'TURNOVER_TAX',
          label: 'Turnover Tax',
          description: 'Monthly turnover tax for small businesses',
          frequency: 'Monthly',
          deadline: '18th of following month',
        },
        {
          value: 'AMENDED_RETURN',
          label: 'Amended Return',
          description: 'Amendment to previously filed return',
          frequency: 'As needed',
          deadline: 'Within prescribed time limits',
        },
      ];

      return {
        success: true,
        data: filingTypes,
        message: 'Filing types retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve filing types',
      };
    }
  }

  @Get('templates/:filingType')
  @ApiOperation({ summary: 'Get filing template for specific type' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getFilingTemplate(
    @Request() req: any,
    @Param('filingType') filingType: TaxFilingType
  ) {
    try {
      // Generate template based on filing type
      let template: any = {};

      switch (filingType) {
        case TaxFilingType.VAT_RETURN:
          template = {
            sections: [
              {
                name: 'Organization Information',
                fields: ['name', 'tin', 'address'],
              },
              {
                name: 'Period Information',
                fields: ['startDate', 'endDate', 'quarter'],
              },
              {
                name: 'Sales Information',
                fields: ['standardRatedSales', 'zeroRatedSales', 'exemptSales'],
              },
              {
                name: 'Purchase Information',
                fields: [
                  'standardRatedPurchases',
                  'zeroRatedPurchases',
                  'exemptPurchases',
                ],
              },
              {
                name: 'VAT Calculation',
                fields: ['outputVAT', 'inputVAT', 'netVAT'],
              },
            ],
            validationRules: {
              outputVAT: 'Must equal 16% of standard-rated sales',
              inputVAT: 'Must equal 16% of standard-rated purchases',
              netVAT: 'Must equal outputVAT minus inputVAT',
            },
          };
          break;

        case TaxFilingType.WHT_RETURN:
          template = {
            sections: [
              {
                name: 'Organization Information',
                fields: ['name', 'tin', 'address'],
              },
              { name: 'Period Information', fields: ['month', 'year'] },
              {
                name: 'Withholding Certificates',
                fields: [
                  'certificatesList',
                  'totalGrossAmount',
                  'totalTaxWithheld',
                ],
              },
            ],
            validationRules: {
              totalTaxWithheld: 'Must equal sum of all certificate tax amounts',
            },
          };
          break;

        default:
          template = {
            sections: [
              {
                name: 'Organization Information',
                fields: ['name', 'tin', 'address'],
              },
              { name: 'Period Information', fields: ['startDate', 'endDate'] },
              {
                name: 'Tax Information',
                fields: ['taxableAmount', 'taxRate', 'taxDue'],
              },
            ],
            validationRules: {},
          };
      }

      return {
        success: true,
        data: {
          filingType,
          template,
          instructions: `Template for ${filingType} filing`,
        },
        message: 'Filing template retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve filing template',
      };
    }
  }
}
