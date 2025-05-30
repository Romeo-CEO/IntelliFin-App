import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsValidZraTin } from '../validators/customer-zra-tin.validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer name',
    example: 'Acme Corporation Ltd',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Customer name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Customer name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Mwanza',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'Contact person name cannot exceed 100 characters',
  })
  @Transform(({ value }) => value?.trim())
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'contact@acmecorp.zm',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+260977123456',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: 'Plot 123, Independence Avenue, Lusaka',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Address cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Lusaka',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'Zambia',
    default: 'Zambia',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim() || 'Zambia')
  country?: string;

  @ApiPropertyOptional({
    description: 'ZRA Tax Identification Number (TIN)',
    example: '1234567890',
    pattern: '^[0-9]{10}$',
  })
  @IsOptional()
  @IsValidZraTin({ message: 'Please provide a valid ZRA TIN (10 digits)' })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  zraTin?: string;

  @ApiPropertyOptional({
    description: 'Payment terms in days',
    example: 30,
    minimum: 0,
    maximum: 365,
    default: 14,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Payment terms must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Payment terms cannot be negative' })
  @Max(365, { message: 'Payment terms cannot exceed 365 days' })
  paymentTerms?: number;

  @ApiPropertyOptional({
    description: 'Credit limit in ZMW',
    example: 50000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Credit limit cannot be negative' })
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'Preferred payment method: Mobile Money',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether the customer is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'Acme Corporation Ltd',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Customer name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Customer name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;
}

export class CustomerQueryDto {
  @ApiPropertyOptional({
    description:
      'Search term for customer name, contact person, email, phone, or ZRA TIN',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Lusaka',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter customers with ZRA TIN',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasZraTin?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum payment terms in days',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  paymentTermsMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum payment terms in days',
    example: 90,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  paymentTermsMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum credit limit',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  creditLimitMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum credit limit',
    example: 100000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  creditLimitMax?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'name',
    enum: [
      'name',
      'contactPerson',
      'email',
      'city',
      'paymentTerms',
      'creditLimit',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'contactPerson',
    'email',
    'city',
    'paymentTerms',
    'creditLimit',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Acme Corporation Ltd',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Mwanza',
  })
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'contact@acmecorp.zm',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+260977123456',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: 'Plot 123, Independence Avenue, Lusaka',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Lusaka',
  })
  city?: string;

  @ApiProperty({
    description: 'Country',
    example: 'Zambia',
  })
  country: string;

  @ApiPropertyOptional({
    description: 'ZRA Tax Identification Number (TIN)',
    example: '1234567890',
  })
  zraTin?: string;

  @ApiProperty({
    description: 'Payment terms in days',
    example: 30,
  })
  paymentTerms: number;

  @ApiPropertyOptional({
    description: 'Credit limit in ZMW',
    example: 50000.0,
  })
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'Preferred payment method: Mobile Money',
  })
  notes?: string;

  @ApiProperty({
    description: 'Whether the customer is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Customer creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Customer last update date',
    example: '2024-01-20T14:45:00Z',
  })
  updatedAt: Date;
}

export class CustomerStatsDto {
  @ApiProperty({
    description: 'Total number of customers',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of active customers',
    example: 142,
  })
  active: number;

  @ApiProperty({
    description: 'Number of inactive customers',
    example: 8,
  })
  inactive: number;

  @ApiProperty({
    description: 'Number of customers with ZRA TIN',
    example: 89,
  })
  withZraTin: number;

  @ApiProperty({
    description: 'Average payment terms in days',
    example: 21,
  })
  averagePaymentTerms: number;
}

export class CustomerListResponseDto {
  @ApiProperty({
    description: 'List of customers',
    type: [CustomerResponseDto],
  })
  customers: CustomerResponseDto[];

  @ApiProperty({
    description: 'Total number of customers matching the filter',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}
