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
import { TaxPeriodService, CreateTaxPeriodDto } from '../services/tax-period.service';
import { TaxType, TaxPeriodStatus } from '@prisma/client';

@ApiTags('Tax Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-periods')
export class TaxPeriodController {
  constructor(private readonly taxPeriodService: TaxPeriodService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tax period' })
  @ApiResponse({ status: 201, description: 'Tax period created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTaxPeriod(@Request() req: any, @Body() createDto: Omit<CreateTaxPeriodDto, 'organizationId'>) {
    try {
      const dto: CreateTaxPeriodDto = {
        ...createDto,
        organizationId: req.user.organizationId,
      };

      const taxPeriod = await this.taxPeriodService.createTaxPeriod(dto);

      return {
        success: true,
        data: taxPeriod,
        message: 'Tax period created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create tax period',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get tax periods for organization' })
  @ApiQuery({ name: 'taxType', required: false, enum: TaxType })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TaxPeriodStatus })
  @ApiResponse({ status: 200, description: 'Tax periods retrieved successfully' })
  async getTaxPeriods(
    @Request() req: any,
    @Query('taxType') taxType?: TaxType,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('status') status?: TaxPeriodStatus,
  ) {
    try {
      const periods = await this.taxPeriodService.getTaxPeriods(
        req.user.organizationId,
        taxType,
        year,
        status,
      );

      return {
        success: true,
        data: periods,
        message: 'Tax periods retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax periods',
      };
    }
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get tax calendar for organization' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tax calendar retrieved successfully' })
  async getTaxCalendar(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const calendar = await this.taxPeriodService.getTaxCalendar(req.user.organizationId, year);

      return {
        success: true,
        data: calendar,
        message: 'Tax calendar retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax calendar',
      };
    }
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close a tax period' })
  @ApiResponse({ status: 200, description: 'Tax period closed successfully' })
  @ApiResponse({ status: 404, description: 'Tax period not found' })
  async closeTaxPeriod(@Request() req: any, @Param('id', ParseUUIDPipe) periodId: string) {
    try {
      const period = await this.taxPeriodService.closeTaxPeriod(req.user.organizationId, periodId);

      return {
        success: true,
        data: period,
        message: 'Tax period closed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to close tax period',
      };
    }
  }

  @Put(':id/file')
  @ApiOperation({ summary: 'Mark tax period as filed' })
  @ApiResponse({ status: 200, description: 'Tax period marked as filed successfully' })
  @ApiResponse({ status: 404, description: 'Tax period not found' })
  async markAsFiled(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) periodId: string,
    @Body() body: { filingReference?: string },
  ) {
    try {
      const period = await this.taxPeriodService.markAsFiled(
        req.user.organizationId,
        periodId,
        body.filingReference,
        req.user.id,
      );

      return {
        success: true,
        data: period,
        message: 'Tax period marked as filed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to mark period as filed',
      };
    }
  }

  @Post('generate/:year')
  @ApiOperation({ summary: 'Generate tax periods for a year' })
  @ApiResponse({ status: 201, description: 'Tax periods generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid year' })
  async generatePeriodsForYear(
    @Request() req: any,
    @Param('year', ParseIntPipe) year: number,
    @Body() body: { taxTypes?: TaxType[] },
  ) {
    try {
      const periods = await this.taxPeriodService.generatePeriodsForYear(
        req.user.organizationId,
        year,
        body.taxTypes,
      );

      return {
        success: true,
        data: periods,
        message: `Generated ${periods.length} tax periods for year ${year}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate tax periods',
      };
    }
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open tax periods' })
  @ApiResponse({ status: 200, description: 'Current tax periods retrieved successfully' })
  async getCurrentPeriods(@Request() req: any) {
    try {
      const currentYear = new Date().getFullYear();
      const periods = await this.taxPeriodService.getTaxPeriods(
        req.user.organizationId,
        undefined,
        currentYear,
        TaxPeriodStatus.OPEN,
      );

      return {
        success: true,
        data: periods,
        message: 'Current tax periods retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve current tax periods',
      };
    }
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tax periods' })
  @ApiResponse({ status: 200, description: 'Overdue tax periods retrieved successfully' })
  async getOverduePeriods(@Request() req: any) {
    try {
      const now = new Date();
      const allPeriods = await this.taxPeriodService.getTaxPeriods(req.user.organizationId);
      
      const overduePeriods = allPeriods.filter(period => 
        period.filingDeadline < now && period.status !== TaxPeriodStatus.FILED
      );

      return {
        success: true,
        data: overduePeriods,
        message: 'Overdue tax periods retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve overdue tax periods',
      };
    }
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tax period deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead (default: 30)' })
  @ApiResponse({ status: 200, description: 'Upcoming deadlines retrieved successfully' })
  async getUpcomingDeadlines(
    @Request() req: any,
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const allPeriods = await this.taxPeriodService.getTaxPeriods(req.user.organizationId);
      
      const upcomingPeriods = allPeriods.filter(period => 
        period.filingDeadline >= new Date() && 
        period.filingDeadline <= futureDate &&
        period.status !== TaxPeriodStatus.FILED
      );

      // Add days until deadline for each period
      const periodsWithDeadlines = upcomingPeriods.map(period => {
        const daysUntilDeadline = Math.ceil(
          (period.filingDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...period,
          daysUntilDeadline,
          urgency: daysUntilDeadline <= 7 ? 'HIGH' : daysUntilDeadline <= 14 ? 'MEDIUM' : 'LOW',
        };
      });

      // Sort by deadline
      periodsWithDeadlines.sort((a, b) => a.filingDeadline.getTime() - b.filingDeadline.getTime());

      return {
        success: true,
        data: periodsWithDeadlines,
        message: 'Upcoming deadlines retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve upcoming deadlines',
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get tax periods summary' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tax periods summary retrieved successfully' })
  async getPeriodsSummary(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    try {
      const targetYear = year || new Date().getFullYear();
      const periods = await this.taxPeriodService.getTaxPeriods(
        req.user.organizationId,
        undefined,
        targetYear,
      );

      const summary = {
        year: targetYear,
        totalPeriods: periods.length,
        byStatus: {
          [TaxPeriodStatus.OPEN]: periods.filter(p => p.status === TaxPeriodStatus.OPEN).length,
          [TaxPeriodStatus.CLOSED]: periods.filter(p => p.status === TaxPeriodStatus.CLOSED).length,
          [TaxPeriodStatus.FILED]: periods.filter(p => p.status === TaxPeriodStatus.FILED).length,
          [TaxPeriodStatus.PAID]: periods.filter(p => p.status === TaxPeriodStatus.PAID).length,
          [TaxPeriodStatus.OVERDUE]: periods.filter(p => p.status === TaxPeriodStatus.OVERDUE).length,
        },
        byTaxType: {} as Record<TaxType, number>,
        upcomingDeadlines: periods.filter(p => 
          p.filingDeadline >= new Date() && 
          p.status !== TaxPeriodStatus.FILED
        ).length,
        overdueCount: periods.filter(p => 
          p.filingDeadline < new Date() && 
          p.status !== TaxPeriodStatus.FILED
        ).length,
      };

      // Count by tax type
      Object.values(TaxType).forEach(taxType => {
        summary.byTaxType[taxType] = periods.filter(p => p.taxType === taxType).length;
      });

      return {
        success: true,
        data: summary,
        message: 'Tax periods summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax periods summary',
      };
    }
  }
}
