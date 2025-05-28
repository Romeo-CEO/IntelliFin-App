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
  TaxObligationService, 
  CreateTaxObligationDto, 
  UpdateTaxObligationDto 
} from '../services/tax-obligation.service';
import { TaxObligationType, TaxObligationStatus } from '@prisma/client';

@ApiTags('Tax Obligations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-obligations')
export class TaxObligationController {
  constructor(private readonly taxObligationService: TaxObligationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tax obligation' })
  @ApiResponse({ status: 201, description: 'Tax obligation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createObligation(
    @Request() req: any,
    @Body() createDto: Omit<CreateTaxObligationDto, 'organizationId'>,
  ) {
    try {
      const dto: CreateTaxObligationDto = {
        ...createDto,
        organizationId: req.user.organizationId,
      };

      const obligation = await this.taxObligationService.createObligation(dto);

      return {
        success: true,
        data: obligation,
        message: 'Tax obligation created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create tax obligation',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get tax obligations for organization' })
  @ApiQuery({ name: 'taxPeriodId', required: false, type: String })
  @ApiQuery({ name: 'obligationType', required: false, enum: TaxObligationType })
  @ApiQuery({ name: 'status', required: false, enum: TaxObligationStatus })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tax obligations retrieved successfully' })
  async getObligations(
    @Request() req: any,
    @Query('taxPeriodId') taxPeriodId?: string,
    @Query('obligationType') obligationType?: TaxObligationType,
    @Query('status') status?: TaxObligationStatus,
    @Query('overdue') overdue?: boolean,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const filters = {
        taxPeriodId,
        obligationType,
        status,
        overdue,
        year,
      };

      const obligations = await this.taxObligationService.getObligations(
        req.user.organizationId,
        filters,
      );

      return {
        success: true,
        data: obligations,
        message: 'Tax obligations retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax obligations',
      };
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tax obligation' })
  @ApiResponse({ status: 200, description: 'Tax obligation updated successfully' })
  @ApiResponse({ status: 404, description: 'Tax obligation not found' })
  async updateObligation(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) obligationId: string,
    @Body() updateDto: UpdateTaxObligationDto,
  ) {
    try {
      const obligation = await this.taxObligationService.updateObligation(
        req.user.organizationId,
        obligationId,
        updateDto,
      );

      return {
        success: true,
        data: obligation,
        message: 'Tax obligation updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update tax obligation',
      };
    }
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Record payment for tax obligation' })
  @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 404, description: 'Tax obligation not found' })
  async recordPayment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) obligationId: string,
    @Body() body: {
      amount: number;
      paymentMethod: string;
      paymentReference?: string;
    },
  ) {
    try {
      const obligation = await this.taxObligationService.recordPayment(
        req.user.organizationId,
        obligationId,
        body.amount,
        body.paymentMethod,
        body.paymentReference,
      );

      return {
        success: true,
        data: obligation,
        message: 'Payment recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to record payment',
      };
    }
  }

  @Post('calculate-penalties')
  @ApiOperation({ summary: 'Calculate penalties and interest for overdue obligations' })
  @ApiResponse({ status: 200, description: 'Penalties calculated successfully' })
  async calculatePenalties(@Request() req: any) {
    try {
      await this.taxObligationService.calculatePenaltiesAndInterest(req.user.organizationId);

      return {
        success: true,
        message: 'Penalties and interest calculated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate penalties',
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get tax obligations summary' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tax obligations summary retrieved successfully' })
  async getObligationSummary(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const summary = await this.taxObligationService.getObligationSummary(
        req.user.organizationId,
        year,
      );

      return {
        success: true,
        data: summary,
        message: 'Tax obligations summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve obligations summary',
      };
    }
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tax obligations (due in next 30 days)' })
  @ApiResponse({ status: 200, description: 'Upcoming obligations retrieved successfully' })
  async getUpcomingObligations(@Request() req: any) {
    try {
      const obligations = await this.taxObligationService.getUpcomingObligations(
        req.user.organizationId,
      );

      return {
        success: true,
        data: obligations,
        message: 'Upcoming obligations retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve upcoming obligations',
      };
    }
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tax obligations' })
  @ApiResponse({ status: 200, description: 'Overdue obligations retrieved successfully' })
  async getOverdueObligations(@Request() req: any) {
    try {
      const obligations = await this.taxObligationService.getObligations(
        req.user.organizationId,
        { overdue: true },
      );

      return {
        success: true,
        data: obligations,
        message: 'Overdue obligations retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve overdue obligations',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get tax obligations dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(@Request() req: any) {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get summary for current year
      const summary = await this.taxObligationService.getObligationSummary(
        req.user.organizationId,
        currentYear,
      );

      // Get upcoming obligations
      const upcoming = await this.taxObligationService.getUpcomingObligations(
        req.user.organizationId,
      );

      // Get overdue obligations
      const overdue = await this.taxObligationService.getObligations(
        req.user.organizationId,
        { overdue: true },
      );

      const dashboardData = {
        summary,
        upcoming: upcoming.slice(0, 5), // Top 5 upcoming
        overdue: overdue.slice(0, 5), // Top 5 overdue
        alerts: {
          overdueCount: overdue.length,
          upcomingCount: upcoming.filter(o => {
            const daysUntil = Math.ceil(
              (o.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= 7;
          }).length,
          totalOutstanding: summary.totalOutstanding,
        },
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve dashboard data',
      };
    }
  }

  @Get('by-type/:type')
  @ApiOperation({ summary: 'Get obligations by type' })
  @ApiResponse({ status: 200, description: 'Obligations by type retrieved successfully' })
  async getObligationsByType(
    @Request() req: any,
    @Param('type') type: TaxObligationType,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const obligations = await this.taxObligationService.getObligations(
        req.user.organizationId,
        { obligationType: type, year },
      );

      return {
        success: true,
        data: obligations,
        message: `${type} obligations retrieved successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to retrieve ${type} obligations`,
      };
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get tax obligations analytics' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const targetYear = year || new Date().getFullYear();
      const obligations = await this.taxObligationService.getObligations(
        req.user.organizationId,
        { year: targetYear },
      );

      // Calculate monthly trends
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(2024, i, 1).toLocaleString('default', { month: 'long' }),
        totalDue: 0,
        totalPaid: 0,
        count: 0,
      }));

      obligations.forEach(obligation => {
        const month = obligation.dueDate.getMonth();
        monthlyData[month].totalDue += obligation.amountDue.toNumber();
        monthlyData[month].totalPaid += obligation.amountPaid.toNumber();
        monthlyData[month].count += 1;
      });

      // Calculate compliance rate
      const completedObligations = obligations.filter(o => o.status === TaxObligationStatus.COMPLETED);
      const complianceRate = obligations.length > 0 ? 
        Math.round((completedObligations.length / obligations.length) * 100) : 100;

      const analytics = {
        year: targetYear,
        complianceRate,
        monthlyTrends: monthlyData,
        totalObligations: obligations.length,
        completedObligations: completedObligations.length,
        averagePaymentTime: this.calculateAveragePaymentTime(completedObligations),
        largestObligation: Math.max(...obligations.map(o => o.amountDue.toNumber()), 0),
        totalTaxLiability: obligations.reduce((sum, o) => sum + o.amountDue.toNumber(), 0),
      };

      return {
        success: true,
        data: analytics,
        message: 'Analytics data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve analytics data',
      };
    }
  }

  /**
   * Calculate average payment time in days
   */
  private calculateAveragePaymentTime(completedObligations: any[]): number {
    if (completedObligations.length === 0) return 0;

    const totalDays = completedObligations.reduce((sum, obligation) => {
      if (obligation.paidAt && obligation.dueDate) {
        const days = Math.ceil(
          (obligation.paidAt.getTime() - obligation.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(0, days); // Only count positive days (late payments)
      }
      return sum;
    }, 0);

    return Math.round(totalDays / completedObligations.length);
  }
}
