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
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, InvitationStatus } from '@prisma/client';
import { InvitationService } from './invitation.service';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationListResponseDto,
  ResendInvitationDto,
  BulkInvitationDto,
  BulkInvitationResponseDto,
} from './dto/invitation.dto';

@ApiTags('User Invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  private readonly logger = new Logger(InvitationController.name);

  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new user invitation',
    description: 'Invite a new user to join the organization with specified role',
  })
  @ApiBody({ type: CreateInvitationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invitation created successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists or pending invitation exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to invite users with this role',
  })
  async createInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
    @CurrentUser() user: any,
  ): Promise<InvitationResponseDto> {
    this.logger.log(`Creating invitation for ${createInvitationDto.email} by user ${user.id}`);
    return this.invitationService.createInvitation(
      createInvitationDto,
      user.id,
      user.tenantId,
    );
  }

  @Post('accept')
  @ApiOperation({
    summary: 'Accept an invitation',
    description: 'Accept an invitation and create a new user account',
  })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invitation accepted and user account created',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Created user information',
        },
        invitation: {
          $ref: '#/components/schemas/InvitationResponseDto',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token, expired invitation, or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
  ): Promise<{ user: any; invitation: InvitationResponseDto }> {
    this.logger.log(`Accepting invitation with token: ${acceptInvitationDto.token}`);
    return this.invitationService.acceptInvitation(acceptInvitationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get invitations for current tenant',
    description: 'Retrieve paginated list of invitations for the current tenant',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InvitationStatus,
    description: 'Filter by invitation status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitations retrieved successfully',
    type: InvitationListResponseDto,
  })
  async getInvitations(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status', new ParseEnumPipe(InvitationStatus, { optional: true }))
    status?: InvitationStatus,
  ): Promise<InvitationListResponseDto> {
    this.logger.log(`Getting invitations for tenant ${user.tenantId}`);
    const result = await this.invitationService.getInvitationsByTenant(
      user.tenantId,
      page,
      limit,
      status,
    );

    return {
      invitations: result.invitations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get invitation by ID',
    description: 'Retrieve detailed information about a specific invitation',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation retrieved successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found',
  })
  async getInvitationById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationResponseDto> {
    this.logger.log(`Getting invitation by ID: ${id}`);
    const invitation = await this.invitationService.getInvitationById(id);
    return invitation;
  }

  @Put(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Resend an invitation',
    description: 'Resend an invitation with a new token and extended expiry',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: ResendInvitationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation resent successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot resend accepted invitation',
  })
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resendDto: ResendInvitationDto,
    @CurrentUser() user: any,
  ): Promise<InvitationResponseDto> {
    this.logger.log(`Resending invitation ${id} by user ${user.id}`);
    return this.invitationService.resendInvitation(id, resendDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel an invitation',
    description: 'Cancel a pending invitation',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel accepted invitation',
  })
  async cancelInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    this.logger.log(`Cancelling invitation ${id} by user ${user.id}`);
    return this.invitationService.cancelInvitation(id, user.id);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send bulk invitations',
    description: 'Send invitations to multiple email addresses at once',
  })
  @ApiBody({ type: BulkInvitationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk invitations processed',
    type: BulkInvitationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async sendBulkInvitations(
    @Body() bulkInvitationDto: BulkInvitationDto,
    @CurrentUser() user: any,
  ): Promise<BulkInvitationResponseDto> {
    this.logger.log(`Sending bulk invitations by user ${user.id}`);
    return this.invitationService.sendBulkInvitations(
      bulkInvitationDto,
      user.id,
      user.tenantId,
    );
  }

  @Get('token/:token')
  @ApiOperation({
    summary: 'Get invitation by token',
    description: 'Retrieve invitation details using the invitation token (for public access)',
  })
  @ApiParam({
    name: 'token',
    description: 'Invitation token',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        role: { type: 'string', enum: Object.values(UserRole) },
        organizationName: { type: 'string' },
        inviterName: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        isValid: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired invitation token',
  })
  async getInvitationByToken(
    @Param('token') token: string,
  ): Promise<{
    email: string;
    role: UserRole;
    organizationName: string;
    inviterName: string;
    expiresAt: Date;
    isValid: boolean;
  }> {
    this.logger.log(`Getting invitation by token: ${token}`);
    return this.invitationService.getInvitationByToken(token);
  }
}
