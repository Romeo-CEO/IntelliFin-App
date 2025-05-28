import { IsString, IsEmail, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name', example: 'Acme Corporation' })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ description: 'Unique tenant slug', example: 'acme-corp' })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiPropertyOptional({ description: 'Business type', example: 'Limited Company' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  businessType?: string;

  @ApiPropertyOptional({ description: 'ZRA Tax Identification Number', example: '1234567890' })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(/^[0-9]+$/, { message: 'ZRA TIN must contain only numbers' })
  zraTin?: string;

  @ApiPropertyOptional({ description: 'Business email address', example: 'info@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Business phone number', example: '+260971234567' })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Lusaka' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ description: 'Industry', example: 'Technology' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  industry?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Tenant name' })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @ApiPropertyOptional({ description: 'Business type' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  businessType?: string;

  @ApiPropertyOptional({ description: 'Business email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Business phone number' })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  industry?: string;
}

export class TenantResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  id: string;

  @ApiProperty({ description: 'Tenant name' })
  name: string;

  @ApiProperty({ description: 'Tenant slug' })
  slug: string;

  @ApiProperty({ description: 'Schema name' })
  schemaName: string;

  @ApiProperty({ description: 'Tenant status' })
  status: string;

  @ApiPropertyOptional({ description: 'Business type' })
  businessType?: string;

  @ApiPropertyOptional({ description: 'ZRA TIN' })
  zraTin?: string;

  @ApiPropertyOptional({ description: 'Email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Address' })
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  industry?: string;

  @ApiProperty({ description: 'Subscription plan' })
  subscriptionPlan: string;

  @ApiProperty({ description: 'Subscription status' })
  subscriptionStatus: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
