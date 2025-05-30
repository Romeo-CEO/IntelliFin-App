import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DashboardPermissionType, WidgetType } from '@prisma/client';

// Dashboard DTOs
export class CreateDashboardDto {
  @ApiProperty({
    description: 'Dashboard name',
    example: 'Financial Overview',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Dashboard description',
    example: 'Main dashboard showing key financial metrics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Set as default dashboard',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Make dashboard public to all organization members',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Dashboard layout configuration',
    example: {
      gridColumns: 12,
      gridRows: 'auto',
      spacing: 16,
    },
  })
  @IsOptional()
  @IsObject()
  layout?: any;

  @ApiPropertyOptional({
    description: 'Dashboard settings',
    example: {
      theme: 'light',
      refreshInterval: 300,
    },
  })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateDashboardDto {
  @ApiPropertyOptional({
    description: 'Dashboard name',
    example: 'Updated Financial Overview',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Dashboard description',
    example: 'Updated dashboard description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Make dashboard public to all organization members',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Dashboard layout configuration',
  })
  @IsOptional()
  @IsObject()
  layout?: any;

  @ApiPropertyOptional({
    description: 'Dashboard settings',
  })
  @IsOptional()
  @IsObject()
  settings?: any;
}

// Widget DTOs
export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget type',
    enum: WidgetType,
    example: WidgetType.METRIC_CARD,
  })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiProperty({
    description: 'Widget title',
    example: 'Monthly Revenue',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Widget description',
    example: 'Shows total revenue for the current month',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Widget position and size in grid',
    example: {
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    },
  })
  @IsObject()
  position: any;

  @ApiPropertyOptional({
    description: 'Widget-specific configuration',
    example: {
      showTrend: true,
      format: 'currency',
    },
  })
  @IsOptional()
  @IsObject()
  configuration?: any;

  @ApiPropertyOptional({
    description: 'Data source configuration',
    example: {
      type: 'api',
      endpoint: '/api/analytics/revenue',
    },
  })
  @IsOptional()
  @IsObject()
  dataSource?: any;

  @ApiPropertyOptional({
    description: 'Refresh interval in seconds',
    example: 300,
    minimum: 30,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  refreshInterval?: number;
}

export class UpdateWidgetDto {
  @ApiPropertyOptional({
    description: 'Widget title',
    example: 'Updated Monthly Revenue',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Widget description',
    example: 'Updated widget description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Widget-specific configuration',
  })
  @IsOptional()
  @IsObject()
  configuration?: any;

  @ApiPropertyOptional({
    description: 'Data source configuration',
  })
  @IsOptional()
  @IsObject()
  dataSource?: any;

  @ApiPropertyOptional({
    description: 'Refresh interval in seconds',
    minimum: 30,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  refreshInterval?: number;
}

export class UpdateWidgetPositionDto {
  @ApiProperty({
    description: 'Widget position and size in grid',
    example: {
      x: 2,
      y: 1,
      width: 6,
      height: 4,
    },
  })
  @IsObject()
  position: any;
}

export class WidgetPositionUpdateDto {
  @ApiProperty({
    description: 'Widget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'New position',
    example: {
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    },
  })
  @IsObject()
  position: any;
}

export class BulkUpdatePositionsDto {
  @ApiProperty({
    description: 'Array of widget position updates',
    type: [WidgetPositionUpdateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionUpdateDto)
  updates: WidgetPositionUpdateDto[];
}

// Response DTOs
export class UserSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

export class DashboardPermissionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: DashboardPermissionType })
  permission: DashboardPermissionType;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ type: UserSummaryDto })
  grantor: UserSummaryDto;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  grantedAt: Date;
}

export class WidgetResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  dashboardId: string;

  @ApiProperty({ enum: WidgetType })
  widgetType: WidgetType;

  @ApiProperty({ example: 'Monthly Revenue' })
  title: string;

  @ApiPropertyOptional({ example: 'Shows total revenue for the current month' })
  description?: string;

  @ApiProperty({
    example: {
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    },
  })
  position: any;

  @ApiProperty({
    example: {
      showTrend: true,
      format: 'currency',
    },
  })
  configuration: any;

  @ApiPropertyOptional({
    example: {
      type: 'api',
      endpoint: '/api/analytics/revenue',
    },
  })
  dataSource?: any;

  @ApiPropertyOptional({ example: 300 })
  refreshInterval?: number;

  @ApiProperty({ example: true })
  isVisible: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}

export class DashboardResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  organizationId: string;

  @ApiProperty({ example: 'Financial Overview' })
  name: string;

  @ApiPropertyOptional({
    example: 'Main dashboard showing key financial metrics',
  })
  description?: string;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: true })
  isPublic: boolean;

  @ApiProperty({
    example: {
      gridColumns: 12,
      gridRows: 'auto',
      spacing: 16,
    },
  })
  layout: any;

  @ApiPropertyOptional({
    example: {
      theme: 'light',
      refreshInterval: 300,
    },
  })
  settings?: any;

  @ApiProperty({ type: UserSummaryDto })
  creator: UserSummaryDto;

  @ApiProperty({ type: [WidgetResponseDto] })
  widgets: WidgetResponseDto[];

  @ApiPropertyOptional({ type: [DashboardPermissionDto] })
  permissions?: DashboardPermissionDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
