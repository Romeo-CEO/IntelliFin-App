import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Length,
} from 'class-validator';
import { 
  ApprovalRequestStatus, 
  ApprovalTaskStatus, 
  ApprovalDecision, 
  ApprovalPriority,
  ApprovalAction,
  UserRole,
} from '@prisma/client';

// Create Approval Request DTO
export class CreateApprovalRequestDto {
  @ApiProperty({
    description: 'Expense ID to create approval request for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  expenseId: string;

  @ApiPropertyOptional({
    description: 'Reason for approval request',
    example: 'High value expense requiring manager approval',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Priority of the approval request',
    enum: ApprovalPriority,
    example: ApprovalPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(ApprovalPriority)
  priority?: ApprovalPriority;
}

// Approval Decision DTO
export class ApprovalDecisionDto {
  @ApiProperty({
    description: 'Approval task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    description: 'Approval decision',
    enum: ApprovalDecision,
    example: ApprovalDecision.APPROVED,
  })
  @IsEnum(ApprovalDecision)
  @IsNotEmpty()
  decision: ApprovalDecision;

  @ApiPropertyOptional({
    description: 'Comments for the approval decision',
    example: 'Approved as per company policy',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comments?: string;
}

// Bulk Approval DTO
export class BulkApprovalDto {
  @ApiProperty({
    description: 'Array of approval task IDs',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d1-b789-123456789abc'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  @IsNotEmpty()
  taskIds: string[];

  @ApiProperty({
    description: 'Approval decision for all tasks',
    enum: ApprovalDecision,
    example: ApprovalDecision.APPROVED,
  })
  @IsEnum(ApprovalDecision)
  @IsNotEmpty()
  decision: ApprovalDecision;

  @ApiPropertyOptional({
    description: 'Comments for all approval decisions',
    example: 'Bulk approved for routine expenses',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comments?: string;
}

// Approval Request Query DTO
export class ApprovalRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by requester ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by approver ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  approverId?: string;

  @ApiPropertyOptional({
    description: 'Filter by approval request status',
    enum: ApprovalRequestStatus,
    example: ApprovalRequestStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ApprovalRequestStatus)
  status?: ApprovalRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: ApprovalPriority,
    example: ApprovalPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(ApprovalPriority)
  priority?: ApprovalPriority;

  @ApiPropertyOptional({
    description: 'Filter by date from (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Search term for expense description, vendor, or requester name',
    example: 'office supplies',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'submittedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// Approval Rule Condition DTO
export class ApprovalConditionDto {
  @ApiProperty({
    description: 'Field to evaluate',
    enum: ['amount', 'category', 'submitter_role', 'date', 'vendor', 'payment_method'],
    example: 'amount',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'not_in', 'contains', 'starts_with'],
    example: 'gt',
  })
  @IsString()
  @IsNotEmpty()
  operator: string;

  @ApiProperty({
    description: 'Value to compare against',
    example: 1000,
  })
  @IsNotEmpty()
  value: any;
}

// Approval Rule Action DTO
export class ApprovalActionDto {
  @ApiProperty({
    description: 'Action type',
    enum: ['require_approval', 'auto_approve', 'notify', 'escalate'],
    example: 'require_approval',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: 'Approver roles',
    enum: UserRole,
    isArray: true,
    example: [UserRole.MANAGER, UserRole.ADMIN],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  approverRoles?: UserRole[];

  @ApiPropertyOptional({
    description: 'Specific approver user IDs',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  approverUsers?: string[];

  @ApiPropertyOptional({
    description: 'Escalation time in hours',
    example: 24,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  escalationTimeHours?: number;

  @ApiPropertyOptional({
    description: 'Notification template name',
    example: 'high_value_approval',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  notificationTemplate?: string;

  @ApiPropertyOptional({
    description: 'Action priority',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'HIGH',
  })
  @IsOptional()
  @IsString()
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// Create Approval Rule DTO
export class CreateApprovalRuleDto {
  @ApiProperty({
    description: 'Rule name',
    example: 'High Value Expenses',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Rule description',
    example: 'Expenses above K1,000 require manager approval',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Rule priority (higher number = higher priority)',
    example: 100,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  priority?: number = 0;

  @ApiProperty({
    description: 'Rule conditions',
    type: [ApprovalConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalConditionDto)
  conditions: ApprovalConditionDto[];

  @ApiProperty({
    description: 'Rule actions',
    type: [ApprovalActionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalActionDto)
  actions: ApprovalActionDto[];
}

// Update Approval Rule DTO
export class UpdateApprovalRuleDto {
  @ApiPropertyOptional({
    description: 'Rule name',
    example: 'High Value Expenses',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Rule description',
    example: 'Expenses above K1,000 require manager approval',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Rule priority (higher number = higher priority)',
    example: 100,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Rule conditions',
    type: [ApprovalConditionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalConditionDto)
  conditions?: ApprovalConditionDto[];

  @ApiPropertyOptional({
    description: 'Rule actions',
    type: [ApprovalActionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalActionDto)
  actions?: ApprovalActionDto[];
}

// Approval Statistics Response DTO
export class ApprovalStatsResponseDto {
  @ApiProperty({
    description: 'Total number of approval requests',
    example: 150,
  })
  totalRequests: number;

  @ApiProperty({
    description: 'Number of pending approval requests',
    example: 25,
  })
  pendingRequests: number;

  @ApiProperty({
    description: 'Number of approved requests',
    example: 100,
  })
  approvedRequests: number;

  @ApiProperty({
    description: 'Number of rejected requests',
    example: 25,
  })
  rejectedRequests: number;

  @ApiProperty({
    description: 'Average approval time in hours',
    example: 18.5,
  })
  averageApprovalTime: number;

  @ApiProperty({
    description: 'Requests by status',
    example: {
      PENDING: 25,
      APPROVED: 100,
      REJECTED: 25,
      CANCELLED: 0,
      EXPIRED: 0,
    },
  })
  requestsByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Requests by priority',
    example: {
      LOW: 50,
      NORMAL: 75,
      HIGH: 20,
      URGENT: 5,
    },
  })
  requestsByPriority: Record<string, number>;
}
