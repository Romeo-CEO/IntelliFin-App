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
  AdjustmentWorkflowAction,
  CreateTaxAdjustmentDto,
  TaxAdjustmentService,
} from '../services/tax-adjustment.service';
import { TaxAdjustmentStatus, TaxAdjustmentType } from '@prisma/client';

@ApiTags('Tax Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-adjustments')
export class TaxAdjustmentController {
  constructor(private readonly taxAdjustmentService: TaxAdjustmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create tax adjustment request' })
  @ApiResponse({
    status: 201,
    description: 'Adjustment request created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAdjustment(
    @Request() req: any,
    @Body()
    createDto: Omit<CreateTaxAdjustmentDto, 'organizationId' | 'requestedBy'>
  ) {
    try {
      const dto: CreateTaxAdjustmentDto = {
        ...createDto,
        organizationId: req.user.organizationId,
        requestedBy: req.user.id,
      };

      const adjustment = await this.taxAdjustmentService.createAdjustment(dto);

      return {
        success: true,
        data: adjustment,
        message: 'Tax adjustment request created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create tax adjustment request',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get tax adjustments' })
  @ApiQuery({ name: 'taxPeriodId', required: false, type: String })
  @ApiQuery({
    name: 'adjustmentType',
    required: false,
    enum: TaxAdjustmentType,
  })
  @ApiQuery({ name: 'status', required: false, enum: TaxAdjustmentStatus })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'requestedBy', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Adjustments retrieved successfully',
  })
  async getAdjustments(
    @Request() req: any,
    @Query('taxPeriodId') taxPeriodId?: string,
    @Query('adjustmentType') adjustmentType?: TaxAdjustmentType,
    @Query('status') status?: TaxAdjustmentStatus,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('requestedBy') requestedBy?: string
  ) {
    try {
      const filters = {
        taxPeriodId,
        adjustmentType,
        status,
        year,
        requestedBy,
      };

      const adjustments = await this.taxAdjustmentService.getAdjustments(
        req.user.organizationId,
        filters
      );

      return {
        success: true,
        data: adjustments,
        message: 'Tax adjustments retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve tax adjustments',
      };
    }
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve tax adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment approved successfully' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async approveAdjustment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Body() body: { comments?: string }
  ) {
    try {
      const action: AdjustmentWorkflowAction = {
        adjustmentId,
        action: 'APPROVE',
        userId: req.user.id,
        comments: body.comments,
      };

      const adjustment = await this.taxAdjustmentService.processWorkflowAction(
        req.user.organizationId,
        action
      );

      return {
        success: true,
        data: adjustment,
        message: 'Tax adjustment approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to approve tax adjustment',
      };
    }
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject tax adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment rejected successfully' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async rejectAdjustment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Body() body: { comments: string }
  ) {
    try {
      const action: AdjustmentWorkflowAction = {
        adjustmentId,
        action: 'REJECT',
        userId: req.user.id,
        comments: body.comments,
      };

      const adjustment = await this.taxAdjustmentService.processWorkflowAction(
        req.user.organizationId,
        action
      );

      return {
        success: true,
        data: adjustment,
        message: 'Tax adjustment rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to reject tax adjustment',
      };
    }
  }

  @Put(':id/submit')
  @ApiOperation({ summary: 'Submit approved adjustment to ZRA' })
  @ApiResponse({
    status: 200,
    description: 'Adjustment submitted successfully',
  })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async submitToZRA(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) adjustmentId: string
  ) {
    try {
      const adjustment = await this.taxAdjustmentService.submitToZRA(
        req.user.organizationId,
        adjustmentId
      );

      return {
        success: true,
        data: adjustment,
        message: 'Adjustment submitted to ZRA successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit adjustment to ZRA',
      };
    }
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending adjustments requiring approval' })
  @ApiResponse({
    status: 200,
    description: 'Pending approvals retrieved successfully',
  })
  async getPendingApprovals(@Request() req: any) {
    try {
      const pendingAdjustments =
        await this.taxAdjustmentService.getPendingApprovals(
          req.user.organizationId
        );

      return {
        success: true,
        data: pendingAdjustments,
        message: 'Pending approvals retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve pending approvals',
      };
    }
  }

  @Post('auto-approve')
  @ApiOperation({ summary: 'Auto-approve small adjustments' })
  @ApiResponse({ status: 200, description: 'Auto-approval completed' })
  async autoApproveSmallAdjustments(
    @Request() req: any,
    @Body() body: { threshold?: number }
  ) {
    try {
      const result =
        await this.taxAdjustmentService.autoApproveSmallAdjustments(
          req.user.organizationId,
          body.threshold || 1000,
          req.user.id
        );

      return {
        success: true,
        data: result,
        message: `Auto-approval completed: ${result.approved} of ${result.total} adjustments approved`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to auto-approve adjustments',
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get tax adjustments summary' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getAdjustmentSummary(
    @Request() req: any,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number
  ) {
    try {
      const summary = await this.taxAdjustmentService.getAdjustmentSummary(
        req.user.organizationId,
        year
      );

      return {
        success: true,
        data: summary,
        message: 'Tax adjustments summary retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve adjustments summary',
      };
    }
  }

  @Get('report/:year')
  @ApiOperation({ summary: 'Generate adjustment report for year' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateAdjustmentReport(
    @Request() req: any,
    @Param('year', ParseIntPipe) year: number
  ) {
    try {
      const report = await this.taxAdjustmentService.generateAdjustmentReport(
        req.user.organizationId,
        year
      );

      return {
        success: true,
        data: report,
        message: 'Adjustment report generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate adjustment report',
      };
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get tax adjustments dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboardData(@Request() req: any) {
    try {
      const currentYear = new Date().getFullYear();

      // Get summary for current year
      const summary = await this.taxAdjustmentService.getAdjustmentSummary(
        req.user.organizationId,
        currentYear
      );

      // Get pending approvals
      const pendingApprovals =
        await this.taxAdjustmentService.getPendingApprovals(
          req.user.organizationId
        );

      // Get recent adjustments
      const recentAdjustments = await this.taxAdjustmentService.getAdjustments(
        req.user.organizationId,
        { year: currentYear }
      );

      const dashboardData = {
        summary,
        pendingApprovals: {
          count: pendingApprovals.length,
          items: pendingApprovals.slice(0, 5), // Top 5 pending
          totalAmount: pendingApprovals.reduce(
            (sum, adj) => sum + Math.abs(adj.adjustmentAmount.toNumber()),
            0
          ),
        },
        recentActivity: recentAdjustments.slice(0, 10), // Latest 10 adjustments
        alerts: {
          pendingCount: pendingApprovals.length,
          overdueApprovals: pendingApprovals.filter(adj => {
            const daysSinceRequest = Math.ceil(
              (new Date().getTime() - adj.requestedAt.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return daysSinceRequest > 7; // Overdue if pending for more than 7 days
          }).length,
        },
        year: currentYear,
      };

      return {
        success: true,
        data: dashboardData,
        message: 'Tax adjustments dashboard data retrieved successfully',
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
  @ApiOperation({ summary: 'Get available adjustment types' })
  @ApiResponse({
    status: 200,
    description: 'Adjustment types retrieved successfully',
  })
  async getAdjustmentTypes() {
    try {
      const adjustmentTypes = [
        {
          value: 'CORRECTION',
          label: 'Correction',
          description: 'Correction of calculation error',
        },
        {
          value: 'AMENDMENT',
          label: 'Amendment',
          description: 'Amendment to filed return',
        },
        {
          value: 'REFUND_CLAIM',
          label: 'Refund Claim',
          description: 'Claim for tax refund',
        },
        {
          value: 'PENALTY_WAIVER',
          label: 'Penalty Waiver',
          description: 'Request for penalty waiver',
        },
        {
          value: 'INTEREST_WAIVER',
          label: 'Interest Waiver',
          description: 'Request for interest waiver',
        },
        {
          value: 'OVERPAYMENT',
          label: 'Overpayment',
          description: 'Overpayment adjustment',
        },
        {
          value: 'UNDERPAYMENT',
          label: 'Underpayment',
          description: 'Underpayment adjustment',
        },
      ];

      return {
        success: true,
        data: adjustmentTypes,
        message: 'Adjustment types retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve adjustment types',
      };
    }
  }
}
