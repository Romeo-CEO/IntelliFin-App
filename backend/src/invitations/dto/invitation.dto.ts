import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsUUID,
  Length,
  MaxLength 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserRole, InvitationStatus } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid user role' })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Organization ID (for multi-organization tenants)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Organization ID must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Personal message to include in the invitation email',
    example: 'Welcome to our team! We are excited to have you join us.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  message?: string;
}

export class ResendInvitationDto {
  @ApiPropertyOptional({
    description: 'Updated personal message for the resent invitation',
    example: 'Resending your invitation - please check your email!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  message?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token from the email',
    example: 'abc123def456ghi789',
  })
  @IsString()
  @Length(32, 255, { message: 'Token must be between 32 and 255 characters' })
  token: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, { message: 'First name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, { message: 'Last name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    description: 'Password for the new user account',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @Length(8, 255, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'Phone number (optional)',
    example: '+260977123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;
}

export class InvitationResponseDto {
  @ApiProperty({ description: 'Invitation ID' })
  id: string;

  @ApiProperty({ description: 'Email address of the invited user' })
  email: string;

  @ApiProperty({ description: 'Role assigned to the invitation', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'Invitation status', enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty({ description: 'Invitation token' })
  token: string;

  @ApiProperty({ description: 'Invitation expiration date' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Date when invitation was accepted' })
  acceptedAt?: Date;

  @ApiPropertyOptional({ description: 'Organization ID' })
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Personal message' })
  message?: string;

  @ApiProperty({ description: 'ID of user who sent the invitation' })
  invitedBy: string;

  @ApiPropertyOptional({ description: 'ID of user who accepted the invitation' })
  invitedUser?: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  // Populated relationships
  @ApiPropertyOptional({
    description: 'Information about the user who sent the invitation',
    type: 'object',
    properties: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
    },
  })
  inviter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({
    description: 'Information about the user who accepted the invitation',
    type: 'object',
    properties: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
    },
  })
  invitee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class InvitationListResponseDto {
  @ApiProperty({ description: 'List of invitations', type: [InvitationResponseDto] })
  invitations: InvitationResponseDto[];

  @ApiProperty({ description: 'Total number of invitations' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class BulkInvitationDto {
  @ApiProperty({
    description: 'List of email addresses to invite',
    type: [String],
    example: ['user1@example.com', 'user2@example.com'],
  })
  @IsEmail({}, { each: true, message: 'All emails must be valid email addresses' })
  @Transform(({ value }) => value?.map((email: string) => email?.toLowerCase().trim()))
  emails: string[];

  @ApiProperty({
    description: 'Role to assign to all invited users',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid user role' })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Organization ID (for multi-organization tenants)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Organization ID must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Personal message to include in all invitation emails',
    example: 'Welcome to our team!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  message?: string;
}

export class BulkInvitationResponseDto {
  @ApiProperty({ description: 'Successfully sent invitations', type: [InvitationResponseDto] })
  successful: InvitationResponseDto[];

  @ApiProperty({
    description: 'Failed invitations with error messages',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  failed: Array<{
    email: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Total number of invitations processed' })
  total: number;

  @ApiProperty({ description: 'Number of successful invitations' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed invitations' })
  failureCount: number;
}
