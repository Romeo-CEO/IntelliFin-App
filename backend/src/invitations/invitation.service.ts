import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, UserInvitation, UserRole } from '@prisma/client';
import { InvitationRepository } from './invitation.repository';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import {
  AcceptInvitationDto,
  BulkInvitationDto,
  BulkInvitationResponseDto,
  CreateInvitationDto,
  InvitationResponseDto,
  ResendInvitationDto,
} from './dto/invitation.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private readonly invitationExpiryHours: number;

  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {
    this.invitationExpiryHours = this.configService.get<number>(
      'INVITATION_EXPIRY_HOURS',
      72 // Default 72 hours
    );
  }

  async createInvitation(
    createInvitationDto: CreateInvitationDto,
    inviterId: string,
    tenantId: string
  ): Promise<InvitationResponseDto> {
    this.logger.log(
      `Creating invitation for ${createInvitationDto.email} by user ${inviterId}`
    );

    // Validate inviter permissions
    await this.validateInviterPermissions(inviterId, createInvitationDto.role);

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(
      createInvitationDto.email
    );
    if (existingUser && existingUser.tenantId === tenantId) {
      throw new ConflictException(
        'User with this email already exists in your organization'
      );
    }

    // Check for existing pending invitation
    const existingInvitation =
      await this.invitationRepository.findByEmailAndTenant(
        createInvitationDto.email,
        tenantId,
        InvitationStatus.PENDING
      );

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      throw new ConflictException(
        'A pending invitation already exists for this email address'
      );
    }

    // Generate secure token
    const token = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.invitationExpiryHours);

    try {
      const invitation = await this.invitationRepository.create({
        email: createInvitationDto.email,
        role: createInvitationDto.role,
        token,
        expiresAt,
        organizationId: createInvitationDto.organizationId,
        message: createInvitationDto.message,
        tenant: { connect: { id: tenantId } },
        inviter: { connect: { id: inviterId } },
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation);

      this.logger.log(`Invitation created successfully: ${invitation.id}`);
      return this.mapToResponseDto(invitation);
    } catch (error) {
      this.logger.error(
        `Failed to create invitation: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to create invitation');
    }
  }

  async acceptInvitation(
    acceptInvitationDto: AcceptInvitationDto
  ): Promise<{ user: any; invitation: InvitationResponseDto }> {
    this.logger.log(
      `Accepting invitation with token: ${acceptInvitationDto.token}`
    );

    const invitation = await this.invitationRepository.findByToken(
      acceptInvitationDto.token
    );

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation has already been processed');
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationRepository.update(invitation.id, {
        status: InvitationStatus.EXPIRED,
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Create user account
      const hashedPassword = await bcrypt.hash(
        acceptInvitationDto.password,
        12
      );

      const user = await this.usersService.create({
        email: invitation.email,
        firstName: acceptInvitationDto.firstName,
        lastName: acceptInvitationDto.lastName,
        password: hashedPassword,
        phone: acceptInvitationDto.phone,
        role: invitation.role,
        tenantId: invitation.tenantId,
        emailVerified: true, // Auto-verify since they accepted invitation
      });

      // Update invitation status
      const updatedInvitation = await this.invitationRepository.update(
        invitation.id,
        {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          invitee: { connect: { id: user.id } },
        }
      );

      this.logger.log(`Invitation accepted successfully: ${invitation.id}`);

      return {
        user,
        invitation: this.mapToResponseDto(updatedInvitation),
      };
    } catch (error) {
      this.logger.error(
        `Failed to accept invitation: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to accept invitation');
    }
  }

  async resendInvitation(
    invitationId: string,
    resendDto: ResendInvitationDto,
    userId: string
  ): Promise<InvitationResponseDto> {
    this.logger.log(`Resending invitation: ${invitationId}`);

    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Validate permissions
    await this.validateInviterPermissions(userId, invitation.role);

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot resend an accepted invitation');
    }

    // Generate new token and extend expiry
    const newToken = this.generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + this.invitationExpiryHours);

    try {
      const updatedInvitation = await this.invitationRepository.update(
        invitationId,
        {
          token: newToken,
          expiresAt: newExpiresAt,
          status: InvitationStatus.RESENT,
          message: resendDto.message || invitation.message,
        }
      );

      // Send new invitation email
      await this.sendInvitationEmail(updatedInvitation);

      this.logger.log(`Invitation resent successfully: ${invitationId}`);
      return this.mapToResponseDto(updatedInvitation);
    } catch (error) {
      this.logger.error(
        `Failed to resend invitation: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to resend invitation');
    }
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    this.logger.log(`Cancelling invitation: ${invitationId}`);

    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Validate permissions
    await this.validateInviterPermissions(userId, invitation.role);

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot cancel an accepted invitation');
    }

    try {
      await this.invitationRepository.cancelInvitation(invitationId);
      this.logger.log(`Invitation cancelled successfully: ${invitationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel invitation: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to cancel invitation');
    }
  }

  async getInvitationsByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    status?: InvitationStatus
  ): Promise<{
    invitations: InvitationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [invitations, total] = await Promise.all([
      this.invitationRepository.findByTenant(tenantId, {
        skip,
        take: limit,
        where,
      }),
      this.invitationRepository.countByTenant(tenantId, where),
    ]);

    return {
      invitations: invitations.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async validateInviterPermissions(
    inviterId: string,
    targetRole: UserRole
  ): Promise<void> {
    const inviter = await this.usersService.findById(inviterId);
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Role hierarchy validation
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 6,
      [UserRole.TENANT_ADMIN]: 5,
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.USER]: 2,
      [UserRole.VIEWER]: 1,
    };

    const inviterLevel = roleHierarchy[inviter.role];
    const targetLevel = roleHierarchy[targetRole];

    if (inviterLevel <= targetLevel) {
      throw new ForbiddenException(
        'You cannot invite users with equal or higher privileges'
      );
    }
  }

  private async sendInvitationEmail(invitation: UserInvitation): Promise<void> {
    try {
      const invitationUrl = `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${invitation.token}`;

      await this.emailService.sendInvitationEmail({
        to: invitation.email,
        inviterName: `${invitation.inviter?.firstName} ${invitation.inviter?.lastName}`,
        organizationName: invitation.tenant?.name || 'IntelliFin',
        role: invitation.role,
        invitationUrl,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email: ${error.message}`,
        error.stack
      );
      // Don't throw error here to avoid breaking the invitation creation
    }
  }

  async getInvitationById(id: string): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findById(id);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    return this.mapToResponseDto(invitation);
  }

  async getInvitationByToken(token: string): Promise<{
    email: string;
    role: UserRole;
    organizationName: string;
    inviterName: string;
    expiresAt: Date;
    isValid: boolean;
  }> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    const isValid =
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt > new Date();

    return {
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.tenant?.name || 'IntelliFin',
      inviterName: `${invitation.inviter?.firstName} ${invitation.inviter?.lastName}`,
      expiresAt: invitation.expiresAt,
      isValid,
    };
  }

  async sendBulkInvitations(
    bulkInvitationDto: BulkInvitationDto,
    inviterId: string,
    tenantId: string
  ): Promise<BulkInvitationResponseDto> {
    this.logger.log(
      `Sending bulk invitations for ${bulkInvitationDto.emails.length} emails`
    );

    // Validate inviter permissions
    await this.validateInviterPermissions(inviterId, bulkInvitationDto.role);

    const successful: InvitationResponseDto[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const email of bulkInvitationDto.emails) {
      try {
        const invitation = await this.createInvitation(
          {
            email,
            role: bulkInvitationDto.role,
            organizationId: bulkInvitationDto.organizationId,
            message: bulkInvitationDto.message,
          },
          inviterId,
          tenantId
        );
        successful.push(invitation);
      } catch (error) {
        failed.push({
          email,
          error: error.message,
        });
      }
    }

    return {
      successful,
      failed,
      total: bulkInvitationDto.emails.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  async cleanupExpiredInvitations(): Promise<number> {
    this.logger.log('Cleaning up expired invitations');

    const expiredInvitations =
      await this.invitationRepository.findExpiredInvitations();
    const expiredIds = expiredInvitations.map(inv => inv.id);

    if (expiredIds.length > 0) {
      const count = await this.invitationRepository.markAsExpired(expiredIds);
      this.logger.log(`Marked ${count} invitations as expired`);
      return count;
    }

    return 0;
  }

  private mapToResponseDto(invitation: UserInvitation): InvitationResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      organizationId: invitation.organizationId,
      message: invitation.message,
      invitedBy: invitation.invitedBy,
      invitedUser: invitation.invitedUser,
      tenantId: invitation.tenantId,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      inviter: invitation.inviter
        ? {
            id: invitation.inviter.id,
            firstName: invitation.inviter.firstName,
            lastName: invitation.inviter.lastName,
            email: invitation.inviter.email,
          }
        : undefined,
      invitee: invitation.invitee
        ? {
            id: invitation.invitee.id,
            firstName: invitation.invitee.firstName,
            lastName: invitation.invitee.lastName,
            email: invitation.invitee.email,
          }
        : undefined,
    };
  }
}
