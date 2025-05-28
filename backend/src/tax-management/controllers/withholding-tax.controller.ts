import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { 
  WithholdingTaxService, 
  CreateWithholdingCertificateDto 
} from '../services/withholding-tax.service';
import { WithholdingCertificateStatus } from '@prisma/client';

@ApiTags('Withholding Tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withholding-tax')
export class WithholdingTaxController {
  constructor(private readonly withholdingTaxService: WithholdingTaxService) {}

  @Post('certificates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create withholding tax certificate' })
  @ApiResponse({ status: 201, description: 'Certificate created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCertificate(
    @Request() req: any,
    @Body() createDto: Omit<CreateWithholdingCertificateDto, 'organizationId'>,
  ) {
    try {
      const dto: CreateWithholdingCertificateDto = {
        ...createDto,
        organizationId: req.user.organizationId,
        paymentDate: new Date(createDto.paymentDate),
      };

      const certificate = await this.withholdingTaxService.createCertificate(dto);

      return {
        success: true,
        data: certificate,
        message: 'Withholding tax certificate created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create withholding tax certificate',
      };
    }
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Get withholding tax certificates' })
  @ApiQuery({ name: 'taxPeriodId', required: false, type: String })
  @ApiQuery({ name: 'supplierTin', required: false, type: String })
  @ApiQuery({ name: 'serviceType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: WithholdingCertificateStatus })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  async getCertificates(
    @Request() req: any,
    @Query('taxPeriodId') taxPeriodId?: string,
    @Query('supplierTin') supplierTin?: string,
    @Query('serviceType') serviceType?: string,
    @Query('status') status?: WithholdingCertificateStatus,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
  ) {
    try {
      const filters = {
        taxPeriodId,
        supplierTin,
        serviceType,
        status,
        year,
        month,
      };

      const certificates = await this.withholdingTaxService.getCertificates(
        req.user.organizationId,
        filters,
      );

      return {
        success: true,
        data: certificates,
        message: 'Withholding tax certificates retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve withholding tax certificates',
      };
    }
  }

  @Put('certificates/:id/submit')
  @ApiOperation({ summary: 'Submit certificate to ZRA' })
  @ApiResponse({ status: 200, description: 'Certificate submitted successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async submitCertificate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) certificateId: string,
  ) {
    try {
      const certificate = await this.withholdingTaxService.submitToZRA(
        req.user.organizationId,
        certificateId,
      );

      return {
        success: true,
        data: certificate,
        message: 'Certificate submitted to ZRA successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit certificate to ZRA',
      };
    }
  }

  @Post('certificates/bulk-submit')
  @ApiOperation({ summary: 'Bulk submit certificates to ZRA' })
  @ApiResponse({ status: 200, description: 'Bulk submission completed' })
  async bulkSubmitCertificates(
    @Request() req: any,
    @Body() body: { certificateIds: string[] },
  ) {
    try {
      const result = await this.withholdingTaxService.bulkSubmitToZRA(
        req.user.organizationId,
        body.certificateIds,
      );

      return {
        success: true,
        data: result,
        message: `Bulk submission completed: ${result.submitted} submitted, ${result.failed} failed`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to bulk submit certificates',
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get withholding tax summary' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getWithholdingSummary(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
  ) {
    try {
      const summary = await this.withholdingTaxService.getWithholdingSummary(
        req.user.organizationId,
        year,
        month,
      );

      return {
        success: true,
        data: summary,
        message: 'Withholding tax summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve withholding tax summary',
      };
    }
  }

  @Get('monthly-return/:year/:month')
  @ApiOperation({ summary: 'Generate monthly withholding tax return' })
  @ApiResponse({ status: 200, description: 'Monthly return generated successfully' })
  async generateMonthlyReturn(
    @Request() req: any,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    try {
      const returnData = await this.withholdingTaxService.generateMonthlyReturn(
        req.user.organizationId,
        year,
        month,
      );

      return {
        success: true,
        data: returnData,
        message: 'Monthly withholding tax return generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate monthly return',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get withholding tax dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(@Request() req: any) {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Get current month summary
      const currentMonthSummary = await this.withholdingTaxService.getWithholdingSummary(
        req.user.organizationId,
        currentYear,
        currentMonth,
      );

      // Get year-to-date summary
      const yearSummary = await this.withholdingTaxService.getWithholdingSummary(
        req.user.organizationId,
        currentYear,
      );

      // Get recent certificates
      const recentCertificates = await this.withholdingTaxService.getCertificates(
        req.user.organizationId,
        { year: currentYear },
      );

      const dashboardData = {
        currentMonth: {
          summary: currentMonthSummary,
          period: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`,
        },
        yearToDate: {
          summary: yearSummary,
          year: currentYear,
        },
        recentCertificates: recentCertificates.slice(0, 10), // Latest 10 certificates
        alerts: {
          unsubmittedCount: recentCertificates.filter(c => !c.submittedToZra).length,
          pendingSubmission: recentCertificates.filter(c => 
            c.status === WithholdingCertificateStatus.ISSUED
          ).length,
        },
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Withholding tax dashboard data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve dashboard data',
      };
    }
  }

  @Get('service-types')
  @ApiOperation({ summary: 'Get available service types for withholding tax' })
  @ApiResponse({ status: 200, description: 'Service types retrieved successfully' })
  async getServiceTypes() {
    try {
      const serviceTypes = [
        { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services', rate: 15 },
        { value: 'RENT', label: 'Rent', rate: 10 },
        { value: 'INTEREST', label: 'Interest', rate: 15 },
        { value: 'DIVIDENDS', label: 'Dividends', rate: 15 },
        { value: 'ROYALTIES', label: 'Royalties', rate: 15 },
        { value: 'MANAGEMENT_FEES', label: 'Management Fees', rate: 15 },
        { value: 'TECHNICAL_FEES', label: 'Technical Fees', rate: 15 },
        { value: 'COMMISSIONS', label: 'Commissions', rate: 15 },
        { value: 'CONSULTANCY', label: 'Consultancy', rate: 15 },
        { value: 'OTHER', label: 'Other Services', rate: 15 },
      ];

      return {
        success: true,
        data: serviceTypes,
        message: 'Service types retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve service types',
      };
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get withholding tax analytics' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const targetYear = year || new Date().getFullYear();
      
      // Get monthly breakdown
      const monthlyData = [];
      for (let month = 1; month <= 12; month++) {
        const summary = await this.withholdingTaxService.getWithholdingSummary(
          req.user.organizationId,
          targetYear,
          month,
        );
        
        monthlyData.push({
          month,
          monthName: new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' }),
          certificatesCount: summary.totalCertificates,
          grossAmount: summary.totalGrossAmount,
          taxWithheld: summary.totalTaxWithheld,
          submissionRate: summary.submissionRate,
        });
      }

      // Get year summary
      const yearSummary = await this.withholdingTaxService.getWithholdingSummary(
        req.user.organizationId,
        targetYear,
      );

      const analytics = {
        year: targetYear,
        monthlyBreakdown: monthlyData,
        yearSummary,
        trends: {
          averageMonthlyTax: yearSummary.totalTaxWithheld / 12,
          peakMonth: monthlyData.reduce((max, current) => 
            current.taxWithheld > max.taxWithheld ? current : max
          ),
          submissionTrend: monthlyData.map(m => ({
            month: m.month,
            rate: m.submissionRate,
          })),
        },
      };

      return {
        success: true,
        data: analytics,
        message: 'Withholding tax analytics retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve analytics data',
      };
    }
  }
}
