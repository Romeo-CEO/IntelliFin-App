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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApprovalService } from './approval.service';
import { ApprovalRulesEngine } from './approval-rules.engine';
import {
  CreateApprovalRequestDto,
  ApprovalDecisionDto,
  BulkApprovalDto,
  ApprovalRequestQueryDto,
  CreateApprovalRuleDto,
  UpdateApprovalRuleDto,
  ApprovalStatsResponseDto,
} from './dto/approval.dto';

@ApiTags('Approval Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approval')
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly rulesEngine: ApprovalRulesEngine,
  ) {}

  // ============================================================================
  // APPROVAL REQUESTS
  // ============================================================================

  @Post('requests')
  @ApiOperation({ summary: 'Submit expense for approval' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Approval request created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data or expense already submitted',
  })
  @Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN)
  async submitForApproval(
    @Body() createApprovalRequestDto: CreateApprovalRequestDto,
    @Request() req: any,
  ) {
    const approvalRequest = await this.approvalService.submitExpenseForApproval({
      ...createApprovalRequestDto,
      organizationId: req.user.organizationId,
      requesterId: req.user.sub,
    });

    return {
      success: true,
      data: approvalRequest,
      message: 'Expense submitted for approval successfully',
    };
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get approval requests with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval requests retrieved successfully',
  })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getApprovalRequests(
    @Query() query: ApprovalRequestQueryDto,
    @Request() req: any,
  ) {
    const result = await this.approvalService.getApprovalRequests(
      req.user.organizationId,
      query,
      query.page,
      query.limit,
    );

    return {
      success: true,
      data: result,
      message: 'Approval requests retrieved successfully',
    };
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiParam({ name: 'id', description: 'Approval request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval request retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval request not found',
  })
  @Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN)
  async getApprovalRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const approvalRequest = await this.approvalService.getApprovalRequest(id);

    return {
      success: true,
      data: approvalRequest,
      message: 'Approval request retrieved successfully',
    };
  }

  @Put('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel approval request' })
  @ApiParam({ name: 'id', description: 'Approval request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval request cancelled successfully',
  })
  @Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN)
  async cancelApprovalRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const approvalRequest = await this.approvalService.cancelApprovalRequest(
      id,
      req.user.sub,
      reason,
    );

    return {
      success: true,
      data: approvalRequest,
      message: 'Approval request cancelled successfully',
    };
  }

  // ============================================================================
  // APPROVAL DECISIONS
  // ============================================================================

  @Post('decisions')
  @ApiOperation({ summary: 'Make approval decision' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval decision processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid decision data or task not pending',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to approve this task',
  })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async makeApprovalDecision(
    @Body() approvalDecisionDto: ApprovalDecisionDto,
    @Request() req: any,
  ) {
    const task = await this.approvalService.processApprovalDecision({
      ...approvalDecisionDto,
      approverId: req.user.sub,
    });

    return {
      success: true,
      data: task,
      message: 'Approval decision processed successfully',
    };
  }

  @Post('decisions/bulk')
  @ApiOperation({ summary: 'Make bulk approval decisions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk approval decisions processed successfully',
  })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async makeBulkApprovalDecision(
    @Body() bulkApprovalDto: BulkApprovalDto,
    @Request() req: any,
  ) {
    const tasks = await this.approvalService.processBulkApproval({
      ...bulkApprovalDto,
      approverId: req.user.sub,
    });

    return {
      success: true,
      data: tasks,
      message: `Processed ${tasks.length} approval decisions successfully`,
    };
  }

  // ============================================================================
  // PENDING APPROVALS
  // ============================================================================

  @Get('pending')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending approvals retrieved successfully',
  })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getPendingApprovals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req: any,
  ) {
    const result = await this.approvalService.getPendingApprovals(
      req.user.sub,
      req.user.organizationId,
      page,
      limit,
    );

    return {
      success: true,
      data: result,
      message: 'Pending approvals retrieved successfully',
    };
  }

  // ============================================================================
  // APPROVAL STATISTICS
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get approval statistics' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (ISO string)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval statistics retrieved successfully',
    type: ApprovalStatsResponseDto,
  })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getApprovalStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Request() req: any,
  ) {
    const stats = await this.approvalService.getApprovalStats(
      req.user.organizationId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );

    return {
      success: true,
      data: stats,
      message: 'Approval statistics retrieved successfully',
    };
  }

  // ============================================================================
  // APPROVAL RULES
  // ============================================================================

  @Post('rules')
  @ApiOperation({ summary: 'Create approval rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Approval rule created successfully',
  })
  @Roles(UserRole.ADMIN)
  async createApprovalRule(
    @Body() createApprovalRuleDto: CreateApprovalRuleDto,
    @Request() req: any,
  ) {
    const rule = await this.rulesEngine.createRule(
      {
        ...createApprovalRuleDto,
        organizationId: req.user.organizationId,
      },
      req.user.sub,
    );

    return {
      success: true,
      data: rule,
      message: 'Approval rule created successfully',
    };
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get approval rules' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Include inactive rules' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval rules retrieved successfully',
  })
  @Roles(UserRole.ADMIN)
  async getApprovalRules(
    @Query('includeInactive') includeInactive: boolean = false,
    @Request() req: any,
  ) {
    const rules = await this.rulesEngine.getRules(
      req.user.organizationId,
      includeInactive,
    );

    return {
      success: true,
      data: rules,
      message: 'Approval rules retrieved successfully',
    };
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update approval rule' })
  @ApiParam({ name: 'id', description: 'Approval rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval rule updated successfully',
  })
  @Roles(UserRole.ADMIN)
  async updateApprovalRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApprovalRuleDto: UpdateApprovalRuleDto,
    @Request() req: any,
  ) {
    const rule = await this.rulesEngine.updateRule(id, updateApprovalRuleDto);

    return {
      success: true,
      data: rule,
      message: 'Approval rule updated successfully',
    };
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete approval rule' })
  @ApiParam({ name: 'id', description: 'Approval rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval rule deleted successfully',
  })
  @Roles(UserRole.ADMIN)
  async deleteApprovalRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.rulesEngine.deleteRule(id);

    return {
      success: true,
      message: 'Approval rule deleted successfully',
    };
  }

  @Get('rules/default')
  @ApiOperation({ summary: 'Get default approval rules template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default approval rules retrieved successfully',
  })
  @Roles(UserRole.ADMIN)
  async getDefaultRules(@Request() req: any) {
    const defaultRules = this.rulesEngine.getDefaultRules(req.user.organizationId);

    return {
      success: true,
      data: defaultRules,
      message: 'Default approval rules retrieved successfully',
    };
  }
}
